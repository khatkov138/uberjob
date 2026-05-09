"use client"

import * as React from "react"
import Link from "next/link"
import {
  ShieldCheck,
  MapPin,
  Settings2,
  Plus,
  X,
  Zap,
  Loader2,
  ArrowUpRight
} from "lucide-react"

// Hooks & Stores
import { useUserSkills } from "@/hooks/use-user-skills"
import { useCategoryModalStore } from "@/store/use-category-modal-store"
import { useActiveFeed } from "./feed-context-provider" // Твой специфичный импорт
import { useMutation, useQueryClient } from "@tanstack/react-query"

// Utils & Actions
import { cn, handleAction } from "@/lib/utils"
import { PopularCategoryResult } from "@/actions/category/get"
import { FullProfile } from "@/actions/profile/get"
import { removeSkill } from "@/actions/profile/manage"

interface OrdersSidebarProps {
  popularCategories: PopularCategoryResult[]
}

export function OrdersSidebar({ popularCategories }: OrdersSidebarProps) {
  const queryClient = useQueryClient()
  const { open: openCatModal } = useCategoryModalStore()

  // 1. КОНТЕКСТ ЧЕРЕЗ КАСТОМНЫЙ ХУК
  const context = useActiveFeed()

  // 2. ПРОФИЛЬ И СКИЛЛЫ
  const { profile, hasSkills } = useUserSkills()

  // 3. МУТАЦИЯ УДАЛЕНИЯ (Оптимистичный апдейт)
  const { mutate: handleRemoveSkill, variables: deletingId } = useMutation({
    mutationFn: (categoryId: string) => handleAction(removeSkill(categoryId)),
    onMutate: async (categoryId) => {
      await queryClient.cancelQueries({ queryKey: ["user-profile"] })
      const previousProfile = queryClient.getQueryData<FullProfile>(["user-profile"])

      if (previousProfile) {
        queryClient.setQueryData<FullProfile>(["user-profile"], {
          ...previousProfile,
          skills: previousProfile.skills.filter(s => s.categoryId !== categoryId)
        })
      }
      return { previousProfile }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previousProfile) {
        queryClient.setQueryData(["user-profile"], ctx.previousProfile)
      }
    },
   
  })

  const cityName = context?.name || "Вся Россия"
  const citySlug = context?.slug || "all"

  return (
    <div className="flex flex-col gap-6 sticky top-6">

      {/* SECTION 1: PROFILE / AUTH CARD */}
      {profile ? (
        <div className="bg-slate-950 rounded-[2.5rem] p-8 text-white relative overflow-hidden group border border-slate-900 shadow-2xl">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-600/10 rounded-full blur-[80px]" />

          <div className="relative z-10">
            <div className="flex items-center gap-5 mb-10">
              <div className="relative shrink-0">
                <div className="w-16 h-16 rounded-[1.8rem] bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-2xl font-black italic shadow-[0_8px_30px_rgb(37,99,235,0.4)] rotate-3 group-hover:rotate-0 transition-transform duration-500 uppercase">
                  {profile.user.name?.[0] || 'U'}
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center border-2 border-slate-950 shadow-lg">
                  <ShieldCheck size={12} className="text-blue-600" />
                </div>
              </div>

              <div className="min-w-0">
                <h4 className="text-lg font-black uppercase italic tracking-tighter leading-none truncate">
                  {profile.user.name?.split(' ')[0]}
                </h4>
                <div className="flex items-center gap-2 mt-2">
                  <div className="px-2 py-0.5 bg-blue-600/10 border border-blue-500/20 rounded-md">
                    <span className="text-[8px] font-black text-blue-400 uppercase tracking-[0.2em] text-nowrap">
                      PARTNER STATUS
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                <span className="flex items-center gap-1.5 transition-colors group-hover:text-slate-300">
                  <MapPin size={10} className="text-blue-500" /> {cityName}
                </span>
                <span className="text-blue-400">{profile.exp} / 1000 XP</span>
              </div>
              <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden p-[1px]">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(37,99,235,0.6)]"
                  style={{ width: `${(profile.exp / 1000) * 100}%` }}
                />
              </div>
              <Link
                href="/pro/profile"
                className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase italic text-slate-500 hover:text-white transition-all pt-1"
              >
                Настройки профиля <ArrowUpRight size={12} strokeWidth={3} />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border-[3px] border-slate-950 rounded-[2.5rem] p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,0.05)] group">
          <h4 className="text-2xl font-black uppercase italic tracking-tighter mb-6 leading-[0.85] group-hover:text-blue-600 transition-colors">
            Начни <br /> забирать <br /> заказы
          </h4>
          <Link
            href="/sign-in"
            className="flex items-center justify-center w-full py-5 bg-slate-950 text-white rounded-2xl text-[11px] font-black uppercase italic hover:bg-blue-600 transition-all active:scale-[0.97] shadow-xl"
          >
            Вход в систему
          </Link>
        </div>
      )}

      {/* SECTION 2: SKILLS / NICHES */}
      <div className="bg-slate-50/50 border border-slate-100 p-8 rounded-[2.5rem] space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 size={14} className="text-slate-400" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Мои Ниши</h3>
          </div>
          <button
            onClick={openCatModal}
            className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-slate-950 hover:border-blue-600 hover:text-blue-600 shadow-sm transition-all active:scale-90"
          >
            <Plus size={18} strokeWidth={3} />
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {profile && hasSkills ? (
            profile.skills.map((skill) => {
              const isDeleting = deletingId === skill.categoryId;
              return (
                <div key={skill.categoryId} className={cn(
                  "group flex items-center gap-3 bg-white border border-slate-200 pl-4 pr-2 py-2.5 rounded-2xl text-[10px] font-black text-slate-900 uppercase italic hover:border-blue-300 transition-all shadow-sm",
                  isDeleting && "opacity-40 pointer-events-none"
                )}>
                  {skill.category.name}
                  <button
                    onClick={() => handleRemoveSkill(skill.categoryId)}
                    className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-50 text-slate-300 group-hover:text-red-500 group-hover:bg-red-50 transition-all"
                  >
                    {isDeleting ? <Loader2 size={10} className="animate-spin" /> : <X size={12} strokeWidth={3} />}
                  </button>
                </div>
              )
            })
          ) : (
            <button
              onClick={openCatModal}
              className="w-full py-8 border-2 border-dashed border-slate-200 rounded-[2.2rem] flex flex-col items-center gap-2 text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-all group"
            >
              <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" strokeWidth={3} />
              <span className="text-[9px] font-black uppercase tracking-widest">Добавить нишу</span>
            </button>
          )}
        </div>
      </div>

      {/* SECTION 3: TRENDS WITH ORDER COUNTS */}
      <div className="p-8 space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-px bg-slate-200" />
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-900 flex items-center gap-2">
            Тренды <Zap size={10} className="fill-blue-600 text-blue-600" />
          </h3>
        </div>

        <div className="space-y-4">
          {popularCategories.map((cat) => (
            <Link
              key={cat.id}
              href={`/orders/${citySlug}/${cat.slug}`}
              className="flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                {/* Техно-бадж счетчика */}
                <div className="w-10 h-7 bg-slate-100 group-hover:bg-slate-950 transition-colors flex items-center justify-center rounded-lg border border-slate-200 group-hover:border-slate-950">
                  <span className="text-[10px] font-black italic text-slate-400 group-hover:text-white transition-colors">
                    {cat._count?.orders || 0}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-black uppercase italic text-slate-600 group-hover:text-slate-950 transition-colors">
                    {cat.name}
                  </span>
                </div>
              </div>
              <ArrowUpRight size={16} className="text-slate-200 group-hover:text-blue-600 transition-all transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={3} />
            </Link>
          ))}
        </div>
      </div>

    </div>
  )
}
