import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/app/components/ui/button'
import { Refresh, CheckCircle, Download } from '@mynaui/icons-react'

type UpdateState = 'idle' | 'checking' | 'up-to-date' | 'available' | 'downloading' | 'ready' | 'error'

export default function UpdatesSettingsContent() {
  const [updateState, setUpdateState] = useState<UpdateState>('idle')
  const [availableVersion, setAvailableVersion] = useState<string | null>(null)
  const [downloadProgress, setDownloadProgress] = useState<number>(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const currentVersion = import.meta.env.VITE_ITO_VERSION as string

  useEffect(() => {
    window.api.updater.getUpdateStatus().then(status => {
      if (status.updateDownloaded) {
        setUpdateState('ready')
        if (status.availableVersion) setAvailableVersion(status.availableVersion)
      } else if (status.updateAvailable) {
        setUpdateState('available')
        if (status.availableVersion) setAvailableVersion(status.availableVersion)
      }
    })

    const cleanupAvailable = window.api.updater.onUpdateAvailable(() => {
      window.api.updater.getUpdateStatus().then(s => {
        setUpdateState('available')
        setErrorMessage(null)
        if (s.availableVersion) setAvailableVersion(s.availableVersion)
      })
    })

    const cleanupNotAvailable = window.api.updater.onUpdateNotAvailable(() => {
      setUpdateState('up-to-date')
      setErrorMessage(null)
      setTimeout(() => setUpdateState('idle'), 3000)
    })

    const cleanupDownloaded = window.api.updater.onUpdateDownloaded(() => {
      setUpdateState('ready')
      setDownloadProgress(100)
    })

    const cleanupError = window.api.updater.onUpdateError((message: string) => {
      console.error('[Updates] Error:', message)
      setUpdateState('error')
      setErrorMessage(message)
    })

    const cleanupProgress = window.api.updater.onDownloadProgress((percent: number) => {
      setDownloadProgress(Math.round(percent))
    })

    return () => {
      cleanupAvailable()
      cleanupNotAvailable()
      cleanupDownloaded()
      cleanupError()
      cleanupProgress()
    }
  }, [])

  const handleCheckForUpdates = useCallback(async () => {
    setUpdateState('checking')
    setErrorMessage(null)
    await window.api.updater.checkForUpdates()
  }, [])

  const handleDownload = useCallback(async () => {
    setUpdateState('downloading')
    setDownloadProgress(0)
    try {
      await window.api.updater.downloadUpdate()
    } catch {
      setUpdateState('available')
    }
  }, [])

  const handleInstall = useCallback(() => {
    if (confirm('L\'application va redémarrer pour installer la mise à jour. Continuer ?')) {
      window.api.updater.installUpdate()
    }
  }, [])

  return (
    <div className="max-w-lg">
      <div className="bg-[#F8F8F8] rounded-xl p-5 mb-6 flex items-center justify-between">
        <div>
          <div className="text-xs text-[#999] uppercase tracking-wider mb-1">Version actuelle</div>
          <div className="text-xl font-semibold text-[#1f1f1f]">v{currentVersion}</div>
        </div>
        {updateState === 'up-to-date' && (
          <div className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            À jour
          </div>
        )}
      </div>

      {(updateState === 'available' || updateState === 'downloading' || updateState === 'ready') && (
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-5 mb-6">
          <div className="font-semibold text-sky-900 mb-1">
            Mise à jour disponible{availableVersion ? ` — v${availableVersion}` : ''}
          </div>
          {updateState === 'downloading' && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-sky-700 mb-1">
                <span>Téléchargement en cours...</span>
                <span>{downloadProgress}%</span>
              </div>
              <div className="w-full bg-sky-200 rounded-full h-1.5">
                <div
                  className="bg-sky-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
            </div>
          )}
          {updateState === 'ready' && (
            <p className="text-sm text-sky-700 mt-1">Prête à installer. L'app redémarrera.</p>
          )}
        </div>
      )}

      {updateState === 'error' && errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-6">
          <div className="font-semibold text-red-900 mb-1">Erreur de vérification</div>
          <p className="text-sm text-red-700">{errorMessage}</p>
        </div>
      )}

      <div className="flex gap-3">
        {updateState === 'idle' || updateState === 'up-to-date' || updateState === 'checking' || updateState === 'error' ? (
          <Button
            onClick={handleCheckForUpdates}
            disabled={updateState === 'checking'}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Refresh className={`w-4 h-4 ${updateState === 'checking' ? 'animate-spin' : ''}`} />
            {updateState === 'checking' ? 'Vérification...' : 'Vérifier les mises à jour'}
          </Button>
        ) : updateState === 'available' ? (
          <Button onClick={handleDownload} className="flex items-center gap-2 bg-sky-700 hover:bg-sky-600 cursor-pointer">
            <Download className="w-4 h-4" />
            Télécharger la mise à jour
          </Button>
        ) : updateState === 'downloading' ? (
          <Button disabled className="flex items-center gap-2 opacity-60">
            <Download className="w-4 h-4 animate-bounce" />
            Téléchargement...
          </Button>
        ) : updateState === 'ready' ? (
          <Button onClick={handleInstall} className="flex items-center gap-2 bg-green-700 hover:bg-green-600 cursor-pointer">
            Installer et redémarrer
          </Button>
        ) : null}

        {(updateState === 'available' || updateState === 'ready') && (
          <Button
            variant="outline"
            onClick={handleCheckForUpdates}
            className="flex items-center gap-2 cursor-pointer"
            disabled={updateState === 'checking'}
          >
            <Refresh className="w-4 h-4" />
            Re-vérifier
          </Button>
        )}
      </div>

      {import.meta.env.DEV && (
        <p className="mt-4 text-xs text-[#aaa]">
          Mode dev : ajouter <code>VITE_DEV_AUTO_UPDATE=true</code> dans .env pour activer l'updater.
        </p>
      )}
    </div>
  )
}
