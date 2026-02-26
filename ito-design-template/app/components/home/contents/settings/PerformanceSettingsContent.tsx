import { SettingRow } from '@/app/components/ui/setting-row'

export default function PerformanceSettingsContent() {
  return (
    <div className="rounded-xl bg-[#F2F2F2]">
      <SettingRow>
        <div>
          <div className="text-sm font-medium text-[#1f1f1f]">Performance Tier</div>
          <div className="text-[13px] text-[#888]">Adjust visual quality based on your hardware.</div>
        </div>
        <select className="w-48 bg-white border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]">
          <option>Auto</option>
          <option>Low</option>
          <option>Balanced</option>
          <option>High</option>
          <option>Ultra</option>
        </select>
      </SettingRow>
      <SettingRow last>
        <div>
          <div className="text-sm font-medium text-[#1f1f1f]">Hardware Info</div>
          <div className="text-[13px] text-[#888]">CPU: Apple M1 — RAM: 16 GB — Tier: High</div>
        </div>
      </SettingRow>
    </div>
  )
}
