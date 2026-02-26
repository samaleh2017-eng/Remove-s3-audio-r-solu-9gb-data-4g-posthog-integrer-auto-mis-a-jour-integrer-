export default function AboutContent() {
  return (
    <div className="max-w-3xl mx-auto px-8">
      <h1 className="text-2xl font-semibold text-[var(--color-text)] mb-6">About</h1>
      <div className="rounded-xl bg-[#F2F2F2]">
        <div className="flex items-center justify-between py-4 px-5 border-b border-[#EBEBEB]">
          <div className="text-sm font-medium text-[#1f1f1f]">Version</div>
          <div className="text-sm text-[#888]">0.2.3</div>
        </div>
        <div className="flex items-center justify-between py-4 px-5 border-b border-[#EBEBEB]">
          <div className="text-sm font-medium text-[#1f1f1f]">License</div>
          <div className="text-sm text-[#888]">Proprietary</div>
        </div>
        <div className="flex items-center justify-between py-4 px-5">
          <div className="text-sm font-medium text-[#1f1f1f]">Website</div>
          <a href="#" className="text-sm text-blue-500 hover:underline">ito.app</a>
        </div>
      </div>
    </div>
  )
}
