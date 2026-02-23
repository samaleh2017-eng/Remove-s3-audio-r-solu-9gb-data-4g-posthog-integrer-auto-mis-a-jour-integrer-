import { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/app/components/ui/dialog'
import { Button } from '@/app/components/ui/button'
import {
  useAppStylingStore,
  type MatchType,
} from '@/app/store/useAppStylingStore'
import { Globe, Check, Refresh, Search } from '@mynaui/icons-react'
import AppWindowIcon from '@/app/components/icons/AppWindowIcon'

function extractDomainFromInput(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  try {
    const url = new URL(
      trimmed.startsWith('http') ? trimmed : `https://${trimmed}`,
    )
    return url.hostname
  } catch {
    if (
      trimmed.includes('.') &&
      !trimmed.includes(' ') &&
      trimmed.length >= 3
    ) {
      return trimmed.toLowerCase()
    }
    return null
  }
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ManualAddDialog({ open, onOpenChange }: Props) {
  const { registerApp } = useAppStylingStore()
  const [selectedType, setSelectedType] = useState<MatchType>('app')
  const [installedApps, setInstalledApps] = useState<string[]>([])
  const [isLoadingApps, setIsLoadingApps] = useState(false)
  const [appFilter, setAppFilter] = useState('')
  const [selectedApp, setSelectedApp] = useState<string | null>(null)
  const [domainInput, setDomainInput] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)

  const fetchInstalledApps = async (signal?: { cancelled: boolean }) => {
    setIsLoadingApps(true)
    try {
      const apps = await window.api.appTargets.listInstalledApps()
      if (signal?.cancelled) return
      setInstalledApps(apps)
    } catch (error) {
      console.error('Failed to load installed apps:', error)
    } finally {
      if (!signal?.cancelled) setIsLoadingApps(false)
    }
  }

  useEffect(() => {
    if (open) {
      setSelectedType('app')
      setAppFilter('')
      setSelectedApp(null)
      setDomainInput('')
      setIsRegistering(false)
      const signal = { cancelled: false }
      fetchInstalledApps(signal)
      return () => {
        signal.cancelled = true
      }
    }
    return undefined
  }, [open])

  useEffect(() => {
    setSelectedApp(null)
    setAppFilter('')
    setDomainInput('')
  }, [selectedType])

  const filteredApps = useMemo(() => {
    if (!appFilter.trim()) return installedApps
    const lower = appFilter.toLowerCase()
    return installedApps.filter(app => app.toLowerCase().includes(lower))
  }, [installedApps, appFilter])

  const extractedDomain = useMemo(
    () => extractDomainFromInput(domainInput),
    [domainInput],
  )

  const canAdd = selectedType === 'app' ? !!selectedApp : !!extractedDomain

  const handleAdd = async () => {
    if (!canAdd) return
    setIsRegistering(true)
    try {
      if (selectedType === 'app' && selectedApp) {
        await registerApp('app', selectedApp)
      } else if (selectedType === 'domain' && extractedDomain) {
        await registerApp('domain', extractedDomain, extractedDomain)
      }
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to register:', error)
    } finally {
      setIsRegistering(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add App or Domain</DialogTitle>
          <DialogDescription>
            Register an application or website to assign a writing tone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setSelectedType('app')}
              className={`flex-1 flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                selectedType === 'app'
                  ? 'border-[var(--ring)] bg-[var(--ring-soft)]'
                  : 'border-[var(--border)] hover:border-[var(--ring)]'
              }`}
            >
              <div
                className={`p-2 rounded-lg ${selectedType === 'app' ? 'bg-[var(--ring)] text-white' : 'bg-[var(--color-muted-bg)]'}`}
              >
                <AppWindowIcon className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium">Application</span>
                  {selectedType === 'app' && (
                    <Check className="h-3.5 w-3.5 text-[var(--ring)]" />
                  )}
                </div>
                <p className="text-xs text-[var(--color-subtext)]">
                  Match by app name
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedType('domain')}
              className={`flex-1 flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                selectedType === 'domain'
                  ? 'border-[var(--ring)] bg-[var(--ring-soft)]'
                  : 'border-[var(--border)] hover:border-[var(--ring)]'
              }`}
            >
              <div
                className={`p-2 rounded-lg ${selectedType === 'domain' ? 'bg-[var(--ring)] text-white' : 'bg-[var(--color-muted-bg)]'}`}
              >
                <Globe className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium">Domain</span>
                  {selectedType === 'domain' && (
                    <Check className="h-3.5 w-3.5 text-[var(--ring)]" />
                  )}
                </div>
                <p className="text-xs text-[var(--color-subtext)]">
                  Match by website
                </p>
              </div>
            </button>
          </div>

          {selectedType === 'app' ? (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-subtext)]" />
                <input
                  type="text"
                  className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl pl-9 pr-10 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent"
                  placeholder="Filter apps..."
                  value={appFilter}
                  onChange={e => setAppFilter(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => fetchInstalledApps()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[var(--color-muted-bg)] transition-colors"
                  title="Refresh app list"
                >
                  <Refresh
                    className={`h-3.5 w-3.5 text-[var(--color-subtext)] ${isLoadingApps ? 'animate-spin' : ''}`}
                  />
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto rounded-lg border border-[var(--border)] divide-y divide-[var(--border)]">
                {isLoadingApps ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-[var(--color-subtext)]">
                    <div className="w-4 h-4 border-2 border-[var(--border)] border-t-[var(--ring)] rounded-full animate-spin" />
                    <span className="text-sm">Loading apps...</span>
                  </div>
                ) : filteredApps.length === 0 ? (
                  <div className="py-6 text-center text-sm text-[var(--color-subtext)]">
                    {appFilter ? 'No apps match your filter' : 'No apps found'}
                  </div>
                ) : (
                  filteredApps.map(appName => (
                    <button
                      key={appName}
                      type="button"
                      onClick={() => setSelectedApp(appName)}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                        selectedApp === appName
                          ? 'bg-[var(--ring-soft)] text-foreground font-medium'
                          : 'hover:bg-[var(--muted)]'
                      }`}
                    >
                      {appName}
                    </button>
                  ))
                )}
              </div>
              <p className="text-xs text-[var(--color-subtext)]">
                Apps installed on your computer
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <input
                type="text"
                className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent"
                placeholder="e.g. docs.google.com or paste a full URL"
                value={domainInput}
                onChange={e => setDomainInput(e.target.value)}
              />
              {domainInput.trim() &&
                (extractedDomain ? (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Will match:{' '}
                    <span className="font-medium">{extractedDomain}</span>
                  </p>
                ) : (
                  <p className="text-xs text-red-500">
                    Invalid domain — enter a valid URL or domain name
                  </p>
                ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!canAdd || isRegistering}>
            {isRegistering ? 'Adding...' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
