use active_win_pos_rs::ActiveWindow;
use serde_json::json;
use std::io::{self, BufRead, Write};
use std::sync::Mutex;
use std::thread;

static LAST_WINDOW_ID: Mutex<Option<String>> = Mutex::new(None);

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let with_icon = args.iter().any(|a| a == "--with-icon");
    let watch_mode = args.iter().any(|a| a == "--watch");

    if watch_mode {
        run_watch_mode();
    } else {
        match active_win_pos_rs::get_active_window() {
            Ok(active_window) => output_result(active_window, with_icon),
            Err(e) => {
                eprintln!("{}", json!({ "error": e }));
                std::process::exit(1);
            }
        }
    }
}

fn output_result(active_window: ActiveWindow, with_icon: bool) {
    let app_name = resolve_app_name(&active_window);

    let mut event_json = json!({
        "title": active_window.title,
        "appName": app_name,
        "windowId": active_window.window_id,
        "processId": active_window.process_id,
        "position": {
            "x": active_window.position.x,
            "y": active_window.position.y,
            "width": active_window.position.width,
            "height": active_window.position.height,
        },
    });

    if let Some(bundle_id) = get_bundle_identifier(active_window.process_id) {
        event_json["bundleId"] = json!(bundle_id);
    }

    if let Some(exe_path) = get_executable_path(active_window.process_id) {
        event_json["exePath"] = json!(exe_path);
    }

    if with_icon && let Some(icon_data) = get_app_icon_base64(&app_name, active_window.process_id) {
        event_json["iconBase64"] = json!(icon_data);
    }

    println!("{}", event_json);
}

// ──────────────────────────────────────────────
// Watch mode (daemon) — shared helpers
// ──────────────────────────────────────────────

fn emit_current_window() {
    match active_win_pos_rs::get_active_window() {
        Ok(w) => emit_window_event(&w),
        Err(e) => eprintln!("[watch] Failed to get active window: {:?}", e),
    }
}

fn emit_window_event(active_window: &ActiveWindow) {
    let window_id = format!("{}-{}", active_window.process_id, active_window.window_id);

    {
        let mut last = LAST_WINDOW_ID.lock().unwrap();
        if last.as_deref() == Some(&window_id) {
            return;
        }
        *last = Some(window_id);
    }

    let app_name = resolve_app_name(active_window);
    let mut event = json!({
        "type": "window_changed",
        "title": active_window.title,
        "appName": app_name,
        "windowId": active_window.window_id,
        "processId": active_window.process_id,
        "position": {
            "x": active_window.position.x,
            "y": active_window.position.y,
            "width": active_window.position.width,
            "height": active_window.position.height,
        },
        "timestamp": chrono::Utc::now().to_rfc3339(),
    });

    if let Some(bundle_id) = get_bundle_identifier(active_window.process_id) {
        event["bundleId"] = json!(bundle_id);
    }
    if let Some(exe_path) = get_executable_path(active_window.process_id) {
        event["exePath"] = json!(exe_path);
    }

    println!("{}", event);
    io::stdout().flush().unwrap_or(());
}

fn spawn_heartbeat_thread() {
    thread::spawn(|| {
        let mut id = 0u64;
        loop {
            thread::sleep(std::time::Duration::from_secs(10));
            id += 1;
            println!(
                "{}",
                json!({
                    "type": "heartbeat_ping",
                    "id": id.to_string(),
                    "timestamp": chrono::Utc::now().to_rfc3339()
                })
            );
            io::stdout().flush().unwrap_or(());
        }
    });
}

fn spawn_stdin_reader() {
    thread::spawn(|| {
        let stdin = io::stdin();
        for line in stdin.lock().lines().map_while(Result::ok) {
            if let Ok(cmd) = serde_json::from_str::<serde_json::Value>(&line) {
                if cmd["command"] == "get_icon" {
                    let request_id = cmd["requestId"].as_str().unwrap_or("unknown");
                    handle_icon_request(request_id);
                }
            }
        }
    });
}

fn handle_icon_request(request_id: &str) {
    match active_win_pos_rs::get_active_window() {
        Ok(w) => {
            let app_name = resolve_app_name(&w);
            let icon = get_app_icon_base64(&app_name, w.process_id);
            let response = json!({
                "type": "icon_response",
                "requestId": request_id,
                "appName": app_name,
                "iconBase64": icon,
            });
            println!("{}", response);
            io::stdout().flush().unwrap_or(());
        }
        Err(e) => {
            let response = json!({
                "type": "icon_response",
                "requestId": request_id,
                "appName": null,
                "iconBase64": null,
                "error": format!("{:?}", e),
            });
            println!("{}", response);
            io::stdout().flush().unwrap_or(());
        }
    }
}

