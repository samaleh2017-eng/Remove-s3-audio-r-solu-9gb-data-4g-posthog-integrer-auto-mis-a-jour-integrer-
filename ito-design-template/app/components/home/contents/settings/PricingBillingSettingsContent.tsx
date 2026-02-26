export default function PricingBillingSettingsContent() {
  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <div className="rounded-xl bg-[#F2F2F2]">
        <div className="flex items-center justify-between py-4 px-5 border-b border-[#EBEBEB]">
          <div>
            <div className="text-sm font-medium text-[#1f1f1f]">Current Plan</div>
            <div className="text-[13px] text-[#888]">You are currently on the Pro trial.</div>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white">
            PRO TRIAL
          </span>
        </div>
        <div className="flex items-center justify-between py-4 px-5">
          <div>
            <div className="text-sm font-medium text-[#1f1f1f]">Trial ends</div>
            <div className="text-[13px] text-[#888]">March 15, 2026</div>
          </div>
          <button className="bg-warm-900 text-white border-0 hover:bg-warm-800 rounded-lg text-sm px-5 py-2.5 cursor-pointer">
            Upgrade to Pro
          </button>
        </div>
      </div>

      {/* Billing */}
      <div className="text-xs font-semibold tracking-[1.5px] text-[#999] uppercase">
        Billing
      </div>
      <div className="rounded-xl bg-[#F2F2F2]">
        <div className="py-8 px-5 text-center text-[13px] text-[#888]">
          No billing history available.
        </div>
      </div>
    </div>
  )
}
