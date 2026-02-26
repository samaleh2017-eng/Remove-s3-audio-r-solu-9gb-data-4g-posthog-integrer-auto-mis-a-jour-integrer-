import React, { useState, useEffect, useRef } from 'react'
import { useWindowContext } from './WindowContext'
import { useMainStore } from '@/app/store/useMainStore'

export function Titlebar() {
  const wcontext = useWindowContext().window
  const { navExpanded, setCurrentPage, setSettingsPage } = useMainStore()
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false)
      }
    }
    if (showUserDropdown) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showUserDropdown])

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentPage('settings')
    setSettingsPage('account')
    setShowUserDropdown(false)
  }

  return (
    <div
      className={`window-titlebar ${wcontext?.platform ? `platform-${wcontext.platform}` : ''}`}
      style={{ position: 'relative', borderBottom: 'none' }}
    >
      {/* Left side — spacer aligned with sidebar + user icon */}
      <div className="titlebar-action-btn flex items-center z-10" style={{ gap: '2px' }}>
        <div
          className={`h-full border-r border-transparent transition-all duration-200 ease-in-out ${
            navExpanded ? 'w-56' : 'w-[72px]'
          }`}
        />

        <div className="relative ml-2" ref={dropdownRef}>
          <div
            className="titlebar-action-btn hover:bg-warm-200 flex items-center justify-center cursor-pointer"
            style={{ width: 36, height: 30, borderRadius: 6 }}
            onClick={(e) => {
              e.stopPropagation()
              setShowUserDropdown(!showUserDropdown)
            }}
          >
            <UserCircleIcon />
          </div>

          {showUserDropdown && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-[var(--card)] border border-warm-100 dark:border-warm-800 rounded-lg shadow-lg z-20">
              <button
                onClick={handleSettingsClick}
                className="w-full px-2 py-2 text-left text-sm text-warm-700 hover:bg-warm-50 flex items-center gap-2 rounded-t-lg cursor-pointer"
              >
                <CogIcon />
                Settings
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowUserDropdown(false)
                }}
                className="w-full px-2 py-2 text-left text-sm text-warm-700 hover:bg-warm-50 flex items-center gap-2 rounded-b-lg cursor-pointer"
              >
                <LogoutIcon />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right side — notifications + window controls */}
      <div className="titlebar-action-btn flex items-center z-10" style={{ gap: '2px' }}>
        <button
          className="titlebar-action-btn flex items-center justify-center w-8 h-8 rounded-lg hover:bg-warm-100 transition-colors"
          title="Notifications"
        >
          <BellIcon />
        </button>

        {wcontext?.platform === 'win32' && <TitlebarControls />}
      </div>
    </div>
  )
}

function TitlebarControls() {
  const wcontext = useWindowContext().window
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    if (window.api?.on) {
      const cleanup = window.api.on('window-maximized-changed', (maximized: boolean) => {
        setIsMaximized(maximized)
      })
      return cleanup
    }
  }, [])

  const closePath =
    'M 0,0 0,0.7 4.3,5 0,9.3 0,10 0.7,10 5,5.7 9.3,10 10,10 10,9.3 5.7,5 10,0.7 10,0 9.3,0 5,4.3 0.7,0 Z'
  const maximizePath = 'M 0,0 0,10 10,10 10,0 Z M 1,1 9,1 9,9 1,9 Z'
  const restorePath =
    'M 2,0 2,2 0,2 0,10 8,10 8,8 10,8 10,0 Z M 1,3 7,3 7,9 1,9 Z M 3,1 9,1 9,7 8,7 8,2 3,2 Z'
  const minimizePath = 'M 0,5 10,5 10,6 0,6 Z'

  const handleAction = (action: string) => {
    if (window.api?.invoke) {
      switch (action) {
        case 'minimize':
          window.api.invoke('window-minimize')
          break
        case 'maximize':
          window.api.invoke('window-maximize-toggle')
          break
        case 'close':
          window.api.invoke('window-close')
          break
      }
    }
  }

  return (
    <div className="window-titlebar-controls">
      {wcontext?.minimizable && (
        <div
          aria-label="minimize"
          className="titlebar-controlButton"
          onClick={() => handleAction('minimize')}
        >
          <svg width="10" height="10">
            <path fill="currentColor" d={minimizePath} />
          </svg>
        </div>
      )}
      {wcontext?.maximizable && (
        <div
          aria-label="maximize"
          className="titlebar-controlButton"
          onClick={() => handleAction('maximize')}
        >
          <svg width="10" height="10">
            <path fill="currentColor" d={isMaximized ? restorePath : maximizePath} />
          </svg>
        </div>
      )}
      <div
        aria-label="close"
        className="titlebar-controlButton"
        onClick={() => handleAction('close')}
      >
        <svg width="10" height="10">
          <path fill="currentColor" d={closePath} />
        </svg>
      </div>
    </div>
  )
}

function UserCircleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="10" r="3" />
      <path d="M6.168 18.849A4 4 0 0 1 10 16h4a4 4 0 0 1 3.834 2.855" />
    </svg>
  )
}

function CogIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg className="w-4 h-4 text-warm-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  )
}
