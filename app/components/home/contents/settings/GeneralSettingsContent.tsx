import { ReactNode, useState } from 'react'
import { Button } from '@/app/components/ui/button'
import { Switch } from '@/app/components/ui/switch'
import { useSettingsStore } from '@/app/store/useSettingsStore'
import { useWindowContext } from '@/app/components/window/WindowContext'

function SettingRow({
  children,
  last,
}: {
  children: ReactNode
  last?: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between py-4 px-5 ${!last ? 'border-b border-[var(--border)]' : ''}`}
    >
      {children}
    </div>
  )
}

export default function GeneralSettingsContent() {
  const [isDownloading, setIsDownloading] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const {
    shareAnalytics,
    launchAtLogin,
    showItoBarAlways,
    showAppInDock,
    setShareAnalytics,
    setLaunchAtLogin,
    setShowItoBarAlways,
    setShowAppInDock,
  } = useSettingsStore()

  const windowContext = useWindowContext()

  const handleDownloadLogs = async () => {
    setIsDownloading(true)
    try {
      const result = await window.api.logs.download()
      if (!result.success) {
        if (result.error !== 'Download cancelled') {
          console.error('Failed to download logs:', result.error)
          alert(`Failed to download logs: ${result.error}`)
        }
      }
    } catch (error) {
      console.error('Error downloading logs:', error)
      alert('An unexpected error occurred while downloading logs')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleClearLogs = async () => {
    const confirmed = confirm(
      'Are you sure you want to clear all logs? This action cannot be undone.',
    )
    if (!confirmed) return

    setIsClearing(true)
    try {
      const result = await window.api.logs.clear()
      if (result.success) {
        alert('Logs cleared successfully')
      } else {
        console.error('Failed to clear logs:', result.error)
        alert(`Failed to clear logs: ${result.error}`)
      }
    } catch (error) {
      console.error('Error clearing logs:', error)
      alert('An unexpected error occurred while clearing logs')
    } finally {
      setIsClearing(false)
    }
  }

  const isDarwin = windowContext?.window?.platform === 'darwin'

  return (
    <div className="space-y-6">
      <div className="rounded-[var(--radius-lg)] bg-[var(--color-muted-bg)] border border-[var(--border)]">
        <SettingRow>
          <div>
            <div className="text-sm font-medium text-foreground">
              Share analytics
            </div>
            <div className="text-[13px] text-[var(--color-subtext)]">
              Share anonymous usage data to help us improve Ito.
            </div>
          </div>
          <Switch
            checked={shareAnalytics}
            onCheckedChange={setShareAnalytics}
          />
        </SettingRow>
        <SettingRow>
          <div>
            <div className="text-sm font-medium text-foreground">
              Launch at Login
            </div>
            <div className="text-[13px] text-[var(--color-subtext)]">
              Open Ito automatically when your computer starts.
            </div>
          </div>
          <Switch checked={launchAtLogin} onCheckedChange={setLaunchAtLogin} />
        </SettingRow>
        <SettingRow last={!isDarwin}>
          <div>
            <div className="text-sm font-medium text-foreground">
              Show Ito bar at all times
            </div>
            <div className="text-[13px] text-[var(--color-subtext)]">
              Show the Ito bar at all times.
            </div>
          </div>
          <Switch
            checked={showItoBarAlways}
            onCheckedChange={setShowItoBarAlways}
          />
        </SettingRow>
        {isDarwin && (
          <SettingRow last>
            <div>
              <div className="text-sm font-medium text-foreground">
                Show app in dock
              </div>
              <div className="text-[13px] text-[var(--color-subtext)]">
                Show the Ito app in the dock for quick access.
              </div>
            </div>
            <Switch
              checked={showAppInDock}
              onCheckedChange={setShowAppInDock}
            />
          </SettingRow>
        )}
      </div>

      <div className="text-xs font-semibold tracking-[1.5px] text-[var(--muted-foreground)] uppercase">
        Log Management
      </div>
      <div className="rounded-[var(--radius-lg)] bg-[var(--color-muted-bg)] border border-[var(--border)]">
        <SettingRow>
          <div>
            <div className="text-sm font-medium text-foreground">
              Download Logs
            </div>
            <div className="text-[13px] text-[var(--color-subtext)]">
              Export your local logs to a file for troubleshooting.
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-10 px-5 rounded-xl"
            onClick={handleDownloadLogs}
            disabled={isDownloading}
          >
            {isDownloading ? 'Downloading...' : 'Download'}
          </Button>
        </SettingRow>
        <SettingRow last>
          <div>
            <div className="text-sm font-medium text-foreground">
              Clear Logs
            </div>
            <div className="text-[13px] text-[var(--color-subtext)]">
              Permanently delete all local logs from your device.
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-10 px-5 rounded-xl"
            onClick={handleClearLogs}
            disabled={isClearing}
          >
            {isClearing ? 'Clearing...' : 'Clear'}
          </Button>
        </SettingRow>
      </div>
    </div>
  )
}
