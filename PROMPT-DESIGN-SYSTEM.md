# Prompt Agent — Reproduire le Design System UI/UX "Ito-Style"

## Contexte

Tu dois intégrer un design system complet de type desktop-app premium dans mon application. Le design est inspiré de l'application "Ito" — une app Electron minimaliste et moderne. Tu ne dois PAS copier les données ni la logique métier. Tu dois reproduire UNIQUEMENT l'architecture UI/UX, le layout, les couleurs, les ombres, les espacements et les comportements visuels décrits ci-dessous.

L'application utilise **React + TypeScript + Tailwind CSS + Radix UI (shadcn/ui, style "new-york")**.

---

## 1. Architecture Générale du Layout

### RÈGLE FONDAMENTALE — Layout Unifié

> **Le Titlebar, le Sidebar et le fond derrière la Content Card sont TOUS dans le MÊME layout et partagent le MÊME background plat (`#ffffff`).** Il n'y a PAS de séparation visuelle entre eux — ils forment un seul bloc blanc continu. Seule la Content Card a un background légèrement différent (`#fafafa`) avec des coins arrondis et une ombre, ce qui crée un effet "carte flottante posée sur un bureau blanc".

Visuellement, ça donne :

```
┌─ MÊME BACKGROUND BLANC (#ffffff) PARTOUT ────────────────────┐
│                                                                │
│                    TITLEBAR (48px)                              │
│  [UserIcon]                         [Notifications] [─ □ ✕]   │
│                                                                │
│  ┌─ SIDEBAR ─┐  ┌─ CONTENT CARD (#fafafa, arrondie) ───────┐ │
│  │            │  │                                           │ │
│  │  Logo      │  │     Contenu scrollable                    │ │
│  │  Home      │  │     avec padding-top: 40px                │ │
│  │  Dict      │  │                                           │ │
│  │  Notes     │  │     Welcome back, User                    │ │
│  │  Settings  │  │     [Stats] [Activity list]               │ │
│  │  About     │  │                                           │ │
│  │            │  │                                           │ │
│  │  [Collapse]│  │                                           │ │
│  └────────────┘  └───────────────────────────────────────────┘ │
│                   ↑ margin: 8px top/bottom/right               │
│                   ↑ border-radius: 20px                        │
│                   ↑ shadow: 0 8px 24px rgba(31,31,31,0.06)    │
└────────────────────────────────────────────────────────────────┘
```

### Détail de la hiérarchie visuelle

1. **Le frame global** (`window-frame`) : `display: flex; flex-direction: column; height: 100%; background: #ffffff`
2. **Le Titlebar** : première ligne, `height: 48px`, **même background #ffffff** que le frame → visuellement fondu avec le sidebar et le fond
3. **Le conteneur sous le titlebar** (`window-content`) : `flex: 1`, contient le layout horizontal
4. **Le layout horizontal** : `display: flex; height: 100%; background: var(--background)` = `#ffffff`
   - **Sidebar** (à gauche) : fond **transparent** → hérite du `#ffffff` parent
   - **Content Card** (à droite) : fond `#fafafa`, `border-radius: 20px`, `margin: 8px` (top, bottom, right), `shadow-soft` → **elle seule** se détache visuellement

> **Résultat visuel** : le titlebar, le sidebar et l'espace autour de la card sont UN SEUL PLAN BLANC. La card flotte par-dessus avec ses coins arrondis et son ombre légère. C'est l'effet "page dans une page".

### Structure HTML

```tsx
{/* NIVEAU 1 — Frame global : fond #ffffff */}
<div className="window-frame">          {/* flex column, h-full, bg #ffffff */}

  {/* NIVEAU 2 — Titlebar : même fond #ffffff, h-48px */}
  <Titlebar />

  {/* NIVEAU 3 — Contenu sous le titlebar */}
  <div className="window-content">      {/* flex-1, overflow auto */}

    {/* NIVEAU 4 — Layout horizontal : sidebar + card */}
    <div className="flex h-full bg-[var(--background)]">   {/* bg #ffffff */}

      {/* Sidebar : fond transparent (hérite #ffffff), 224px ou 72px */}
      <Sidebar />

      {/* Content Card : fond #fafafa, arrondie, ombre, margin 8px */}
      <MainContentCard />

    </div>
  </div>
</div>
```

### Pourquoi c'est important

Si tu mets un background différent sur le sidebar ou le titlebar, l'effet "carte flottante" sera cassé. Le sidebar et le titlebar doivent être INVISIBLES visuellement — seul leur CONTENU (icônes, texte, boutons) les distingue. Le fond doit être uniforme `#ffffff` partout sauf dans la content card (`#fafafa`).

