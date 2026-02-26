import { SettingRow } from '@/app/components/ui/setting-row'

export default function AdvancedSettingsContent() {
  return (
    <div className="rounded-xl bg-[#F2F2F2]">
      <SettingRow>
        <div>
          <div className="text-sm font-medium text-[#1f1f1f]">Server URL</div>
          <div className="text-[13px] text-[#888]">Override the default transcription server endpoint.</div>
        </div>
        <input
          type="text"
          placeholder="https://api.example.com"
          className="w-80 bg-white border border-[var(--border)] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent"
        />
      </SettingRow>
      <SettingRow last>
        <div>
          <div className="text-sm font-medium text-[#1f1f1f]">Debug Mode</div>
          <div className="text-[13px] text-[#888]">Enable verbose logging for troubleshooting.</div>
        </div>
        <button className="bg-[#D9D9DE] border-0 text-[#1f1f1f] hover:bg-[#CDCDD2] rounded-lg text-sm px-5 py-2.5 cursor-pointer">
          Enable
        </button>
      </SettingRow>
    </div>
  )
}
