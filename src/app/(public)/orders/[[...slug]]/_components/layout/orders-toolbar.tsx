"use client"

import * as React from "react"
import { List, Map as MapIcon, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLocationStore } from "@/store/use-location-store"

interface OrdersToolbarProps {
  viewMode: "list" | "map"
  setViewMode: (mode: "list" | "map") => void
  serverCity: string
  serverRadius: number
}

const RADIUS_OPTIONS = [10, 30, 50, 100]

export function OrdersToolbar({ viewMode, setViewMode, serverCity, serverRadius }: OrdersToolbarProps) {
  const { radius: storeRadius, city: storeCity, setRadius, _hasHydrated, openModal } = useLocationStore()

  /**
   * ИЗБАВЛЯЕМСЯ ОТ ДЕРГАНИЯ:
   * 1. Город: Мы всегда доверяем серверу (serverCity), потому что он привязан к URL.
   *    Даже если в сторе лежит "Кемерово", а мы в "/orders/moskva", тулбар должен писать "Москва".
   *    Стор обновится через useEffect в OrdersPageClient, и тогда storeCity станет равен serverCity.
   */
  const activeCity = serverCity || (_hasHydrated ? storeCity : "")

  /**
   * 2. Радиус: А вот радиус — это фильтр. Если стор загрузился, берем из него,
   *    чтобы сохранить выбор мастера при переходе между городами.
   */
  const activeRadius = _hasHydrated ? storeRadius : serverRadius

  return (
    <div className="bg-white px-6 py-4 flex items-center justify-between border-b border-slate-100">

      {/* 1. ПЕРЕКЛЮЧАТЕЛЬ: Список / Карта */}
      <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-100/50">
        <button
          onClick={() => setViewMode("list")}
          className={cn(
            "flex items-center gap-2 px-5 py-2 md:px-6 md:py-2.5 rounded-xl text-[10px] font-black uppercase italic transition-all",
            viewMode === "list"
              ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/50"
              : "text-slate-400 hover:text-slate-600"
          )}
        >
          <List size={14} strokeWidth={3} />
          <span className="hidden sm:inline">Список</span>
        </button>
        <button
          onClick={() => setViewMode("map")}
          className={cn(
            "flex items-center gap-2 px-5 py-2 md:px-6 md:py-2.5 rounded-xl text-[10px] font-black uppercase italic transition-all",
            viewMode === "map"
              ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/50"
              : "text-slate-400 hover:text-slate-600"
          )}
        >
          <MapIcon size={14} strokeWidth={3} />
          <span className="hidden sm:inline">Карта</span>
        </button>
      </div>

      {/* 2. ГЕО-БЛОК */}
      <div className="flex items-center gap-4 md:gap-6">
        {/* КНОПКА ГОРОДА */}
        <button
          onClick={openModal}
          className="flex items-center gap-2.5 group transition-all min-w-0"
        >
          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0">
            <MapPin size={14} strokeWidth={2.5} />
          </div>
          <div className="text-left min-w-0">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 text-[7px] md:text-[8px]">
              Локация
            </p>
            <p className="text-[11px] font-black uppercase italic text-slate-900 leading-none truncate max-w-[100px] md:max-w-[150px]">
              {activeCity}
            </p>
          </div>
        </button>

        <div className="h-8 w-px bg-slate-100 hidden md:block" />

        {/* ВЫБОР РАДИУСА */}
        <div className="hidden lg:flex items-center gap-1">
          {RADIUS_OPTIONS.map((r) => (
            <button
              key={r}
              onClick={() => setRadius(r)}
              className={cn(
                "min-w-[48px] px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all border",
                activeRadius === r
                  ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20 scale-105"
                  : "bg-white border-slate-100 text-slate-400 hover:border-slate-200 hover:text-slate-600"
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
