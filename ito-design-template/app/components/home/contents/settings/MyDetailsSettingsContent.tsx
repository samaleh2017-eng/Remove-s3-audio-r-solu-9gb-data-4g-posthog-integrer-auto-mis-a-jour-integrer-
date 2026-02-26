import { SettingRow } from '@/app/components/ui/setting-row'

export default function MyDetailsSettingsContent() {
  return (
    <div className="rounded-xl bg-[#F2F2F2]">
      <SettingRow>
        <div className="text-sm font-medium text-[#1f1f1f]">Full Name</div>
        <input
          type="text"
          defaultValue="Arka"
          className="w-80 bg-white border border-[var(--border)] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent"
        />
      </SettingRow>
      <SettingRow>
        <div className="text-sm font-medium text-[#1f1f1f]">Occupation</div>
        <input
          type="text"
          defaultValue="Software Engineer"
          className="w-80 bg-white border border-[var(--border)] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent"
        />
      </SettingRow>
      <SettingRow last>
        <div className="text-sm font-medium text-[#1f1f1f]">Company</div>
        <input
          type="text"
          placeholder="Company name"
          className="w-80 bg-white border border-[var(--border)] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent"
        />
      </SettingRow>
    </div>
  )
}
