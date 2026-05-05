"use client"

import * as React from "react"
import Link from "next/link"
import { ShieldCheck, MapPin, LogIn, Settings2, Plus, X, Zap, Activity, Loader2 } from "lucide-react"

// Hooks & Stores
import { useUserSkills } from "@/hooks/use-user-skills"
import { useCategoryModalStore } from "@/store/use-category-modal-store"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

// Utils & Actions
import { cn, handleAction } from "@/lib/utils"
import { PopularCategoryResult } from "@/actions/category/get"
import { ServerLocation } from "@/lib/server-utils"
import { FullProfile } from "@/actions/profile/get"
import { removeSkill } from "@/actions/profile/manage"

interface OrdersSidebarProps {
  popularCategories: PopularCategoryResult[]
}

export function OrdersSidebar({ popularCategories }: OrdersSidebarProps) {
  const queryClient = useQueryClient()
  const { open: openCatModal } = useCategoryModalStore()

  // 1. Используем хук (теперь он со встроенной заглушкой, всё ок)
  const { profile, hasSkills } = useUserSkills()

  // 2. Локация из кеша: добавляем queryFn-заглушку
  const { data: location } = useQuery<ServerLocation>({
    queryKey: ['current-location'],
    queryFn: () => { throw new Error("Location should be in cache") },
    enabled: false
  })

  // 3. Мутация удаления: убеждаемся, что переменная `variables` типизирована
  const { mutate: handleRemoveSkill, variables } = useMutation({
    mutationFn: (id: string) => handleAction(removeSkill(id)),
    onMutate: async (id: string) => { // Явно указываем тип ID
      await queryClient.cancelQueries({ queryKey: ["user-profile"] })
      const previousProfile = queryClient.getQueryData<FullProfile>(["user-profile"])

      if (previousProfile) {
        queryClient.setQueryData<FullProfile>(["user-profile"], {
          ...previousProfile,
          skills: previousProfile.skills.filter(s => s.categoryId !== id)
        })
      }
      return { previousProfile }
    },
    onError: (_err, _id, context) => {
      if (context?.previousProfile) {
        queryClient.setQueryData(["user-profile"], context.previousProfile)
      }
    }
  })

  // variables в useMutation — это объект аргументов, если мутация запущена. 
  // В нашем случае это просто id (string). 
  // Для проверки "удаляется ли сейчас этот скилл" используем:
  // const isDeleting = variables === skill.categoryId;

  const cityName = location?.name || "..."


  return (
    <div className="space-y-6">
      {/* 1. ШАПКА (ПРОФИЛЬ / ГОСТЬ) */}
      {profile ? (
        // TS теперь знает, что здесь profile — это FullProfile
        <div className="bg-slate-900 rounded-[2.5rem] p-6 text-white shadow-xl shadow-slate-200 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-blue-600/10 rounded-full blur-2xl" />
          <div className="flex items-center gap-4 mb-6 relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 border-2 border-white/20 flex items-center justify-center text-xl font-black italic shadow-inner">
              {profile.user.name ? profile.user.name[0] : 'P'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <h4 className="font-black uppercase italic text-sm truncate">
                  {profile.user.name ? profile.user.name.split(' ')[0] : 'Партнер'}
                </h4>
                <ShieldCheck size={12} className="text-blue-400 shrink-0" />
              </div>
              <div className="mt-2 w-full">
                <div className="flex justify-between text-[8px] font-black uppercase mb-1 tracking-widest text-slate-500">
                  <span>LVL {profile.level}</span>
                  <span>{profile.exp}/1000 XP</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-1000"
                    style={{ width: `${(profile.exp / 1000) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="pt-4 border-t border-white/10 flex justify-between items-center text-[10px] font-black uppercase italic">
            <div className="flex items-center gap-2">
              <MapPin size={12} className="text-blue-400" />
              <span className="truncate max-w-[100px]">{cityName}</span>
            </div>
            <Link href="/pro/profile" className="text-blue-400 hover:text-white transition-colors">Настройки</Link>
          </div>
        </div>
      ) : (
        <div className="bg-blue-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-blue-100 relative overflow-hidden">
          <h4 className="text-xl font-black uppercase italic tracking-tighter mb-4 leading-none text-white">
            Хотите брать <br /> заказы?
          </h4>
          <Link href="/sign-in" className="flex items-center justify-center gap-2 w-full py-4 bg-white text-blue-600 rounded-2xl text-[11px] font-black uppercase shadow-lg">
            Войти в систему
          </Link>
        </div>
      )}

      {/* 2. ВАШИ КАТЕГОРИИ */}
      <div className="bg-white border border-slate-100 p-8 rounded-[2.5rem] shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 size={16} className="text-blue-600" />
            <h3 className="text-xs font-black uppercase italic text-slate-900">
              {profile ? "Ваши ниши" : "Фильтр ленты"}
            </h3>
          </div>
          {profile && (
            <button onClick={openCatModal} className="p-2 bg-slate-50 rounded-xl text-blue-600 hover:bg-blue-600 hover:text-white transition-all">
              <Plus size={16} strokeWidth={3} />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {profile && hasSkills ? (
            profile.skills.map((skill) => {
              const isDeleting = variables === skill.categoryId;
              return (
                <div key={skill.categoryId} className={cn(
                  "flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl text-[10px] font-black text-slate-900 uppercase italic",
                  isDeleting && "opacity-50 animate-pulse"
                )}>
                  {skill.category.name}
                  <button onClick={() => handleRemoveSkill(skill.categoryId)} disabled={isDeleting}>
                    {isDeleting ? <Loader2 size={10} className="animate-spin" /> : <X size={12} />}
                  </button>
                </div>
              )
            })
          ) : (
            <button onClick={openCatModal} className="text-[10px] font-bold text-blue-600 uppercase italic hover:underline">
              + Выберите категории
            </button>
          )}
        </div>
      </div>

      {/* 3. ТРЕНДЫ */}
      <div className="bg-white border border-slate-100 p-8 rounded-[2.5rem] shadow-sm space-y-6 relative overflow-hidden">
        <Zap size={40} className="absolute -right-4 -top-4 text-slate-50 -rotate-12 pointer-events-none" />
        <h3 className="text-[10px] font-black uppercase italic tracking-widest text-slate-900 relative">
          Тренды: {cityName}
        </h3>
        <div className="flex flex-col gap-2 relative">
          {popularCategories.map((cat) => (
            <Link key={cat.id} href={`/orders/${location?.slug}/${cat.slug}`} className="flex items-center justify-between group py-1">
              <span className="text-[10px] font-black uppercase italic text-slate-900 group-hover:text-blue-600 transition-colors">
                {cat.name}
              </span>
              <span className="bg-slate-50 text-slate-400 group-hover:bg-blue-600 group-hover:text-white px-2 py-0.5 rounded-lg text-[9px] font-black italic transition-all">
                {cat._count.orders}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
