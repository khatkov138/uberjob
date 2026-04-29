"use client"

import * as React from "react"
import { Settings2, Zap, X, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLocationStore } from "@/store/use-location-store"

interface OrdersSidebarProps {
  stats: { total: number; matched: number }
  skills: any[]
  onAddClick: () => void
  onRemoveSkill: (id: string) => void
  isFetching?: boolean
}

export function OrdersSidebar({ stats, skills, onAddClick, onRemoveSkill, isFetching }: OrdersSidebarProps) {
  const { _hasHydrated } = useLocationStore()

  return (
    <div className="space-y-6">
      <header className="space-y-1 mb-8 px-2">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black text-blue-600 uppercase tracking-[0.3em]">PRO / FEED</span>
          <div className={cn("w-1 h-1 bg-blue-600 rounded-full", isFetching ? "animate-ping" : "animate-pulse")} />
        </div>
        <h1 className="text-5xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">
          Лента <span className="text-blue-600">PRO</span>
        </h1>
      </header>

      {/* СТАТИСТИКА */}
      <div className={cn(
        "bg-emerald-50 border border-emerald-100 p-8 rounded-[2rem] space-y-4 transition-all duration-500",
        !_hasHydrated && "opacity-50 grayscale animate-pulse pointer-events-none"
      )}>
        <div className="flex justify-between items-start">
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Подходящие задачи</p>
          <Zap className={cn("w-5 h-5 text-emerald-500 fill-current", isFetching && "animate-bounce")} />
        </div>
        <div className="flex items-baseline gap-2">
          {_hasHydrated ? (
            <>
              <p className="text-6xl font-black italic text-slate-900 tracking-tighter leading-none">{stats.matched}</p>
              <span className="text-sm font-black italic text-emerald-600 uppercase">из {stats.total}</span>
            </>
          ) : (
            <div className="h-12 w-32 bg-emerald-200/50 rounded-xl animate-pulse" />
          )}
        </div>
      </div>

      {/* СПЕЦИАЛИЗАЦИИ */}
      <div className={cn(
        "bg-slate-50 border border-slate-100 p-8 rounded-[2.5rem] space-y-6 transition-all duration-500",
        !_hasHydrated && "opacity-50 pointer-events-none"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-900">
            <Settings2 className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-black uppercase italic">Ваши ниши</h3>
          </div>
          <button 
            onClick={onAddClick}
            disabled={!_hasHydrated}
            className="p-2 bg-white rounded-xl border border-slate-100 text-blue-600 hover:shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            <Plus size={14} />
          </button>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {_hasHydrated ? (
             skills.map((skill) => (
              <div key={skill.categoryId} className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-[10px] font-bold text-slate-600 uppercase italic animate-in fade-in zoom-in">
                {skill.category?.name}
                <button onClick={() => onRemoveSkill(skill.categoryId)} className="hover:text-red-500 transition-colors">
                  <X size={12} />
                </button>
              </div>
            ))
          ) : (
            [1, 2, 3].map(i => <div key={i} className="h-8 w-20 bg-slate-200 rounded-xl animate-pulse" />)
          )}
        </div>
      </div>
    </div>
  )
}
