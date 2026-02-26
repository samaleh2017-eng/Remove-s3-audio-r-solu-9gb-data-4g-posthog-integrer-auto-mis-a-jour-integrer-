import { useEffect, useState, useRef } from 'react'
import { useMainStore } from '@/app/store/useMainStore'
import { AppIcon } from '../icons/AppIcon'
import { NavItem } from '../ui/nav-item'
import { Dialog, DialogContent } from '../ui/dialog'
import HomeContent from './contents/HomeContent'
import DictionaryContent from './contents/DictionaryContent'
import NotesContent from './contents/NotesContent'
import AppStylingContent from './contents/AppStylingContent'
import SettingsContent from './contents/SettingsContent'
import AboutContent from './contents/AboutContent'

export default function HomeKit() {
  const { navExpanded, currentPage, setCurrentPage, toggleNavExpanded } = useMainStore()
  const [showText, setShowText] = useState(navExpanded)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const isInitialRender = useRef(true)

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false
      return
    }
    setIsTransitioning(true)
    const timer = setTimeout(() => setIsTransitioning(false), 250)
    return () => clearTimeout(timer)
  }, [navExpanded])

  useEffect(() => {
    if (navExpanded) {
      const timer = setTimeout(() => setShowText(true), 75)
      return () => clearTimeout(timer)
    } else {
      setShowText(false)
    }
  }, [navExpanded])

  const isSettingsOpen = currentPage === 'settings'

  const renderContent = () => {
    switch (currentPage) {
      case 'home':
      case 'settings':
        return <HomeContent />
      case 'dictionary':
        return <DictionaryContent />
      case 'notes':
        return <NotesContent />
      case 'app-styling':
        return <AppStylingContent />
      case 'about':
        return <AboutContent />
      default:
        return <HomeContent />
    }
  }

  return (
    /* ─────────────────────────────────────────────────────────────
     * LAYOUT UNIFIÉ :
     * Ce <div> flex est le fond blanc (#ffffff via --background).
     * Le Sidebar est TRANSPARENT → il hérite ce même blanc.
     * Seule la Content Card a un fond différent (#fafafa).
     * Résultat : Titlebar + Sidebar + fond = un seul plan blanc.
     * La Content Card flotte par-dessus avec ses coins arrondis.
     * ───────────────────────────────────────────────────────────── */
    <div className="flex h-full bg-[var(--background)]">
      {/* ── SIDEBAR ── fond transparent = hérite du #ffffff parent ── */}
      <div
        className={`${
          navExpanded ? 'w-56' : 'w-[72px]'
        } flex flex-col justify-between py-5 px-3 transition-all duration-200 ease-in-out flex-shrink-0`}
        style={{ willChange: isTransitioning ? 'width' : 'auto' }}
      >
        <div>
          {/* Logo + Badge */}
          <div className="flex items-center px-3 mb-10">
            <div className="w-6 flex items-center justify-center flex-shrink-0">
              <AppIcon className="w-6 text-foreground" style={{ height: '32px' }} />
            </div>
            <span
              className={`text-2xl font-bold font-sans transition-opacity duration-100 ${
                showText ? 'opacity-100 ml-3' : 'opacity-0 w-0 overflow-hidden'
              }`}
            >
              ito
            </span>
            {showText && (
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-md bg-gradient-to-r from-purple-500 to-pink-500 text-white transition-opacity duration-100 ${
                  showText ? 'opacity-100 ml-2' : 'opacity-0 w-0 overflow-hidden'
                }`}
              >
                PRO
              </span>
            )}
          </div>

          {/* Nav Items */}
          <div className="flex flex-col gap-1 text-sm">
            <NavItem
              icon={<HomeIcon />}
              label="Home"
              isActive={currentPage === 'home'}
              showText={showText}
              onClick={() => setCurrentPage('home')}
            />
            <NavItem
              icon={<BookIcon />}
              label="Dictionary"
              isActive={currentPage === 'dictionary'}
              showText={showText}
              onClick={() => setCurrentPage('dictionary')}
            />
            <NavItem
              icon={<FileIcon />}
              label="Notes"
              isActive={currentPage === 'notes'}
              showText={showText}
              onClick={() => setCurrentPage('notes')}
            />
            <NavItem
              icon={<SparklesIcon />}
              label="App Styling"
              isActive={currentPage === 'app-styling'}
              showText={showText}
              onClick={() => setCurrentPage('app-styling')}
            />
            <NavItem
              icon={<CogIcon />}
              label="Settings"
              isActive={currentPage === 'settings'}
              showText={showText}
              onClick={() => setCurrentPage('settings')}
            />
            <NavItem
              icon={<InfoIcon />}
              label="About"
              isActive={currentPage === 'about'}
              showText={showText}
              onClick={() => setCurrentPage('about')}
            />
          </div>
        </div>

        {/* Collapse / Expand */}
        <div className="text-sm">
          <NavItem
            icon={<PanelLeftIcon />}
            label={navExpanded ? 'Collapse' : 'Expand'}
            showText={showText}
            onClick={toggleNavExpanded}
          />
        </div>
      </div>

      {/* ── CONTENT CARD ── seul élément avec fond #fafafa distinct ── */}
      <div className="flex-1 bg-[var(--color-surface)] rounded-[var(--radius-lg)] my-2 mr-2 shadow-[var(--shadow-soft)] overflow-hidden flex flex-col border border-[var(--border)]">
        <div className="flex-1 overflow-y-auto pt-10">{renderContent()}</div>
      </div>

      {/* ── SETTINGS DIALOG ── modal overlay 95vw × 85vh ── */}
      <Dialog open={isSettingsOpen} onOpenChange={(open) => { if (!open) setCurrentPage('home') }}>
        <DialogContent
          showCloseButton={false}
          className="max-w-[1100px] w-[95vw] h-[85vh] p-0 overflow-hidden rounded-2xl border border-[#E8E8E8] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.12)]"
        >
          <SettingsContent />
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ── Inline SVG Icons (remplacer par @mynaui/icons-react ou lucide-react) ── */

function HomeIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function BookIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  )
}

function FileIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}

function SparklesIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275z" />
    </svg>
  )
}

function CogIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  )
}

function PanelLeftIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
    </svg>
  )
}
