"use client"

import * as React from "react"
import { List, Map as MapIcon, MapPin, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

import { useLocationStore } from "@/store/use-location-store"
import { useOrdersStore } from "@/store/use-orders-store"
import { LOCATION_CONFIG } from "@/lib/location-config"
import { useActiveFeed } from "../layout/feed-context-provider"

const RADIUS_OPTIONS = LOCATION_CONFIG.SETTINGS.radiusOptions;

export function OrdersToolbar() {
  // ЛОГ РЕНДЕРА
  const renderCount = React.useRef(0);
  renderCount.current++;
  console.log(`🛠️ [RENDER #${renderCount.current}] OrdersToolbar`);

  // 1. Сторы используем ТОЛЬКО для записи (действий)
  // Мы не подписываемся на значения здесь, чтобы не рендериться лишний раз
  const setViewMode = useOrdersStore(s => s.setViewMode)
  const setRadius = useOrdersStore(s => s.setRadius)
  const openModal = useLocationStore(s => s.openModal)

  // 2. ЧИТАЕМ всё из нашего нового стабильного Контекста
  const context = useActiveFeed();

  // Вычисляем состояние на основе контекста
  const activeViewMode = context.viewMode;
  const activeCity = context.name || "Загрузка...";
  const activeRadius = context.radius || LOCATION_CONFIG.SETTINGS.radius;

  return (
    <div className="bg-white px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-100 sticky top-0 z-30">

      {/* ЛЕВАЯ ЧАСТЬ: ПЕРЕКЛЮЧАТЕЛЬ ВИДА */}
      <div className="flex bg-slate-50 p-1.5 rounded-[1.25rem] border border-slate-100/80 shadow-inner w-full md:w-auto">
        <button
          onClick={() => {
            console.log("🖱️ [UI] Switch to LIST");
            setViewMode("list");
          }}
          className={cn(
            "flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase italic transition-all",
            activeViewMode === "list"
              ? "bg-white text-slate-900 shadow-[0_4px_12px_rgba(0,0,0,0.05)] ring-1 ring-slate-200/50"
              : "text-slate-400 hover:text-slate-600"
          )}
        >
          <List size={14} strokeWidth={3} />
          <span>Список</span>
        </button>
        <button
          onClick={() => {
            console.log("🖱️ [UI] Switch to MAP");
            setViewMode("map");
          }}
          className={cn(
            "flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase italic transition-all",
            activeViewMode === "map"
              ? "bg-white text-slate-900 shadow-[0_4px_12px_rgba(0,0,0,0.05)] ring-1 ring-slate-200/50"
              : "text-slate-400 hover:text-slate-600"
          )}
        >
          <MapIcon size={14} strokeWidth={3} />
          <span>Карта</span>
        </button>
      </div>

      {/* ПРАВАЯ ЧАСТЬ: ГЕО И ФИЛЬТРЫ */}
      <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto">
        <button
          onClick={openModal}
          className="flex items-center gap-3 group transition-all text-left"
        >
          <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white group-hover:rotate-12 transition-all duration-300 shadow-sm">
            <MapPin size={18} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">Регион</span>
              <ChevronDown size={8} className="text-slate-300 group-hover:text-blue-600 transition-colors" />
            </div>
            <p className="text-[13px] font-black uppercase italic text-slate-900 leading-none truncate max-w-[120px]">
              {activeCity}
            </p>
          </div>
        </button>

        <div className="h-10 w-[2px] bg-slate-100 hidden sm:block" />

        {/* СЕЛЕКТОР РАДИУСА */}
        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-100">
          {RADIUS_OPTIONS.map((r) => (
            <button
              key={r}
              onClick={() => {
                console.log(`🖱️ [UI] Set Radius to ${r}km`);
                setRadius(r);
              }}
              className={cn(
                "px-3 py-2 rounded-xl text-[9px] font-black uppercase transition-all",
                activeRadius === r
                  ? "bg-slate-900 text-white shadow-md scale-105"
                  : "text-slate-400 hover:text-slate-900"
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
