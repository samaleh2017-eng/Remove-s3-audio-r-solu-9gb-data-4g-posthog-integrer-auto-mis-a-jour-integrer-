export default function AppStylingContent() {
  return (
    <div className="max-w-3xl mx-auto px-8">
      <h1 className="text-2xl font-semibold text-[var(--color-text)] mb-6">App Styling</h1>
      <div className="rounded-xl bg-[#F2F2F2]">
        <div className="flex items-center justify-between py-4 px-5 border-b border-[#EBEBEB]">
          <div>
            <div className="text-sm font-medium text-[#1f1f1f]">Theme</div>
            <div className="text-[13px] text-[#888]">Choose your preferred visual theme.</div>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-white border border-warm-200 rounded-lg text-sm font-medium cursor-pointer">Light</button>
            <button className="px-4 py-2 bg-warm-900 text-white border border-warm-800 rounded-lg text-sm font-medium cursor-pointer">Dark</button>
          </div>
        </div>
        <div className="flex items-center justify-between py-4 px-5">
          <div>
            <div className="text-sm font-medium text-[#1f1f1f]">Accent Color</div>
            <div className="text-[13px] text-[#888]">Customize your app accent color.</div>
          </div>
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-purple-500 cursor-pointer ring-2 ring-offset-2 ring-purple-500" />
            <div className="w-7 h-7 rounded-full bg-blue-500 cursor-pointer" />
            <div className="w-7 h-7 rounded-full bg-green-500 cursor-pointer" />
            <div className="w-7 h-7 rounded-full bg-orange-500 cursor-pointer" />
          </div>
        </div>
      </div>
    </div>
  )
}
