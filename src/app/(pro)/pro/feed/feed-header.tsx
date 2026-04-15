// app/(pro)/pro/feed/_components/feed-header.tsx
"use client"

import * as React from "react"
import { MapPin, ChevronDown, Plus, X, Settings2, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLocationStore } from "@/store/use-location-store"
import { CategorySearchModal } from "./category-search-modal"

export function FeedHeader({ userCategories = [], toggleCategory, filterMode, setFilterMode }: any) {
  const { city, radius, setRadius, openModal } = useLocationStore()
  const [isSearchOpen, setIsSearchOpen] = React.useState(false)

  return (
    <div className="space-y-6">
      {/* ... (Верхняя часть с Названием и Локацией остается как была) ... */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-4">
          <h1 className="text-5xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">
            Лента <span className="text-blue-600">PRO</span>
          </h1>
          <div className="flex flex-wrap gap-2">
            <button onClick={openModal} className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border-2 border-slate-100 hover:border-blue-200 transition-all">
              <MapPin className="w-4 h-4 text-blue-500" />
              <span className="text-slate-900 text-[11px] font-black uppercase tracking-widest">{city}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-300" />
            </button>
            <div className="flex bg-slate-100 p-1 rounded-xl border-2 border-slate-100">
              {[10, 30, 50, 100].map((r) => (
                <button key={r} onClick={() => setRadius(r)} className={cn(
                  "px-3 py-1.5 text-[10px] font-black rounded-lg transition-all uppercase",
                  radius === r ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}>
                  {r} км
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-[1.5rem] border-2 border-slate-100">
          <button onClick={() => setFilterMode("ALL")} className={cn("px-6 py-2.5 text-[10px] font-black rounded-xl transition-all uppercase", filterMode === "ALL" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400")}>Все заказы</button>
          <button onClick={() => setFilterMode("MY")} className={cn("px-6 py-2.5 text-[10px] font-black rounded-xl transition-all uppercase", filterMode === "MY" ? "bg-blue-600 text-white shadow-lg" : "text-slate-400")}>Мои ниши</button>
        </div>
      </header>

      {/* ПАНЕЛЬ УПРАВЛЕНИЯ СПЕЦИАЛИЗАЦИЯМИ */}
      <div className="p-6 bg-white border-2 border-slate-100 rounded-[2.5rem] shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <Settings2 className="w-4 h-4 text-blue-600" />
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Ваши специализации</h3>
        </div>

        <div className="flex flex-wrap gap-2">
          {userCategories?.map((skill: string) => (
            <div key={skill} className="flex items-center gap-2 bg-slate-900 text-white pl-4 pr-1.5 py-1.5 rounded-xl group transition-all hover:bg-red-600">
              <span className="text-[10px] font-black uppercase tracking-widest italic">{skill}</span>
              <button 
                onClick={() => toggleCategory(skill)} 
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          
          <button 
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2 border-2 border-dashed border-slate-200 px-4 py-2 rounded-xl text-slate-400 hover:border-blue-400 hover:text-blue-600 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Добавить нишу</span>
          </button>
        </div>
      </div>

      <CategorySearchModal 
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        userCategories={userCategories}
        onAdd={toggleCategory}
      />
    </div>
  )
}
