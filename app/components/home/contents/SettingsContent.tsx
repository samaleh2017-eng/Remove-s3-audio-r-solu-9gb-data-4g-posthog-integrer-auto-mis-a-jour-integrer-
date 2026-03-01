import { useMainStore } from '@/app/store/useMainStore'
import GeneralSettingsContent from './settings/GeneralSettingsContent'
import AudioSettingsContent from './settings/AudioSettingsContent'
import AccountSettingsContent from './settings/AccountSettingsContent'
import KeyboardSettingsContent from './settings/KeyboardSettingsContent'
import AdvancedSettingsContent from './settings/AdvancedSettingsContent'
import PricingBillingSettingsContent from './settings/PricingBillingSettingsContent'
import MyDetailsSettingsContent from './settings/MyDetailsSettingsContent'
import PerformanceSettingsContent from './settings/PerformanceSettingsContent'
import {
  FineTune,
  Keyboard,
  Microphone,
  Code,
  UserCircle,
  Users,
  CreditCard,
  Lightning,
} from '@mynaui/icons-react'

const settingsNavItems = [
  { id: 'general', label: 'General', icon: FineTune },
  { id: 'keyboard', label: 'Keyboard', icon: Keyboard },
  { id: 'audio', label: 'Audio & Mic', icon: Microphone },
  { id: 'performance', label: 'Performance', icon: Lightning },
  { id: 'advanced', label: 'Advanced', icon: Code },
]

const accountNavItems = [
  { id: 'my-details', label: 'My Details', icon: UserCircle },
  { id: 'account', label: 'Account', icon: Users },
  { id: 'pricing-billing', label: 'Plans and Billing', icon: CreditCard },
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
      case 'pricing-billing':
        return <PricingBillingSettingsContent />
      case 'my-details':
        return <MyDetailsSettingsContent />
      case 'account':
        return <AccountSettingsContent />
      case 'advanced':
        return <AdvancedSettingsContent />
      default:
        return <GeneralSettingsContent />
    }
  }

  return (
    <div className="flex h-full flex-col md:flex-row">
      <div className="w-full md:w-[280px] flex-shrink-0 flex flex-col justify-between py-5 px-4 md:px-5 border-b md:border-b-0 md:border-r border-[var(--border)] bg-[var(--color-muted-bg)]">
        <div className="space-y-6">
          <div>
            <div className="text-xs font-semibold tracking-[1.5px] text-[var(--muted-foreground)] uppercase mb-3 px-2">
              Settings
            </div>
            <div className="grid grid-cols-2 md:flex md:flex-col gap-1">
              {settingsNavItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => setSettingsPage(item.id as any)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors cursor-pointer ${
                    settingsPage === item.id
                      ? 'bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] font-medium shadow-sm'
                      : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-foreground'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold tracking-[1.5px] text-[var(--muted-foreground)] uppercase mb-3 px-2">
              Account
            </div>
            <div className="grid grid-cols-2 md:flex md:flex-col gap-1">
              {accountNavItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => setSettingsPage(item.id as any)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors cursor-pointer ${
                    settingsPage === item.id
                      ? 'bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] font-medium shadow-sm'
                      : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-foreground'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="text-xs text-[var(--muted-foreground)] px-2">
          Ito v0.2.3
        </div>
      </div>

      <div className="flex-1 py-6 px-6 md:px-10 overflow-y-auto">
        <h1 className="font-sans text-2xl md:text-[28px] font-semibold text-foreground mb-6 tracking-tight">
          {pageTitles[settingsPage] ?? 'General'}
        </h1>
        <div>{renderSettingsContent()}</div>
      </div>
    </div>
  )
}
