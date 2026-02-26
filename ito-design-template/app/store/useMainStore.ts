import { create } from 'zustand'

export type PageType =
  | 'home'
  | 'dictionary'
  | 'notes'
  | 'app-styling'
  | 'settings'
  | 'about'

export type SettingsPageType =
  | 'general'
  | 'keyboard'
  | 'audio'
  | 'performance'
  | 'my-details'
  | 'account'
  | 'advanced'
  | 'pricing-billing'

interface MainStore {
  navExpanded: boolean
  currentPage: PageType
  settingsPage: SettingsPageType
  toggleNavExpanded: () => void
  setCurrentPage: (page: PageType) => void
  setSettingsPage: (page: SettingsPageType) => void
}

export const useMainStore = create<MainStore>((set) => ({
  navExpanded: true,
  currentPage: 'home',
  settingsPage: 'general',
  toggleNavExpanded: () =>
    set((state) => ({ navExpanded: !state.navExpanded })),
  setCurrentPage: (page: PageType) => set({ currentPage: page }),
  setSettingsPage: (page: SettingsPageType) => set({ settingsPage: page }),
}))
