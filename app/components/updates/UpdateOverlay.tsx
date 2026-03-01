import { useEffect, useState } from 'react'
import { useUpdateOverlayStore } from '@/app/store/useUpdateOverlayStore'
import appIcon from '@/resources/build/icon.png'

export default function UpdateOverlay() {
  const { visible, version } = useUpdateOverlayStore()
  const [dots, setDots] = useState('')

  useEffect(() => {
    if (!visible) return
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'))
    }, 500)
    return () => clearInterval(interval)
  }, [visible])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[var(--background)]">
      <div className="flex flex-col items-center gap-6 animate-in fade-in duration-500">
        <div className="relative">
          <img
            src={appIcon}
            alt="Ito"
            className="w-20 h-20 rounded-2xl shadow-lg"
          />
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-sky-500 rounded-full flex items-center justify-center shadow-md">
            <svg
              className="w-3.5 h-3.5 text-white animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-1">
            Installing update{dots}
          </h2>
          {version && (
            <p className="text-sm text-[var(--muted-foreground)]">
              Version {version}
            </p>
          )}
        </div>

        <div className="w-48 mt-2">
          <div className="h-1 w-full bg-[var(--input)] rounded-full overflow-hidden">
            <div className="h-full bg-sky-500 rounded-full update-progress-bar" />
          </div>
        </div>

        <p className="text-xs text-[var(--muted-foreground)] mt-4">
          The app will restart automatically
        </p>
      </div>
    </div>
  )
}
