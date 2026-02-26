import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Titlebar } from './Titlebar'

interface WindowInitProps {
  width: number
  height: number
  maximizable: boolean
  minimizable: boolean
  platform: string
}

interface WindowContextProps {
  window: WindowInitProps
}

const WindowContext = createContext<WindowContextProps | undefined>(undefined)

export function WindowContextProvider({ children }: { children: ReactNode }) {
  const [initProps, setInitProps] = useState<WindowInitProps>({
    width: 1270,
    height: 800,
    maximizable: true,
    minimizable: true,
    platform: detectPlatform(),
  })

  useEffect(() => {
    if (window.api?.invoke) {
      window.api
        .invoke('init-window')
        .then((value: WindowInitProps) => setInitProps(value))
        .catch(() => {})
    }

    const parent = document.querySelector('.window-content')?.parentElement
    if (parent) parent.classList.add('window-frame')
  }, [])

  return (
    <WindowContext.Provider value={{ window: initProps }}>
      <Titlebar />
      <div className="window-content">{children}</div>
    </WindowContext.Provider>
  )
}

export function useWindowContext() {
  const context = useContext(WindowContext)
  if (!context) {
    throw new Error('useWindowContext must be used within WindowContextProvider')
  }
  return context
}

function detectPlatform(): string {
  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes('win')) return 'win32'
  if (ua.includes('mac')) return 'darwin'
  return 'linux'
}
