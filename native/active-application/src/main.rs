use active_win_pos_rs::ActiveWindow;
use serde_json::json;

fn main() {
    let with_icon = std::env::args().any(|arg| arg == "--with-icon");

    match active_win_pos_rs::get_active_window() {
        Ok(active_window) => output_result(active_window, with_icon),
        Err(e) => {
            eprintln!("{}", json!({ "error": e }));
            std::process::exit(1);
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
fn get_app_icon_base64(_app_name: &str, _pid: u64) -> Option<String> {
    None
}

#[cfg(target_os = "linux")]
fn get_app_icon_base64(_app_name: &str, _pid: u64) -> Option<String> {
    None
}
