import { SettingRow } from '@/app/components/ui/setting-row'

export default function KeyboardSettingsContent() {
  return (
    <div className="rounded-xl bg-[#F2F2F2]">
      <SettingRow>
        <div className="w-1/3">
          <div className="text-sm font-medium text-[#1f1f1f] mb-2">Keyboard Shortcut</div>
          <div className="text-[13px] text-[#888]">
            Set the keyboard shortcut to activate the app. Press the keys you want to use.
          </div>
        </div>
        <div className="flex gap-1">
          <kbd className="px-3 py-2 bg-white border border-warm-200 rounded-lg text-sm font-mono">Alt</kbd>
          <kbd className="px-3 py-2 bg-white border border-warm-200 rounded-lg text-sm font-mono">◄</kbd>
        </div>
      </SettingRow>
      <SettingRow last>
        <div className="w-1/3">
          <div className="text-sm font-medium text-[#1f1f1f] mb-2">Intelligent Mode Shortcut</div>
          <div className="text-[13px] text-[#888]">
            Set the shortcut to activate Intelligent Mode.
          </div>
        </div>
        <div className="flex gap-1">
          <kbd className="px-3 py-2 bg-white border border-warm-200 rounded-lg text-sm font-mono">Alt</kbd>
          <kbd className="px-3 py-2 bg-white border border-warm-200 rounded-lg text-sm font-mono">►</kbd>
        </div>
      </SettingRow>
    </div>
  )
}
