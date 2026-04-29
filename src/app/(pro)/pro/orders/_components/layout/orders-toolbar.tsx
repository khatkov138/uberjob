"use client"

import * as React from "react"
import { LayoutList, Map as MapIcon, Target } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLocationStore } from "@/store/use-location-store"

interface OrdersToolbarProps {
  viewMode: "list" | "map"
  setViewMode: (mode: "list" | "map") => void
  city: string
}

export function OrdersToolbar({ viewMode, setViewMode, city }: OrdersToolbarProps) {
  const { radius, setRadius, openModal, _hasHydrated } = useLocationStore()

  return (
    <div className={cn(
      "flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 p-3 rounded-[2rem] border border-slate-100 transition-opacity duration-500",
      !_hasHydrated && "opacity-60 pointer-events-none"
    )}>
      
      {/* ПЕРЕКЛЮЧАТЕЛЬ ВИДА */}
      <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
        <button
          onClick={() => setViewMode("list")}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all font-black uppercase italic text-[10px] tracking-widest",
            viewMode === "list" ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-900"
          )}
        >
          <LayoutList size={14} /> Список
        </button>
        <button
          onClick={() => setViewMode("map")}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all font-black uppercase italic text-[10px] tracking-widest",
            viewMode === "map" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-900"
          )}
        >
          <MapIcon size={14} /> Карта
        </button>
      </div>

      {/* ЛОКАЦИЯ И РАДИУС */}
      <div className="flex items-center gap-3">
        <button 
          onClick={openModal} 
          className="flex items-center gap-2 font-black italic uppercase text-[10px] bg-white px-5 py-2.5 rounded-xl border border-slate-100 hover:border-blue-400 transition-all text-slate-900"
        >
          <Target size={14} className="text-blue-600" /> 
          {_hasHydrated ? city : "Загрузка..."}
        </button>

        <div className="flex bg-white p-1 rounded-xl border border-slate-100 shadow-sm gap-0.5">
          {[10, 30, 50, 100].map((r) => (
            <button
              key={r}
              onClick={() => setRadius(r)}
              className={cn(
                "px-3 py-1.5 text-[9px] font-black rounded-lg transition-all uppercase italic",
                _hasHydrated && radius === r ? "bg-blue-50 text-blue-600" : "text-slate-400 hover:text-slate-600"
              )}
            >
              {r}км
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
