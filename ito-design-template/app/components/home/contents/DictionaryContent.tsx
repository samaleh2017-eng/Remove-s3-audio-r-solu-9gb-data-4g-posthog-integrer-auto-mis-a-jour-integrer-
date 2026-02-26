export default function DictionaryContent() {
  return (
    <div className="max-w-3xl mx-auto px-8">
      <h1 className="text-2xl font-semibold text-[var(--color-text)] mb-6">Dictionary</h1>
      <div className="rounded-xl bg-[#F2F2F2]">
        <div className="flex items-center justify-between py-4 px-5 border-b border-[#EBEBEB]">
          <div>
            <div className="text-sm font-medium text-[#1f1f1f]">Custom Words</div>
            <div className="text-[13px] text-[#888]">Add words that Ito should recognize during dictation.</div>
          </div>
          <button className="bg-[#D9D9DE] border-0 text-[#1f1f1f] hover:bg-[#CDCDD2] rounded-lg text-sm px-5 py-2.5 cursor-pointer">
            Add Word
          </button>
        </div>
        <div className="py-8 px-5 text-center text-[13px] text-[#888]">
          No custom words yet. Add words to improve recognition accuracy.
        </div>
      </div>
    </div>
  )
}
