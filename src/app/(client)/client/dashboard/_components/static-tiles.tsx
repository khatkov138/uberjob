import Link from "next/link"
import { MessageSquare, ClipboardList, Settings, ArrowUpRight } from "lucide-react"

export function StaticTiles() {
  return (
    <>
      {/* ЧАТ (Черная плитка) */}
      <Link href="/chat" className="group">
        <div className="h-full min-h-[220px] rounded-[2.5rem] p-8 bg-slate-900 text-white transition-all duration-500 flex flex-col justify-between hover:shadow-xl hover:shadow-slate-200">
          <div className="flex justify-between items-start">
            <div className="p-4 rounded-2xl bg-white/10 transition-transform duration-500 group-hover:scale-110">
              <MessageSquare className="w-8 h-8" />
            </div>
            {/* Индикатор уведомлений - тоже статика */}
            <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse" />
          </div>
          <div>
            <h3 className="text-3xl font-black uppercase italic tracking-tighter leading-none mb-1 text-white">Чат</h3>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 italic text-white/60">Связь с мастерами</p>
          </div>
        </div>
      </Link>

      {/* ИСТОРИЯ (Светлая плитка) */}
      <Link href="/client/history" className="group">
        <div className="h-full min-h-[220px] rounded-[2.5rem] p-8 bg-slate-50 text-slate-900 border-2 border-slate-100 transition-all duration-500 flex flex-col justify-between hover:bg-white hover:shadow-lg">
          <div className="flex justify-between items-start">
            <div className="p-4 rounded-2xl bg-white shadow-sm transition-transform duration-500 group-hover:scale-110 border border-slate-100">
              <ClipboardList className="w-8 h-8 text-slate-900" />
            </div>
            <ArrowUpRight className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
          </div>
          <div>
            <h3 className="text-3xl font-black uppercase italic tracking-tighter leading-none mb-1">История</h3>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 italic text-slate-400">Архив выполненных работ</p>
          </div>
        </div>
      </Link>

      {/* НАСТРОЙКИ (Светлая плитка) */}
      <Link href="/client/settings" className="group">
        <div className="h-full min-h-[220px] rounded-[2.5rem] p-8 bg-slate-50 text-slate-900 border-2 border-slate-100 transition-all duration-500 flex flex-col justify-between hover:bg-white hover:shadow-lg">
          <div className="flex justify-between items-start">
            <div className="p-4 rounded-2xl bg-white shadow-sm transition-transform duration-500 group-hover:scale-110 border border-slate-100">
              <Settings className="w-8 h-8 text-slate-900" />
            </div>
            <ArrowUpRight className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
          </div>
          <div>
            <h3 className="text-3xl font-black uppercase italic tracking-tighter leading-none mb-1">Настройки</h3>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 italic text-slate-400">Профиль и безопасность</p>
          </div>
        </div>
      </Link>
    </>
  )
}
