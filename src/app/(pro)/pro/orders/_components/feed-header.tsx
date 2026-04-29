"use client"

import * as React from "react"
import { MapPin, ChevronDown, Plus, X, Settings2, Zap } from "lucide-react"
import { cn, handleAction } from "@/lib/utils"
import { useLocationStore } from "@/store/use-location-store"
import { CategorySearchModal } from "./category-search-modal"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { addSkill, removeSkill } from "@/actions/profile/manage"
import { toast } from "sonner"

import type { FullProfile } from "@/actions/profile/get"
import type { DBCategory } from "@/actions/category/get"
import { LocationModal } from "./location-modal"

type UserSkill = NonNullable<FullProfile>["skills"][number]

interface FeedHeaderProps {
  userSkills: UserSkill[]
  userId?: string
  stats: { total: number; matched: number }
  isUpdating?: boolean
}

export function FeedHeader({ userSkills, userId, stats, isUpdating }: FeedHeaderProps) {
  const queryClient = useQueryClient()
  
  // Достаем _hasHydrated, чтобы не мерцать дефолтными данными
  const { city, radius, setRadius, openModal, _hasHydrated } = useLocationStore()
  const [isSearchOpen, setIsSearchOpen] = React.useState(false)
  const profileKey = ["user-profile", userId]

  // --- МУТАЦИИ (ОСТАВЛЯЕМ ОПТИМИСТИЧНЫМИ) ---
  const { mutate: handleAddSkill } = useMutation({
    mutationFn: (categoryId: string) => handleAction(addSkill(categoryId)),
    onMutate: async (newId) => {
      await queryClient.cancelQueries({ queryKey: profileKey })
      const prev = queryClient.getQueryData<FullProfile>(profileKey)
      if (prev) {
        const allCats = queryClient.getQueryData<DBCategory[]>(["all-categories"])
        const categoryName = allCats?.find(c => c.id === newId)?.name || "..."
        queryClient.setQueryData<FullProfile>(profileKey, {
          ...prev,
          skills: [...prev.skills, { categoryId: newId, category: { name: categoryName } } as UserSkill]
        })
      }
      return { prev }
    },
    onError: (_, __, context) => queryClient.setQueryData(profileKey, context?.prev)
  })

  const { mutate: handleRemoveSkill } = useMutation({
    mutationFn: (categoryId: string) => handleAction(removeSkill(categoryId)),
    onMutate: async (targetId) => {
      await queryClient.cancelQueries({ queryKey: profileKey })
      const prev = queryClient.getQueryData<FullProfile>(profileKey)
      if (prev) {
        queryClient.setQueryData<FullProfile>(profileKey, {
          ...prev,
          skills: prev.skills.filter(s => s.categoryId !== targetId)
        })
      }
      return { prev }
    },
    onError: (_, __, context) => queryClient.setQueryData(profileKey, context?.prev)
  })

  return (
    <div className={cn("space-y-6 transition-opacity duration-300", !_hasHydrated && "opacity-50 pointer-events-none")}>
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-4">
          <h1 className="text-6xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">
            Лента <span className="text-blue-600">PRO</span>
          </h1>
          
          <div className="flex flex-wrap gap-2">
            {/* Город */}
            <button 
              onClick={openModal}
              className="flex items-center gap-2 bg-white px-5 py-2.5 rounded-2xl border-2 border-slate-100 hover:border-blue-200 transition-all shadow-sm active:scale-95"
            >
              <MapPin className={cn("w-4 h-4 text-blue-500", isUpdating && "animate-bounce")} />
              <span className="text-slate-900 text-[11px] font-black uppercase tracking-widest">
                {_hasHydrated ? city : "Загрузка..."}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-300" />
            </button>

            {/* Радиус */}
            <div className="flex bg-slate-100 p-1.5 rounded-2xl border-2 border-slate-100">
              {[10, 30, 50, 100].map((r) => (
                <button 
                  key={r} 
                  onClick={() => setRadius(r)} 
                  className={cn(
                    "px-4 py-1.5 text-[10px] font-black rounded-xl transition-all uppercase",
                    _hasHydrated && radius === r ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  {r} км
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ИНФО-БЛОК */}
      <div className="p-10 bg-white border-2 border-slate-100 rounded-[3.5rem] shadow-sm relative overflow-hidden group/box">
        <Zap className="absolute -right-6 -bottom-6 w-32 h-32 opacity-[0.03] text-slate-900 -rotate-12 pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 relative z-10">
          <div className="space-y-6 flex-1">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-blue-600" />
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Специализации</h3>
            </div>
            
            <div className="flex flex-wrap gap-2.5">
              {userSkills.map((skill) => (
                <div key={skill.categoryId} className="flex items-center gap-3 bg-slate-900 text-white pl-5 pr-2 py-2 rounded-2xl transition-all hover:bg-red-600 animate-in zoom-in group/skill">
                  <span className="text-[10px] font-black uppercase tracking-widest italic leading-none">{skill.category?.name}</span>
                  <button onClick={() => handleRemoveSkill(skill.categoryId)} className="p-1.5 hover:bg-white/20 rounded-lg">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              
              <button 
                onClick={() => setIsSearchOpen(true)} 
                className="flex items-center gap-2 border-2 border-dashed border-slate-200 px-5 py-2.5 rounded-2xl text-slate-400 hover:border-blue-400 hover:text-blue-600 transition-all active:scale-95 bg-slate-50/10"
              >
                <Plus className="w-4 h-4" /> 
                <span className="text-[11px] font-black uppercase tracking-widest">Добавить нишу</span>
              </button>
            </div>
          </div>

          {/* СТАТИСТИКА */}
          <div className="shrink-0 flex flex-col items-start lg:items-end gap-1 border-t lg:border-t-0 lg:border-l border-slate-50 pt-8 lg:pt-0 lg:pl-12">
            <div className="flex items-baseline gap-2">
              <span className="text-7xl font-black italic tracking-tighter text-slate-900 leading-none">
                {stats.total}
              </span>
              <span className="text-blue-600 font-black italic uppercase text-sm tracking-widest">задач</span>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight text-left lg:text-right">
              сейчас в г. {_hasHydrated ? city : "..."} <br />
              из них <span className="text-blue-600 font-black italic underline decoration-2">{stats.matched} подходят вам</span>
            </p>
          </div>
        </div>
      </div>

      <LocationModal />
      <CategorySearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        userCategoryIds={userSkills.map(s => s.categoryId)}
        onAdd={handleAddSkill}
        onRemove={handleRemoveSkill}
      />
    </div>
  )
}