// ──────────────────────────────────────────────
// Platform-specific watch mode implementations
// ──────────────────────────────────────────────

#[cfg(target_os = "macos")]
fn run_watch_mode() {
    let _activity = prevent_app_nap();
    spawn_stdin_reader();
    spawn_heartbeat_thread();
    emit_current_window();

    unsafe {
        use cocoa::base::{id, nil};
        use cocoa::foundation::NSString;
        use objc::declare::ClassDecl;
        use objc::runtime::{Class, Object, Sel};
        use objc::{msg_send, sel, sel_impl};

        extern "C" fn handle_notification(_this: &Object, _cmd: Sel, _notification: id) {
            match active_win_pos_rs::get_active_window() {
                Ok(w) => emit_window_event(&w),
                Err(e) => eprintln!("[watch] Notification handler error: {:?}", e),
            }
        }

        let superclass = Class::get("NSObject").unwrap();
        let mut decl = ClassDecl::new("ActiveWindowObserver", superclass).unwrap();
        decl.add_method(
            sel!(handleNotification:),
            handle_notification as extern "C" fn(&Object, Sel, id),
        );
        let observer_class = decl.register();

        let observer: id = msg_send![observer_class, new];

        let workspace: id = msg_send![Class::get("NSWorkspace").unwrap(), sharedWorkspace];
        let center: id = msg_send![workspace, notificationCenter];

        let notification_name =
            NSString::alloc(nil).init_str("NSWorkspaceDidActivateApplicationNotification");

        let _: () = msg_send![center,
            addObserver: observer
            selector: sel!(handleNotification:)
            name: notification_name
            object: nil
        ];

        core_foundation::runloop::CFRunLoop::run_current();
    }
}

#[cfg(target_os = "windows")]
fn run_watch_mode() {
    spawn_stdin_reader();
    spawn_heartbeat_thread();
    emit_current_window();

    unsafe {
        use windows::Win32::Foundation::HWND;
        use windows::Win32::UI::Accessibility::{SetWinEventHook, HWINEVENTHOOK};
        use windows::Win32::UI::WindowsAndMessaging::{
            DispatchMessageW, GetMessageW, TranslateMessage, MSG,
            EVENT_SYSTEM_FOREGROUND, WINEVENT_OUTOFCONTEXT, WINEVENT_SKIPOWNPROCESS,
        };

        unsafe extern "system" fn win_event_callback(
            _hook: HWINEVENTHOOK,
            _event: u32,
            _hwnd: HWND,
            _id_object: i32,
            _id_child: i32,
            _event_thread: u32,
            _event_time: u32,
        ) {
            match active_win_pos_rs::get_active_window() {
                Ok(w) => emit_window_event(&w),
                Err(e) => eprintln!("[watch] WinEvent callback error: {:?}", e),
            }
        }

        let _hook = SetWinEventHook(
            EVENT_SYSTEM_FOREGROUND,
            EVENT_SYSTEM_FOREGROUND,
            None,
            Some(win_event_callback),
            0,
            0,
            WINEVENT_OUTOFCONTEXT | WINEVENT_SKIPOWNPROCESS,
        );

        let mut msg = MSG::default();
        while GetMessageW(&mut msg, None, 0, 0).as_bool() {
            let _ = TranslateMessage(&msg);
            DispatchMessageW(&msg);
        }
    }
}

#[cfg(target_os = "linux")]
fn run_watch_mode() {
    spawn_stdin_reader();
    spawn_heartbeat_thread();

    let mut last_window_id: Option<String> = None;
    loop {
        if let Ok(w) = active_win_pos_rs::get_active_window() {
            let current_id = format!("{}-{}", w.process_id, w.window_id);
            if last_window_id.as_deref() != Some(&current_id) {
                last_window_id = Some(current_id);
                emit_window_event(&w);
            }
        }
        std::thread::sleep(std::time::Duration::from_millis(500));
    }
}

// ──────────────────────────────────────────────
// macOS App Nap prevention (same pattern as global-key-listener)
// ──────────────────────────────────────────────

