import { ReactNode } from 'react'

interface SettingRowProps {
  children: ReactNode
  last?: boolean
}

export function SettingRow({ children, last }: SettingRowProps) {
  return (
    <div
      className={`flex items-center justify-between py-4 px-5 ${
        !last ? 'border-b border-[#EBEBEB]' : ''
      }`}
    >
      {children}
    </div>
  )
}
