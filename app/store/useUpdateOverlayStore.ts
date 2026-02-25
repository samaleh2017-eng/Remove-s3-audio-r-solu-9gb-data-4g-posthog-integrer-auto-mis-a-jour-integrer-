import { create } from 'zustand'

interface UpdateOverlayState {
  visible: boolean
  version: string | null
  show: (version?: string | null) => void
  hide: () => void
}

export const useUpdateOverlayStore = create<UpdateOverlayState>((set) => ({
  visible: false,
  version: null,
  show: (version = null) => set({ visible: true, version }),
  hide: () => set({ visible: false, version: null }),
}))