#[cfg(target_os = "macos")]
fn prevent_app_nap() -> cocoa::base::id {
    use cocoa::base::{id, nil};
    use cocoa::foundation::{NSProcessInfo, NSString};
    use objc::{msg_send, sel, sel_impl};

    unsafe {
        let process_info = NSProcessInfo::processInfo(nil);
        let reason = NSString::alloc(nil)
            .init_str("Active window monitoring requires continuous operation");
        let options: u64 = 0x00FFFFFF; // NSActivityUserInitiated
        let activity: id =
            msg_send![process_info, beginActivityWithOptions:options reason:reason];
        eprintln!("macOS App Nap prevention enabled for active-application daemon");
        activity
    }
}

// ──────────────────────────────────────────────
// Shared helpers (unchanged from one-shot mode)
// ──────────────────────────────────────────────

fn resolve_app_name(active_window: &ActiveWindow) -> String {
    let app_name = active_window.app_name.trim();
    if !app_name.is_empty() && !is_generic_name(app_name) {
        return app_name.to_string();
    }

    if let Some(name) = extract_name_from_title(&active_window.title) {
        return name;
    }

    if let Some(name) = get_process_name(active_window.process_id) {
        return name;
    }

    "Unknown application".to_string()
}

fn is_generic_name(name: &str) -> bool {
    let lower = name.to_lowercase();
    matches!(
        lower.as_str(),
        "electron" | "java" | "python" | "node" | "ruby" | "perl" | ""
    )
}

fn extract_name_from_title(title: &str) -> Option<String> {
    for sep in ["\u{2014}", "\u{2013}", " - "] {
        if let Some(idx) = title.rfind(sep) {
            let name = title[idx + sep.len()..].trim();
            if !name.is_empty() && name.len() > 1 {
                return Some(name.to_string());
            }
        }
    }
    None
}

#[cfg(target_os = "macos")]
fn get_bundle_identifier(pid: u64) -> Option<String> {
    use objc::runtime::{Class, Object};
    use objc::{msg_send, sel, sel_impl};

    unsafe {
        let cls = Class::get("NSRunningApplication")?;
        let app: *mut Object = msg_send![cls, runningApplicationWithProcessIdentifier: pid as i32];
        if app.is_null() {
            return None;
        }
        let bundle_id: *mut Object = msg_send![app, bundleIdentifier];
        if bundle_id.is_null() {
            return None;
        }
        let utf8: *const std::os::raw::c_char = msg_send![bundle_id, UTF8String];
        if utf8.is_null() {
            return None;
        }
        Some(
            std::ffi::CStr::from_ptr(utf8)
                .to_string_lossy()
                .into_owned(),
        )
    }
}

#[cfg(target_os = "macos")]
fn get_executable_path(pid: u64) -> Option<String> {
    get_running_app_path(pid)
}

#[cfg(target_os = "macos")]
fn get_process_name(pid: u64) -> Option<String> {
    use objc::runtime::{Class, Object};
    use objc::{msg_send, sel, sel_impl};

    unsafe {
        let cls = Class::get("NSRunningApplication")?;
        let app: *mut Object = msg_send![cls, runningApplicationWithProcessIdentifier: pid as i32];
        if app.is_null() {
            return None;
        }
        let name: *mut Object = msg_send![app, localizedName];
        if name.is_null() {
            return None;
        }
        let utf8: *const std::os::raw::c_char = msg_send![name, UTF8String];
        if utf8.is_null() {
            return None;
        }
        Some(
            std::ffi::CStr::from_ptr(utf8)
                .to_string_lossy()
                .into_owned(),
        )
    }
}

#[cfg(target_os = "windows")]
fn get_bundle_identifier(_pid: u64) -> Option<String> {
    None
}

#[cfg(target_os = "windows")]
fn get_executable_path(pid: u64) -> Option<String> {
    use windows::Win32::Foundation::CloseHandle;
    use windows::Win32::System::Threading::{
        OpenProcess, PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION,
        QueryFullProcessImageNameW,
    };

    unsafe {
        let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid as u32).ok()?;
        let mut buffer = [0u16; 260];
        let mut size = buffer.len() as u32;
        let result = QueryFullProcessImageNameW(
            handle,
            PROCESS_NAME_WIN32,
            windows::core::PWSTR(buffer.as_mut_ptr()),
            &mut size,
        );
        let _ = CloseHandle(handle);
        result.ok()?;
        let path = String::from_utf16_lossy(&buffer[..size as usize]);
        if path.is_empty() { None } else { Some(path) }
    }
}

#[cfg(target_os = "windows")]
fn get_process_name(pid: u64) -> Option<String> {
    let path = get_executable_path(pid)?;
    let filename = path.rsplit('\\').next()?;
    let name = filename.strip_suffix(".exe").unwrap_or(filename);
    if name.is_empty() {
        None
    } else {
        Some(name.to_string())
    }
}

