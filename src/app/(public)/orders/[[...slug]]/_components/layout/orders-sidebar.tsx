"use client"

import * as React from "react"
import Link from "next/link"
import {
  ShieldCheck,
  MapPin,
  LogIn,
  Settings2,
  Plus,
  X,
  Zap,
  Activity
} from "lucide-react"
import { PopularCategoryResult } from "@/actions/category/get"
import { FullProfile } from "@/actions/profile/get"

interface OrdersSidebarProps {
  isAuth: boolean
  profile: FullProfile | null
  popularCategories: PopularCategoryResult[]
  serverLocation: {
    city: string
    slug: string
    radius: number
  }
  onAddClick: () => void
  onRemoveSkill: (id: string) => void
  cityName: string
}

export function OrdersSidebar({
  isAuth,
  profile,
  popularCategories,
  serverLocation,
  onAddClick,
  onRemoveSkill,
  cityName
}: OrdersSidebarProps) {

  const hasCategories = (profile?.skills?.length ?? 0) > 0

  return (
    <div className="space-y-6">
      {/* 1. ШАПКА (ПРОФИЛЬ / ГОСТЬ) */}
      {isAuth ? (
        <div className="bg-slate-900 rounded-[2.5rem] p-6 text-white shadow-xl shadow-slate-200 animate-in fade-in duration-500 overflow-hidden relative">
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-blue-600/10 rounded-full blur-2xl" />

          <div className="flex items-center gap-4 mb-6 relative">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 border-2 border-white/20 flex items-center justify-center text-xl font-black italic shadow-inner">
                {profile?.user.name ? profile.user.name[0] : 'P'}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-white text-slate-900 text-[10px] font-black w-6 h-6 rounded-lg flex items-center justify-center border-2 border-slate-900 italic">
                {profile?.level ?? 1}
              </div>
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-1">
                <h4 className="font-black uppercase italic text-sm tracking-tight leading-none">
                  {profile?.user.name ? profile.user.name.split(' ')[0] : 'Партнер'}
                </h4>
                <ShieldCheck size={12} className="text-blue-400" />
              </div>

              <div className="mt-2 w-full">
                <div className="flex justify-between text-[8px] font-black uppercase mb-1 tracking-widest text-slate-500">
                  <span>Уровень {profile?.level ?? 1}</span>
                  <span>{profile?.exp ?? 0}/1000 XP</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                    style={{ width: `${((profile?.exp ?? 0) / 1000) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white/5 rounded-2xl p-3 border border-white/5 text-center">
              <p className="text-[7px] font-bold text-slate-500 uppercase mb-1">Отклики</p>
              <span className="text-lg font-black italic text-blue-400">{profile?.weeklyBidsLeft ?? 0}</span>
            </div>
            <div className="bg-white/5 rounded-2xl p-3 border border-white/5 text-center">
              <p className="text-[7px] font-bold text-slate-500 uppercase mb-1">Рейтинг</p>
              <span className="text-lg font-black italic text-yellow-500">5.0</span>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 flex justify-between items-center text-[10px] font-black uppercase italic">
            <div className="flex items-center gap-2">
              <MapPin size={12} className="text-blue-400" />
              <span className="truncate max-w-[100px]">{cityName}</span>
            </div>
            <Link href="/pro/profile" className="text-blue-400 hover:text-white transition-colors underline-offset-4 hover:underline">
              Настройки
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-blue-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-blue-100 animate-in zoom-in-95 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
          <h4 className="text-xl font-black uppercase italic tracking-tighter leading-[0.9] mb-4">
            Хотите брать <br /> заказы?
          </h4>
          <Link href="/sign-in" className="flex items-center justify-center gap-2 w-full py-4 bg-white text-blue-600 rounded-2xl text-[11px] font-black uppercase hover:bg-slate-50 transition-all active:scale-95 shadow-lg group">
            <LogIn size={14} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
            Войти в систему
          </Link>
        </div>
      )}

      {/* 2. ВАШИ КАТЕГОРИИ */}
      <div className="bg-white border border-slate-100 p-8 rounded-[2.5rem] shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 size={16} className="text-blue-600" />
            <h3 className="text-xs font-black uppercase italic tracking-tight text-slate-900">
              {isAuth ? "Ваши ниши" : "Фильтр ленты"}
            </h3>
          </div>
          {isAuth && (
            <button onClick={onAddClick} className="p-2 bg-slate-50 rounded-xl text-blue-600 hover:bg-blue-600 hover:text-white transition-all">
              <Plus size={16} strokeWidth={3} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {hasCategories ? (
            profile?.skills.map((skill) => (
              <div key={skill.categoryId} className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl text-[10px] font-black text-slate-900 uppercase italic transition-all hover:border-blue-600">
                {skill.category.name}
                <button onClick={() => onRemoveSkill(skill.categoryId)} className="text-slate-300 hover:text-red-500">
                  <X size={12} />
                </button>
              </div>
            ))
          ) : (
            <button onClick={onAddClick} className="text-[10px] font-bold text-blue-600 uppercase italic hover:underline">
              + Выберите категории
            </button>
          )}
        </div>
      </div>

      {/* 3. ПОПУЛЯРНО РЯДОМ */}
      <div className="bg-white border border-slate-100 p-8 rounded-[2.5rem] shadow-sm space-y-6 relative overflow-hidden">
        <Zap size={40} className="absolute -right-4 -top-4 text-slate-50 -rotate-12" />
        <div className="flex items-center gap-2 relative">
          <Activity size={16} className="text-blue-600" />
          <h3 className="text-[10px] font-black uppercase italic tracking-widest text-slate-900">
            Тренды: {cityName}
          </h3>
        </div>

        <div className="flex flex-col gap-2 relative">
          {popularCategories.map((cat) => (
            <Link
              key={cat.id}
              href={`/orders/${serverLocation.slug}/${cat.slug}`}
              className="flex items-center justify-between group py-1"
            >
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
