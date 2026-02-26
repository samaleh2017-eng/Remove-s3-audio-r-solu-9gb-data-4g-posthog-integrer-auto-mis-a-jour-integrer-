import { useMainStore } from '@/app/store/useMainStore'
import GeneralSettingsContent from './settings/GeneralSettingsContent'
import KeyboardSettingsContent from './settings/KeyboardSettingsContent'
import AudioSettingsContent from './settings/AudioSettingsContent'
import PerformanceSettingsContent from './settings/PerformanceSettingsContent'
import AdvancedSettingsContent from './settings/AdvancedSettingsContent'
import MyDetailsSettingsContent from './settings/MyDetailsSettingsContent'
import AccountSettingsContent from './settings/AccountSettingsContent'
import PricingBillingSettingsContent from './settings/PricingBillingSettingsContent'

const settingsNavItems = [
  { id: 'general', label: 'General', icon: FineTuneIcon },
  { id: 'keyboard', label: 'Keyboard', icon: KeyboardIcon },
  { id: 'audio', label: 'Audio & Mic', icon: MicrophoneIcon },
  { id: 'performance', label: 'Performance', icon: LightningIcon },
  { id: 'advanced', label: 'Advanced', icon: CodeIcon },
]

const accountNavItems = [
  { id: 'my-details', label: 'My Details', icon: UserIcon },
  { id: 'account', label: 'Account', icon: UsersIcon },
  { id: 'pricing-billing', label: 'Plans and Billing', icon: CreditCardIcon },
]

const pageTitles: Record<string, string> = {
  general: 'General',
  keyboard: 'Keyboard',
  audio: 'Audio & Mic',
  performance: 'Performance',
  advanced: 'Advanced',
  'my-details': 'My Details',
  account: 'Account',
  'pricing-billing': 'Plans and Billing',
}

export default function SettingsContent() {
  const { settingsPage, setSettingsPage } = useMainStore()

  const renderSettingsContent = () => {
    switch (settingsPage) {
      case 'general':
        return <GeneralSettingsContent />
      case 'keyboard':
        return <KeyboardSettingsContent />
      case 'audio':
        return <AudioSettingsContent />
      case 'performance':
        return <PerformanceSettingsContent />
      case 'advanced':
        return <AdvancedSettingsContent />
      case 'my-details':
        return <MyDetailsSettingsContent />
      case 'account':
        return <AccountSettingsContent />
      case 'pricing-billing':
        return <PricingBillingSettingsContent />
      default:
        return <GeneralSettingsContent />
    }
  }

  return (
    <div className="flex h-full">
      {/* ── Settings Sidebar (260px) ── */}
      <div className="w-[260px] flex-shrink-0 flex flex-col justify-between py-6 px-5 border-r border-[#E8E8E8]">
        <div>
          <div className="text-xs font-semibold tracking-[1.5px] text-[#999] uppercase mb-3 px-3">
            Settings
          </div>
          <div className="flex flex-col gap-0.5">
            {settingsNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setSettingsPage(item.id as any)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer ${
                  settingsPage === item.id
                    ? 'bg-[#F2F2F2] font-medium text-[#1f1f1f]'
                    : 'text-[#666] hover:bg-[#F8F8F8] hover:text-[#333]'
                }`}
              >
                <item.icon />
                {item.label}
              </button>
            ))}
          </div>

          <div className="text-xs font-semibold tracking-[1.5px] text-[#999] uppercase mb-3 mt-6 px-3">
            Account
          </div>
          <div className="flex flex-col gap-0.5">
            {accountNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setSettingsPage(item.id as any)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer ${
                  settingsPage === item.id
                    ? 'bg-[#F2F2F2] font-medium text-[#1f1f1f]'
                    : 'text-[#666] hover:bg-[#F8F8F8] hover:text-[#333]'
                }`}
              >
                <item.icon />
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="text-xs text-[#aaa] px-3">App v0.2.3</div>
      </div>

      {/* ── Settings Content Area ── */}
      <div className="flex-1 py-6 px-10 overflow-y-auto">
        <h1 className="font-sans text-2xl font-semibold text-[#1f1f1f] mb-6">
          {pageTitles[settingsPage] ?? 'General'}
        </h1>
        <div>{renderSettingsContent()}</div>
      </div>
    </div>
  )
}

/* ── Settings Sidebar Icons (20×20) ── */

function FineTuneIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  )
}

function KeyboardIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" /><line x1="6" y1="8" x2="6" y2="8" />
      <line x1="10" y1="8" x2="10" y2="8" /><line x1="14" y1="8" x2="14" y2="8" />
      <line x1="18" y1="8" x2="18" y2="8" /><line x1="6" y1="12" x2="6" y2="12" />
      <line x1="10" y1="12" x2="10" y2="12" /><line x1="14" y1="12" x2="14" y2="12" />
      <line x1="18" y1="12" x2="18" y2="12" /><line x1="8" y1="16" x2="16" y2="16" />
    </svg>
  )
}

function MicrophoneIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  )
}

function LightningIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

function CodeIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="10" r="3" />
      <path d="M6.168 18.849A4 4 0 0 1 10 16h4a4 4 0 0 1 3.834 2.855" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function CreditCardIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  )
}