#[cfg(target_os = "linux")]
fn get_bundle_identifier(_pid: u64) -> Option<String> {
    None
}

#[cfg(target_os = "linux")]
fn get_executable_path(pid: u64) -> Option<String> {
    std::fs::read_link(format!("/proc/{}/exe", pid))
        .ok()
        .map(|p| p.to_string_lossy().into_owned())
}

#[cfg(target_os = "linux")]
fn get_process_name(pid: u64) -> Option<String> {
    std::fs::read_to_string(format!("/proc/{}/comm", pid))
        .ok()
        .map(|s| s.trim().to_string())
}

#[cfg(target_os = "macos")]
fn get_running_app_path(pid: u64) -> Option<String> {
    use objc::runtime::{Class, Object};
    use objc::{msg_send, sel, sel_impl};

    unsafe {
        let cls = Class::get("NSRunningApplication")?;
        let app: *mut Object = msg_send![cls, runningApplicationWithProcessIdentifier: pid as i32];
        if app.is_null() {
            return None;
        }
        let url: *mut Object = msg_send![app, bundleURL];
        if url.is_null() {
            return None;
        }
        let path: *mut Object = msg_send![url, path];
        if path.is_null() {
            return None;
        }
        let utf8: *const std::os::raw::c_char = msg_send![path, UTF8String];
        if utf8.is_null() {
            return None;
        }
        Some(
            std::ffi::CStr::from_ptr(utf8)
                .to_string_lossy()
                .into_owned(),
        )
    }
}

#[cfg(target_os = "macos")]
fn get_app_icon_base64(app_name: &str, pid: u64) -> Option<String> {
    use objc::runtime::{Class, Object};
    use objc::{msg_send, sel, sel_impl};

    #[repr(C)]
    struct NSSize {
        width: f64,
        height: f64,
    }

    unsafe {
        let app_path =
            get_running_app_path(pid).unwrap_or_else(|| format!("/Applications/{}.app", app_name));

        if !std::path::Path::new(&app_path).exists() {
            return None;
        }

        let workspace_cls = Class::get("NSWorkspace")?;
        let workspace: *mut Object = msg_send![workspace_cls, sharedWorkspace];

        let c_path = std::ffi::CString::new(app_path.as_str()).ok()?;
        let ns_string_cls = Class::get("NSString")?;
        let path_ns: *mut Object = msg_send![ns_string_cls, stringWithUTF8String: c_path.as_ptr()];

        let icon: *mut Object = msg_send![workspace, iconForFile: path_ns];
        if icon.is_null() {
            return None;
        }

        let size = NSSize {
            width: 128.0,
            height: 128.0,
        };
        let _: () = msg_send![icon, setSize: size];

        let tiff_data: *mut Object = msg_send![icon, TIFFRepresentation];
        if tiff_data.is_null() {
            return None;
        }

        let bitmap_cls = Class::get("NSBitmapImageRep")?;
        let bitmap: *mut Object = msg_send![bitmap_cls, alloc];
        let bitmap: *mut Object = msg_send![bitmap, initWithData: tiff_data];
        if bitmap.is_null() {
            return None;
        }

        let png_type: u64 = 4;
        let nil: *mut Object = std::ptr::null_mut();
        let png_data: *mut Object =
            msg_send![bitmap, representationUsingType: png_type properties: nil];
        if png_data.is_null() {
            return None;
        }

        let length: usize = msg_send![png_data, length];
        let bytes: *const u8 = msg_send![png_data, bytes];
        if bytes.is_null() || length == 0 {
            return None;
        }
        let slice = std::slice::from_raw_parts(bytes, length);

        use base64::Engine;
        Some(base64::engine::general_purpose::STANDARD.encode(slice))
    }
}

#[cfg(target_os = "windows")]
fn get_app_icon_base64(_app_name: &str, pid: u64) -> Option<String> {
    use windows::Win32::UI::WindowsAndMessaging::{DestroyIcon, HICON};
    use std::io::Cursor;
    use image::RgbaImage;

    unsafe {
        let exe_path = get_executable_path(pid)?;
        let wide_path: Vec<u16> = exe_path.encode_utf16().chain(std::iter::once(0)).collect();

        let hicon: HICON = get_icon_shgetfileinfo(&wide_path)
            .or_else(|| get_icon_extracticonex(&wide_path))?;

        let result = extract_icon_pixels(hicon, 32);
        let _ = DestroyIcon(hicon);
        let (pixels, size) = result?;

        let mut rgba_pixels = pixels;
        for chunk in rgba_pixels.chunks_exact_mut(4) {
            chunk.swap(0, 2);
        }

        let img = RgbaImage::from_raw(size as u32, size as u32, rgba_pixels)?;
        let mut png_bytes = Cursor::new(Vec::new());
        img.write_to(&mut png_bytes, image::ImageFormat::Png).ok()?;

        use base64::Engine;
        Some(base64::engine::general_purpose::STANDARD.encode(png_bytes.into_inner()))
    }
}

