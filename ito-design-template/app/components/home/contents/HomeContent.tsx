export default function HomeContent() {
  return (
    <div className="max-w-3xl mx-auto px-8">
      {/* Welcome Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-[var(--color-text)]">
          Welcome back, User
        </h1>
        <div className="flex items-center gap-3">
          <StatBadge icon="🔥" label="0 days" />
          <StatBadge icon="✍️" label="2 941 words" />
          <StatBadge icon="⚡" label="106 WPM" />
        </div>
      </div>

      {/* Feature Card */}
      <div className="bg-white rounded-xl border border-[var(--border)] shadow-card p-5 mb-8 flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-[var(--color-text)] mb-1">
            Voice dictation in any app
          </div>
          <div className="text-[13px] text-[#888]">
            Hold down the trigger key <kbd className="px-1.5 py-0.5 bg-warm-100 rounded text-xs font-mono">alt ◄</kbd> and speak into any textbox.
          </div>
        </div>
        <button className="px-4 py-2 bg-white border border-warm-200 rounded-lg text-sm font-medium hover:bg-warm-50 transition-colors cursor-pointer">
          Explore use cases
        </button>
      </div>

      {/* Recent Activity */}
      <div className="mb-4">
        <div className="text-xs font-semibold tracking-[1.5px] text-[#999] uppercase mb-3">
          Recent Activity
        </div>
        <div className="text-xs font-semibold tracking-[1.5px] text-[#999] uppercase mb-4">
          Yesterday
        </div>
      </div>

      {/* Activity List */}
      <div className="flex flex-col gap-1">
        <ActivityRow time="2:32 PM" text="Alle finden es gut, aber meins." />
        <ActivityRow time="2:31 PM" text="Salut Sarah." />
        <ActivityRow time="2:31 PM" text="Je comprends. C'est l'erreur celle-ci." />
        <ActivityRow time="2:30 PM" text="Salut, ça va, j'espère que tu vas bien." />
        <ActivityRow time="2:30 PM" text="Anne a fini d'harmoniser." />
        <ActivityRow time="2:30 PM" text="Euh, fils d'Anka, fils الوقت القديم." />
        <ActivityRow time="2:29 PM" text="I tell your friends pour qu'ils soient bien jalouses envoyer tous les documents." />
      </div>
    </div>
  )
}

function StatBadge({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-warm-200 rounded-full text-sm cursor-pointer hover:shadow-sm transition-shadow">
      <span>{icon}</span>
      <span className="text-[var(--color-text)] font-medium">{label}</span>
    </div>
  )
}

function ActivityRow({ time, text }: { time: string; text: string }) {
  return (
    <div className="flex items-start gap-6 py-3 px-4 rounded-lg hover:bg-warm-50 transition-colors group cursor-pointer">
      <span className="text-[13px] text-[#999] whitespace-nowrap pt-0.5">{time}</span>
      <span className="text-sm text-[var(--color-text)] leading-relaxed">{text}</span>
    </div>
  )
}
