import { useState } from 'react'
import { Switch } from '@/app/components/ui/switch'
import { SettingRow } from '@/app/components/ui/setting-row'

export default function GeneralSettingsContent() {
  const [shareAnalytics, setShareAnalytics] = useState(true)
  const [launchAtLogin, setLaunchAtLogin] = useState(false)
  const [showBarAlways, setShowBarAlways] = useState(true)

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-[#F2F2F2]">
        <SettingRow>
          <div>
            <div className="text-sm font-medium text-[#1f1f1f]">Share analytics</div>
            <div className="text-[13px] text-[#888]">Share anonymous usage data to help us improve.</div>
          </div>
          <Switch checked={shareAnalytics} onCheckedChange={setShareAnalytics} />
        </SettingRow>
        <SettingRow>
          <div>
            <div className="text-sm font-medium text-[#1f1f1f]">Launch at Login</div>
            <div className="text-[13px] text-[#888]">Open automatically when your computer starts.</div>
          </div>
          <Switch checked={launchAtLogin} onCheckedChange={setLaunchAtLogin} />
        </SettingRow>
        <SettingRow last>
          <div>
            <div className="text-sm font-medium text-[#1f1f1f]">Show bar at all times</div>
            <div className="text-[13px] text-[#888]">Show the status bar at all times.</div>
          </div>
          <Switch checked={showBarAlways} onCheckedChange={setShowBarAlways} />
        </SettingRow>
      </div>

      <div className="text-xs font-semibold tracking-[1.5px] text-[#999] uppercase">
        Log Management
      </div>
      <div className="rounded-xl bg-[#F2F2F2]">
        <SettingRow>
          <div>
            <div className="text-sm font-medium text-[#1f1f1f]">Download Logs</div>
            <div className="text-[13px] text-[#888]">Export your local logs to a file for troubleshooting.</div>
          </div>
          <button className="bg-[#D9D9DE] border-0 text-[#1f1f1f] hover:bg-[#CDCDD2] rounded-lg text-sm px-5 py-2.5 cursor-pointer">
            Download
          </button>
        </SettingRow>
        <SettingRow last>
          <div>
            <div className="text-sm font-medium text-[#1f1f1f]">Clear Logs</div>
            <div className="text-[13px] text-[#888]">Permanently delete all local logs from your device.</div>
          </div>
          <button className="bg-[#D9D9DE] border-0 text-[#1f1f1f] hover:bg-[#CDCDD2] rounded-lg text-sm px-5 py-2.5 cursor-pointer">
            Clear
          </button>
        </SettingRow>
      </div>
    </div>
  )
}