#[cfg(target_os = "windows")]
unsafe fn get_icon_shgetfileinfo(
    wide_path: &[u16],
) -> Option<windows::Win32::UI::WindowsAndMessaging::HICON> {
    use windows::Win32::UI::Shell::{SHGetFileInfoW, SHFILEINFOW, SHGFI_ICON, SHGFI_LARGEICON};
    use windows::Win32::Storage::FileSystem::FILE_FLAGS_AND_ATTRIBUTES;

    unsafe {
        let mut shfi = SHFILEINFOW::default();
        let result = SHGetFileInfoW(
            windows::core::PCWSTR(wide_path.as_ptr()),
            FILE_FLAGS_AND_ATTRIBUTES(0),
            Some(&mut shfi),
            std::mem::size_of::<SHFILEINFOW>() as u32,
            SHGFI_ICON | SHGFI_LARGEICON,
        );
        if result != 0 && !shfi.hIcon.is_invalid() {
            Some(shfi.hIcon)
        } else {
            None
        }
    }
}

#[cfg(target_os = "windows")]
unsafe fn get_icon_extracticonex(
    wide_path: &[u16],
) -> Option<windows::Win32::UI::WindowsAndMessaging::HICON> {
    use windows::Win32::UI::Shell::ExtractIconExW;
    use windows::Win32::UI::WindowsAndMessaging::HICON;

    unsafe {
        let mut large_icon = HICON::default();
        let count = ExtractIconExW(
            windows::core::PCWSTR(wide_path.as_ptr()),
            0,
            Some(&mut large_icon),
            None,
            1,
        );
        if count > 0 && !large_icon.is_invalid() {
            Some(large_icon)
        } else {
            None
        }
    }
}

#[cfg(target_os = "windows")]
unsafe fn extract_icon_pixels(
    hicon: windows::Win32::UI::WindowsAndMessaging::HICON,
    size: i32,
) -> Option<(Vec<u8>, i32)> {
    use windows::Win32::UI::WindowsAndMessaging::{GetIconInfo, ICONINFO};
    use windows::Win32::Graphics::Gdi::*;

    unsafe {
        let mut icon_info = ICONINFO::default();
        GetIconInfo(hicon, &mut icon_info).ok()?;

        let hdc = CreateCompatibleDC(None);
        if hdc.is_invalid() {
            cleanup_bitmaps(&icon_info);
            return None;
        }

        let mut bmi = BITMAPINFO {
            bmiHeader: BITMAPINFOHEADER {
                biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                biWidth: size,
                biHeight: -size,
                biPlanes: 1,
                biBitCount: 32,
                biCompression: BI_RGB.0,
                ..Default::default()
            },
            ..Default::default()
        };

        let mut pixels = vec![0u8; (size * size * 4) as usize];
        let hbm = if !icon_info.hbmColor.is_invalid() {
            icon_info.hbmColor
        } else {
            icon_info.hbmMask
        };

        let old = SelectObject(hdc, hbm);
        let scan_lines = GetDIBits(
            hdc,
            hbm,
            0,
            size as u32,
            Some(pixels.as_mut_ptr() as *mut _),
            &mut bmi,
            DIB_RGB_COLORS,
        );
        let _ = SelectObject(hdc, old);
        let _ = DeleteDC(hdc);
        cleanup_bitmaps(&icon_info);

        if scan_lines == 0 {
            None
        } else {
            Some((pixels, size))
        }
    }
}

#[cfg(target_os = "windows")]
unsafe fn cleanup_bitmaps(icon_info: &windows::Win32::UI::WindowsAndMessaging::ICONINFO) {
    use windows::Win32::Graphics::Gdi::DeleteObject;
    unsafe {
        if !icon_info.hbmColor.is_invalid() {
            let _ = DeleteObject(icon_info.hbmColor);
        }
        if !icon_info.hbmMask.is_invalid() {
            let _ = DeleteObject(icon_info.hbmMask);
        }
    }
}

#[cfg(target_os = "linux")]
fn get_app_icon_base64(_app_name: &str, _pid: u64) -> Option<String> {
    None
}
