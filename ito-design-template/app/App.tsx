import './styles/globals.css'
import './styles/window.css'
import { WindowContextProvider } from './components/window/WindowContext'
import HomeKit from './components/home/HomeKit'

export default function App() {
  return (
    /*
     * LAYOUT UNIFIÉ :
     * WindowContextProvider crée le .window-frame (fond #ffffff)
     * qui contient le Titlebar (même fond #ffffff) et le window-content.
     * HomeKit contient le Sidebar (transparent → hérite #ffffff)
     * et la Content Card (fond #fafafa avec border-radius + shadow).
     *
     * Résultat : Titlebar + Sidebar + fond = UN SEUL PLAN BLANC.
     * La Content Card flotte par-dessus.
     */
    <WindowContextProvider>
      <HomeKit />
    </WindowContextProvider>
  )
}
