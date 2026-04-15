"use client"

import * as React from "react"
import { MapPin, ChevronDown, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLocationStore } from "@/store/use-location-store"

interface FeedHeaderProps {
  filterMode: "ALL" | "MY"
  setFilterMode: (mode: "ALL" | "MY") => void
}

export function FeedHeader({ filterMode, setFilterMode }: FeedHeaderProps) {
  const { city, radius, setRadius, openModal } = useLocationStore()

  return (
    <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
      <div className="space-y-4 w-full md:w-auto">
        <h1 className="text-4xl font-black flex items-center gap-3 italic tracking-tighter uppercase">
          Лента <Zap className="w-8 h-8 text-blue-600 fill-current" />
        </h1>
        
        <div className="flex flex-wrap gap-2">
          {/* Выбор города */}
          <button 
            onClick={openModal}
            className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-blue-100 shadow-sm hover:bg-blue-50 transition-all active:scale-95"
          >
            <MapPin className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-blue-700 text-[11px] font-black uppercase tracking-wider">{city}</span>
            <ChevronDown className="w-3 h-3 text-blue-400" />
          </button>

          {/* Выбор радиуса */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
            {[10, 30, 60, 100].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRadius(r)}
                className={cn(
                  "px-3 py-1 text-[10px] font-black rounded-lg transition-all uppercase tracking-tighter",
                  radius === r 
                    ? "bg-white text-blue-600 shadow-sm ring-1 ring-black/5" 
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                {r} км
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Переключатель: Все / Мои категории */}
      <div className="flex bg-muted/50 p-1.5 rounded-2xl border backdrop-blur-sm shadow-inner">
        <button
          onClick={() => setFilterMode("ALL")}
          className={cn(
            "px-6 py-2 text-[10px] font-black rounded-xl transition-all uppercase",
            filterMode === "ALL" ? "bg-white text-blue-600 shadow-sm" : "text-muted-foreground"
          )}
        >
          Все подряд
        </button>
        <button
          onClick={() => setFilterMode("MY")}
          className={cn(
            "px-6 py-2 text-[10px] font-black rounded-xl transition-all uppercase",
            filterMode === "MY" ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "text-muted-foreground"
          )}
        >
          Мои категории
        </button>
      </div>
    </header>
  )
}
