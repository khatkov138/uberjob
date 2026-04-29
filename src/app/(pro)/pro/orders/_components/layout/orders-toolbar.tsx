"use client"

import * as React from "react"
import { List, Map as MapIcon, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLocationStore } from "@/store/use-location-store"

interface OrdersToolbarProps {
  viewMode: "list" | "map"
  setViewMode: (mode: "list" | "map") => void
  city: string
}

export function OrdersToolbar({ viewMode, setViewMode, city }: OrdersToolbarProps) {
  // Используем setState для открытия модалки, раз в деструктуризации только isModalOpen
  const { radius, setRadius } = useLocationStore()
  const radiusOptions = [10, 30, 50, 100]

  const handleOpenLocation = () => {
    useLocationStore.setState({ isModalOpen: true })
  }

  return (
    <div className="bg-white border border-slate-100 p-2 rounded-[2rem] shadow-sm flex items-center justify-between">

      {/* 1. ПЕРЕКЛЮЧАТЕЛЬ (Список / Карта) */}
      <div className="flex bg-slate-50 p-1 rounded-2xl">
        <button
          onClick={() => setViewMode("list")}
          className={cn(
            "flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase italic transition-all",
            viewMode === "list"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-400 hover:text-slate-600"
          )}
        >
          <List size={14} strokeWidth={3} />
          Список
        </button>
        <button
          onClick={() => setViewMode("map")}
          className={cn(
            "flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase italic transition-all",
            viewMode === "map"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-400 hover:text-slate-600"
          )}
        >
          <MapIcon size={14} strokeWidth={3} />
          Карта
        </button>
      </div>

      {/* 2. ГЕО-НАСТРОЙКИ (Город и Радиус) */}
      <div className="flex items-center gap-3 pr-2">
        {/* КНОПКА ГОРОДА: Теперь рабочая */}
        <button 
          onClick={handleOpenLocation}
          className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors group"
        >
          <MapPin size={14} className="text-blue-600 group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-black uppercase italic text-slate-900 leading-none">
            {city || "Выбрать город"}
          </span>
        </button>

        <div className="h-6 w-px bg-slate-100 hidden md:block" />

        {/* ВЫБОР РАДИУСА */}
        <div className="hidden md:flex items-center gap-1 p-1 bg-slate-50/50 rounded-xl">
          {radiusOptions.map((r) => (
            <button
              key={r}
              onClick={() => setRadius(r)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all",
                radius === r
                  ? "bg-white text-blue-600 shadow-sm border border-slate-100"
                  : "text-slate-400 hover:text-slate-600"
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
