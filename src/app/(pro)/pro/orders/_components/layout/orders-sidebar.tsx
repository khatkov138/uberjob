"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Settings2, X, Plus, Users, Activity, Clock, ShieldCheck, MapPin, LogIn } from "lucide-react"
import Link from "next/link"

import { cn, handleAction } from "@/lib/utils"
import { useLocationStore } from "@/store/use-location-store"
import { getMyProfile, type FullProfile } from "@/actions/profile/get"

interface OrdersSidebarProps {
  onAddClick: () => void
  onRemoveSkill: (id: string) => void
  isFetching?: boolean
  userId?: string
}

export function OrdersSidebar({ onAddClick, onRemoveSkill, isFetching, userId }: OrdersSidebarProps) {
  const { city } = useLocationStore()

  // Подтягиваем профиль. Он уже в кэше, так как PageClient сделал этот запрос.
  // Внутри profile.skills уже лежат категории благодаря твоему инклуду в Prisma.
  const { data: profile } = useQuery<FullProfile | null>({
    queryKey: ["user-profile", userId],
    queryFn: () => handleAction(getMyProfile()),
    enabled: !!userId,
    staleTime: Infinity,
  })

  const isAuth = !!profile?.id
  const categories = profile?.skills || [] // Берем навыки прямо из профиля
  const hasCategories = categories.length > 0

  return (
    <div className="space-y-6">

      {/* 1. ШАПКА (ПРОФИЛЬ / ГОСТЬ) */}
      {isAuth ? (
        <div className="bg-slate-900 rounded-[2.5rem] p-6 text-white shadow-xl shadow-slate-200 animate-in fade-in duration-500">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 border-2 border-white/20 flex items-center justify-center text-lg font-black italic shadow-inner">
              {profile.user.name ? profile.user.name[0] : 'P'}
            </div>
            <div>
              <div className="flex items-center gap-1">
                <h4 className="font-black uppercase italic text-sm tracking-tight leading-none">
                  {profile.user.name ? profile.user.name.split(' ')[0] : 'Партнер'}
                </h4>
                <ShieldCheck size={12} className="text-blue-400" />
              </div>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1 italic">PRO Аккаунт</p>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 flex justify-between items-center text-[10px] font-black uppercase italic">
            <div className="flex items-center gap-2">
              <MapPin size={12} className="text-blue-400" />
              <span>{city || 'Ангарск'}</span>
            </div>
            <Link href="/pro/profile" className="text-blue-400 hover:text-white transition-colors underline-offset-4 hover:underline">
              Настройки
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-blue-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-blue-100 animate-in zoom-in-95 duration-500">
          <h4 className="text-xl font-black uppercase italic tracking-tighter leading-none mb-4 text-white">
            Хотите брать <br /> эти заказы?
          </h4>
          <p className="text-[10px] font-bold uppercase opacity-80 mb-6 leading-tight text-blue-50">
            Зарегистрируйтесь как мастер, чтобы предлагать свои услуги
          </p>
          <Link href="/sign-in" className="flex items-center justify-center gap-2 w-full py-3 bg-white text-blue-600 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-50 transition-all active:scale-95 shadow-lg">
            <LogIn size={14} strokeWidth={3} />
            Войти в систему
          </Link>
        </div>
      )}

      {/* 2. ВАШИ КАТЕГОРИИ (Берем из profile.skills) */}
      <div className="bg-white border border-slate-100 p-8 rounded-[2.5rem] shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-900">
            <Settings2 className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-black uppercase italic tracking-tight text-slate-900">
              {isAuth ? "Ваши категории" : "Фильтр ленты"}
            </h3>
          </div>
          {isAuth && (
            <button
              onClick={onAddClick}
              className="p-2 bg-slate-50 rounded-xl text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-90"
            >
              <Plus size={16} strokeWidth={3} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {hasCategories ? (
            categories.map((skill: any) => (
              <div
                key={skill.categoryId}
                className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl text-[10px] font-black text-slate-900 uppercase italic transition-all hover:border-blue-600 hover:bg-white"
              >
                {skill.category?.name}
                {isAuth && (
                  <button
                    onClick={() => onRemoveSkill(skill.categoryId)}
                    className="text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <X size={12} strokeWidth={3} />
                  </button>
                )}
              </div>
            ))
          ) : (
            <button
              onClick={onAddClick}
              className="text-[10px] font-bold text-blue-600 uppercase italic py-2 hover:underline tracking-tight text-left"
            >
              + Выберите категории для поиска
            </button>
          )}
        </div>
      </div>

      {/* 3. ПУЛЬС ПЛАТФОРМЫ */}
      <div className="px-8 py-4 space-y-4">
        <div className="flex items-center gap-2 opacity-30">
          <Activity size={14} className="text-slate-900" />
          <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-900 leading-none">Пульс Zwork</span>
        </div>
        <div className="space-y-2.5">
          <div className="flex justify-between items-center text-[10px] font-bold uppercase">
            <span className="text-slate-400 font-bold">Online</span>
            <span className="text-slate-900 italic font-black tabular-nums leading-none">1,402</span>
          </div>
          <div className="flex justify-between items-center text-[10px] font-bold uppercase">
            <span className="text-slate-400 font-bold">Last Order</span>
            <span className="text-slate-900 italic font-black leading-none uppercase">2 мин назад</span>
          </div>
        </div>
      </div>
    </div>
  )
}
