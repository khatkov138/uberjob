export function DashboardHeader({ name }: { name?: string | null }) {
  return (
    <header className="space-y-2 mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Dashboard</span>
        <div className="w-1 h-1 bg-blue-600 rounded-full animate-pulse" />
      </div>
      <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">
        Привет, <span className="text-blue-600">{name?.split(' ')[0] || "Друг"}</span>
      </h1>
    </header>
  )
}