---

## 2. Titlebar (Header Horizontal)

### Dimensions & Positionnement
- **Hauteur** : `48px` (`--window-titlebar-height: 48px`)
- **Position** : en haut de la fenêtre, `display: flex`, `justify-content: space-between`
- **Draggable** : `-webkit-app-region: drag` (tout le titlebar est draggable sauf les boutons)
- **Background** : même que le background principal (`var(--background)` = `#ffffff`)
- **Border bottom** : `transparent` (pas de bordure visible quand l'app est chargée)

### Contenu Gauche
- Un espaceur qui s'aligne avec la largeur du sidebar : `w-56` (224px) si sidebar expanded, `w-[72px]` si collapsed
- Un bouton icône **User** (`UserCircle`, 20×20px) dans un conteneur 36×30px avec `border-radius: 6px`, hover `bg-warm-200`
- Au clic : dropdown avec "Settings" et "Sign Out" (dropdown `w-48`, `rounded-lg`, `shadow-lg`, `border border-warm-100`)

### Contenu Droite
- Bouton **Notifications** (icône `Bell`, 16×16px) dans un conteneur 32×32px, `rounded-lg`, hover `bg-warm-100`
- **Window Controls** (Windows uniquement, masqués sur macOS) :
  - 3 boutons SVG : Minimize, Maximize/Restore, Close
  - Chaque bouton : `width: 46px`, `height: 48px` (même que titlebar)
  - Hover minimize/maximize : `background: rgba(0,0,0,0.1)`
  - Hover close : `background: #ff453b`, `color: #fff`
  - SVG icons : `width: 10px`, `height: 10px`

---

## 3. Sidebar (Navigation Verticale Gauche)

### Dimensions
- **Largeur expanded** : `w-56` = `224px`
- **Largeur collapsed** : `w-[72px]` = `72px`
- **Transition** : `transition-all duration-200 ease-in-out`
- **Padding** : `py-5 px-3` (20px vertical, 12px horizontal)
- **flex-shrink-0** : la sidebar ne se compresse jamais

### Logo (en haut)
- Conteneur : `flex items-center px-3 mb-10`
- Icône SVG du logo : `w-6` (24px) dans un flex-center, `flex-shrink-0`
- Texte du nom : `text-2xl font-bold font-sans`, apparaît/disparaît avec `transition-opacity duration-100`
- Badge PRO (optionnel) : `text-xs font-semibold px-2 py-0.5 rounded-md bg-gradient-to-r from-purple-500 to-pink-500 text-white`

### Items de Navigation
- Conteneur : `flex flex-col gap-1 text-sm`
- Chaque NavItem :
  - Conteneur : `flex items-center px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-180`
  - Icône : `w-5 h-5` (20×20px) dans un conteneur `w-6` centré
  - Label : `ml-3` quand visible, `opacity-0 w-0 overflow-hidden` quand collapsed
  - **État actif** : `bg-[var(--sidebar-active)]` (#D9D9DE) + `text-[var(--sidebar-active-text)]` (#1f1f1f) + `font-medium` + `shadow-sm`
  - **État inactif** : `text-[var(--foreground)]` + hover `bg-[var(--muted)]` (#f5f5f5)
- Quand sidebar collapsed : un **Tooltip** apparaît à droite (`side="right"`, `sideOffset={2}`)

### Bouton Collapse/Expand (en bas)
- Même style NavItem
- Icône : `PanelLeft` (20×20px)
- Label : "Collapse" si expanded, "Expand" si collapsed
- Positionné en bas avec `justify-between` sur le flex parent

### Animation de texte
- **Expand** : la sidebar slide d'abord (width transition), puis le texte apparaît après 75ms (`setTimeout`)
- **Collapse** : le texte disparaît immédiatement (`setShowText(false)`), puis la sidebar slide

---

## 4. Main Content Card (Zone de Contenu Principal)

### Dimensions & Style
- `flex-1` (occupe tout l'espace restant)
- **Background** : `var(--color-surface)` = `#fafafa`
- **Border radius** : `var(--radius-lg)` = `20px`
- **Margin** : `my-2 mr-2` (8px top/bottom, 8px right) — crée l'effet "carte flottante"
- **Shadow** : `var(--shadow-soft)` = `0 8px 24px rgba(31,31,31,0.06)`
- **Border** : `border border-[var(--border)]` = `1px solid rgba(31,31,31,0.04)`
- **Overflow** : `overflow-hidden` sur le conteneur, `overflow-y-auto` sur le contenu interne
- **Padding top du contenu** : `pt-10` (40px)

### Structure interne
```tsx
<div className="flex-1 bg-[var(--color-surface)] rounded-[var(--radius-lg)] my-2 mr-2 shadow-[var(--shadow-soft)] overflow-hidden flex flex-col border border-[var(--border)]">
  <div className="flex-1 overflow-y-auto pt-10">
    {/* Contenu de la page ici */}
  </div>
</div>
```

---

## 5. Page Settings (Dialog Fenêtre ~85% de l'écran)

Les Settings ne s'affichent PAS dans le main content. Ils s'ouvrent dans un **Dialog modal** par-dessus tout.

### Dialog Container
- **Composant** : Radix UI `Dialog` (via shadcn/ui)
- **Largeur** : `max-w-[1100px] w-[95vw]`
- **Hauteur** : `h-[85vh]`
- **Padding** : `p-0`
- **Border radius** : `rounded-2xl` (16px)
- **Border** : `border border-[#E8E8E8]`
- **Background** : `bg-white`
- **Shadow** : `0 24px 80px rgba(0,0,0,0.12)` (ombre profonde)
- **Overlay** : `bg-black/50` (fond semi-transparent noir 50%)
- **Animation** : fade-in + zoom-in-95 à l'ouverture, inverse à la fermeture
- **Pas de bouton close** intégré (`showCloseButton={false}`), fermeture par clic sur overlay

### Layout Interne Settings (2 colonnes)
```
┌─────────────────────────────────────────────────────────┐
│  Settings Dialog (1100px max, 85vh)                      │
├──────────────┬──────────────────────────────────────────┤
│              │                                            │
│  SIDEBAR     │    CONTENT AREA                            │
│  (260px)     │    (flex-1, scroll)                        │
│              │                                            │
│  SETTINGS    │    Titre de la page (24px, semibold)       │
│  ─ General   │    margin-bottom: 24px                     │
│  ─ Keyboard  │                                            │
│  ─ Audio     │    [Setting Groups en cards]               │
│  ─ Perf      │                                            │
│  ─ Advanced  │                                            │
│              │                                            │
│  ACCOUNT     │                                            │
│  ─ Details   │                                            │
│  ─ Account   │                                            │
│  ─ Billing   │                                            │
│              │                                            │
│  v0.2.3      │                                            │
├──────────────┴──────────────────────────────────────────┤
└─────────────────────────────────────────────────────────┘
```

### Sidebar Settings (260px)
- `w-[260px] flex-shrink-0`
- Padding : `py-6 px-5` (24px vertical, 20px horizontal)
- Border droite : `border-r border-[#E8E8E8]`
- **Section labels** : `text-xs font-semibold tracking-[1.5px] text-[#999] uppercase mb-3 px-3`
  - Exemples : "SETTINGS", "ACCOUNT"
- **Nav items** :
  - `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer`
  - **Actif** : `bg-[#F2F2F2] font-medium text-[#1f1f1f]`
  - **Inactif** : `text-[#666]` + hover `bg-[#F8F8F8] text-[#333]`
  - Icône : `w-5 h-5` (20×20px)
  - Gap entre items : `gap-0.5` (2px)
  - Gap entre sections : `mt-6` (24px)
- **Version** en bas : `text-xs text-[#aaa] px-3`

### Content Area Settings
- `flex-1 py-6 px-10 overflow-y-auto` (24px vertical, 40px horizontal)
- **Titre** : `font-sans text-2xl font-semibold text-[#1f1f1f] mb-6`

### Setting Groups (Cards)
- **Conteneur** : `rounded-xl bg-[#F2F2F2]` (border-radius 12px, fond gris clair)
- **Chaque SettingRow** :
  - `flex items-center justify-between py-4 px-5`
  - Séparateur : `border-b border-[#EBEBEB]` (sauf le dernier : pas de border)
  - **Label** : `text-sm font-medium text-[#1f1f1f]`
  - **Description** : `text-[13px] text-[#888]`
  - **Contrôle** (côté droit) : Switch toggle, bouton, dropdown, etc.
- **Boutons d'action** dans les settings :
  - Style : `bg-[#D9D9DE] border-0 text-[#1f1f1f] hover:bg-[#CDCDD2] rounded-lg text-sm px-5 py-2.5`
  - Style destructif (ex: "Delete account") : `text-sm text-red-400 hover:text-red-500 bg-transparent border-0`

### Sub-Dialogs (Confirmation)
- Dialog imbriqué avec `sm:max-w-md`
- Header avec titre rouge pour les actions destructives
- Footer avec boutons `Cancel` (outline) + `Delete` (destructive)

---

## 6. Design Tokens Complets

### Palette de Couleurs (Light Mode)
```css
--background: #ffffff;
--foreground: #1f1f1f;
--card: #fafafa;
--card-foreground: #1f1f1f;
--primary: #F2F2F2;
--primary-foreground: #1f1f1f;
--secondary: #D9D9DE;
--secondary-foreground: #1f1f1f;
--muted: #f5f5f5;
--muted-foreground: rgba(31,31,31,0.65);
--accent: #fafafa;
--accent-foreground: #1f1f1f;
--destructive: hsl(0 84.2% 60.2%);
--border: rgba(31,31,31,0.04);
--input: rgba(31,31,31,0.08);
--ring: #D9D9DE;
--sidebar-background: #fafafa;
--sidebar-active: #D9D9DE;
--sidebar-active-text: #1f1f1f;
```

### Palette de Couleurs (Dark Mode)
```css
--background: #0a0a0a;
--foreground: #fafafa;
--card: #141414;
--primary: #fafafa;
--primary-foreground: #0a0a0a;
--secondary: #1a1a1a;
--muted: #1a1a1a;
--muted-foreground: rgba(250,250,250,0.65);
--border: rgba(250,250,250,0.06);
--input: rgba(250,250,250,0.1);
--sidebar-background: #141414;
--sidebar-active: #fafafa;
--sidebar-active-text: #0a0a0a;
```

### Palette "Warm" (Tailwind)
```
warm-50:  #fafafa    warm-100: #f5f5f5    warm-200: #e5e5e5
warm-300: #d4d4d4    warm-400: #a3a3a3    warm-500: #737373
warm-600: #525252    warm-700: #404040    warm-800: #262626
warm-900: #171717    warm-950: #0a0a0a
```

### Ombres
```css
--shadow-soft: 0 8px 24px rgba(31,31,31,0.06);   /* main content card */
--shadow-card: 0 4px 12px rgba(31,31,31,0.05);    /* cards internes */
/* Settings dialog: */ 0 24px 80px rgba(0,0,0,0.12);
```

### Border Radius
```css
--radius: 20px;          /* = --radius-lg, pour la main content card */
--radius-md: 18px;       /* calc(var(--radius) - 2px) */
--radius-sm: 16px;       /* calc(var(--radius) - 4px) */
/* Setting groups: */ border-radius: 12px (rounded-xl)
/* Boutons/inputs: */ border-radius: 8px (rounded-lg)
/* Nav items: */ border-radius: 12px (rounded-xl)
/* Settings dialog: */ border-radius: 16px (rounded-2xl)
```

### Typographie
```css
font-family: 'Inter', system-ui, sans-serif;
/* Titres secondaires: */ 'Playfair Display', Georgia, serif;
```
| Usage | Taille | Poids | Couleur |
|-------|--------|-------|---------|
| Logo "ito" | text-2xl (24px) | font-bold (700) | foreground |
| Page title (settings) | text-2xl (24px) | font-semibold (600) | #1f1f1f |
| Section label | text-xs (12px) | font-semibold (600), tracking-[1.5px], uppercase | #999 |
| Nav item | text-sm (14px) | normal / font-medium si actif | foreground / #666 |
| Setting label | text-sm (14px) | font-medium (500) | #1f1f1f |
| Setting description | 13px | normal (400) | #888 |
| Version | text-xs (12px) | normal | #aaa |
| Badge PRO | text-xs (12px) | font-semibold (600) | white sur gradient |

### Scrollbar
```css
/* Light mode */
scrollbar-width: thin;
scrollbar-color: #d4d4d4 transparent;
/* thumb: */ #d4d4d4, border-radius: 9999px;
/* thumb hover: */ #a3a3a3;

/* Dark mode */
scrollbar-color: rgb(64,64,64) transparent;
```

---

## 7. Composants UI à Implémenter

### NavItem (réutilisable)
```tsx
interface NavItemProps {
  icon: ReactNode      // Icône 20x20px
  label: string        // Texte du lien
  isActive?: boolean   // État actif (surlignage)
  showText: boolean    // Afficher/masquer le texte (sidebar collapse)
  onClick?: () => void
}
```
- Quand `showText=false` : afficher un Tooltip (Radix) à droite
- Transition opacity sur le label : `duration-100`

### SettingRow (réutilisable)
```tsx
interface SettingRowProps {
  children: ReactNode
  last?: boolean   // Si true, pas de border-bottom
}
```
- Layout : flex, items-center, justify-between, py-4 px-5
- Border : `border-b border-[#EBEBEB]` sauf si `last`

### Dialog (shadcn/ui + Radix)
- Utiliser `@radix-ui/react-dialog`
- Overlay : `bg-black/50`, animations fade-in/fade-out
- Content : centré fixe (`top-50% left-50% translate(-50%,-50%)`), `z-50`
- Animations : `zoom-in-95` / `zoom-out-95` + `fade-in-0` / `fade-out-0`, `duration-200`

### Inputs dans les Settings
```css
/* Champ texte */
width: 320px (w-80);
background: white;
border: 1px solid var(--border);
border-radius: 8px;
padding: 12px 16px (px-4 py-3);
font-size: 14px;
focus: ring-2 ring-[var(--ring)], border transparent;
```

---

## 8. State Management pour la Navigation

```tsx
// Store Zustand
interface MainStore {
  navExpanded: boolean           // Sidebar expanded/collapsed
  currentPage: PageType          // 'home' | 'dictionary' | 'notes' | 'settings' | etc.
  settingsPage: SettingsPageType // 'general' | 'keyboard' | 'audio' | etc.
  toggleNavExpanded: () => void
  setCurrentPage: (page: PageType) => void
  setSettingsPage: (page: SettingsPageType) => void
}
```

- `currentPage === 'settings'` → ouvre le Dialog modal
- Quand le Dialog se ferme → `setCurrentPage('home')`
- `navExpanded` est persisté dans le store local

---

## 9. Responsive & Performance

### Fenêtre Electron
- **Taille par défaut** : `1270 × 800px`
- **Taille minimum** : `900 × 600px`
- `frame: false` (pas de barre native)
- `titleBarStyle: 'hiddenInset'` (macOS)
- `trafficLightPosition: { x: 20, y: 17 }` (macOS)

### Comportement responsive
- Le sidebar se collapse à `72px` pour donner plus d'espace au contenu
- Le main content card est en `flex-1` et s'adapte automatiquement
- Les settings utilisent `w-[95vw]` et `max-w-[1100px]` pour s'adapter

### Performance CSS
- Utiliser `will-change: width` uniquement pendant la transition du sidebar (pas en permanence)
- Supporter les tiers de performance via `data-perf-tier` sur le `<html>` :
  - `low` : désactiver shadows, blur, transitions
  - `balanced` : shadows allégées
  - `high`/`ultra` : tout activé
- `@media (prefers-reduced-motion: reduce)` : désactiver toutes les animations

---

## 10. Ce que Tu Dois Faire

1. **Créer le layout principal** : Titlebar + Sidebar + Main Content Card dans un seul conteneur flex
2. **Implémenter la sidebar collapsible** avec animation fluide et tooltips
3. **Implémenter le titlebar custom** avec window controls (minimize, maximize, close)
4. **Implémenter le Settings Dialog** comme modal overlay avec sidebar interne et navigation par tabs
5. **Appliquer tous les design tokens** (couleurs, ombres, radius, typo) via CSS variables
6. **Supporter light + dark mode** via la classe `.dark` sur `:root`
7. **Utiliser les composants shadcn/ui** (Dialog, Switch, Button, Tooltip) avec le style "new-york"
8. **Tester la responsivité** : sidebar collapse, dialog resize, scroll du contenu
9. **Ne PAS inclure de données métier** — utilise des placeholders pour le contenu
10. **Respecter exactement les dimensions** listées dans ce document (48px titlebar, 224/72px sidebar, 20px radius, etc.)

---

## Résumé des Fichiers à Créer/Modifier

| Fichier | Rôle |
|---------|------|
| `globals.css` | Design tokens CSS variables (light + dark) |
| `window.css` | Styles titlebar, controls, scrollbar |
| `tailwind.config.js` | Palette warm, shadows soft/card, radius premium |
| `App.tsx` | Router + WindowContextProvider |
| `WindowContext.tsx` | Context + Titlebar + WindowContent wrapper |
| `Titlebar.tsx` | Header avec user dropdown + window controls |
| `HomeKit.tsx` | Layout principal (sidebar + main card) |
| `NavItem.tsx` | Composant nav réutilisable avec tooltip |
| `SettingsContent.tsx` | Layout settings avec sidebar tabs |
| `SettingRow.tsx` | Composant row réutilisable pour les settings |
| `useMainStore.ts` | State Zustand pour navigation |
| `dialog.tsx` | Composant Dialog (shadcn/ui) |
