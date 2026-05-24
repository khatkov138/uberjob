"use client"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"

import { authClient } from "@/lib/auth-client"
import { Settings, LogOut, Shield, ExternalLink, User, BriefcaseBusiness } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useNavbarStore, useNavbarUser } from "../navbar-provider"
import { useQueryClient } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import { RoleSwitcher } from "./role-switcher"

export function UserDropdown() {
  const queryClient = useQueryClient();
  const mode = useNavbarStore((state) => state.mode)
  const setMode = useNavbarStore((state) => state.setMode) // 🧱 Твой оригинальный хук
  const user = useNavbarUser() // 🧱 Достаем зацементированный Слой Гранит
  const router = useRouter()

  if (!user) return null

  const handleRoleChange = (targetRole: 'CLIENT' | 'PRO') => {
    if (mode === targetRole) return
    setMode(targetRole)
    router.push(targetRole === 'PRO' ? '/pro/dashboard' : '/client/dashboard')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="outline-none">
        {/* ЕДИНЫЙ ЦЕЛЬНЫЙ КУЗОВ С АВТО-ИНВЕРСИЕЙ ЦВЕТОВ (ВЕСЬ КЛИК ОТКРЫВАЕТ МЕНЮ) */}
        <div className={cn(
          "flex items-center rounded-full border transition-all cursor-pointer shadow-md h-11 p-1 select-none",
          mode === 'PRO' 
            ? "bg-slate-950 border-slate-900 text-white hover:bg-slate-900" 
            : "bg-white border-slate-200 text-slate-900 hover:bg-slate-50 hover:border-slate-300"
        )}>
          {/* ЛЕВАЯ ЧАСТЬ (АВАТАР + ТЕКСТ) */}
          <div className="flex items-center gap-2.5 pr-2.5 harms-start pl-0.5">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-900 font-black text-xs shadow-inner shrink-0 border border-black/5 relative">
              {user.name?.charAt(0).toUpperCase()}
              <span className={cn("absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm transition-colors", mode === 'PRO' ? "bg-emerald-500" : "bg-blue-600")} />
            </div>
            
            <div className="hidden md:block text-left leading-none max-w-[95px]">
              <p className={cn("text-[7px] font-black uppercase tracking-[0.2em] mb-0.5 transition-colors", mode === 'PRO' ? "text-emerald-400" : "text-blue-600")}>
                {mode === 'PRO' ? "ИСПОЛНИТЕЛЬ" : "ЗАКАЗЧИК"}
              </p>
              <p className="text-[10px] font-black uppercase tracking-tight truncate">
                {user.name?.split(' ') || "Аккаунт"}
              </p>
            </div>
          </div>

          {/* ВЕРТИКАЛЬНЫЙ РАЗДЕЛИТЕЛЬ КНОПКИ */}
          <div className={cn("w-[1px] h-6 transition-colors", mode === 'PRO' ? "bg-slate-800" : "bg-slate-100")} />

          {/* 💎 ПРАВАЯ ЧАСТЬ: ЧИСТЫЙ ПРЕМИАЛЬНЫЙ ИНДИКАТОР СТАТУСА (МЯГКИЙ ГЛOУ-ЭФФЕКТ) */}
          <div
            className={cn(
              "w-9 h-9 flex items-center justify-center rounded-full ml-1 shrink-0 relative overflow-hidden border transition-all",
              mode === 'PRO' 
                ? "border-emerald-500/10 bg-emerald-500/10 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.05)]" 
                : "border-blue-100/30 bg-blue-50/50 text-blue-600"
            )}
          >
            {mode === 'PRO' ? (
              <BriefcaseBusiness size={13} className="stroke-[2.5px]" />
            ) : (
              <User size={13} className="stroke-[2.5px]" />
            )}
          </div>
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[320px] p-4 bg-white rounded-[2rem] border-2 border-slate-100 shadow-2xl mt-4 space-y-3">
        {/* ХЕДЕР ДРОПДАУНА */}
        <div className="p-4 bg-slate-50 border border-slate-100/50 rounded-[1.5rem]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black italic text-xl border border-black/10 shadow-sm">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black uppercase italic text-slate-900 truncate leading-none mb-1.5">{user.name}</p>
              <div className="flex items-center gap-1.5">
                <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse transition-colors", mode === 'PRO' ? "bg-emerald-500" : "bg-blue-600")} />
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                  РЕЖИМ {mode === 'PRO' ? 'МАСТЕРА' : 'КЛИЕНТА'}
                </p>
              </div>
            </div>
          </div>

          <Link href={`/profile/${user.id}`} className="flex items-center justify-center gap-2 w-full bg-white border border-slate-200 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-blue-600 hover:text-blue-600 transition-all group">
            <ExternalLink size={12} className="group-hover:scale-105 transition-transform" />
            Посмотреть мой профиль
          </Link>
        </div>

        {/* АТОМАРНЫЙ СВИТЧЕР ВНУТРИ МЕНЮ */}
        <RoleSwitcher mode={mode} onSwitch={handleRoleChange} />
        <DropdownMenuSeparator className="bg-slate-100 my-1" />

        {/* ПУНКТЫ МЕНЮ */}
        <div className="space-y-0.5">
          <DropdownMenuItem asChild className="focus:bg-slate-50 rounded-xl p-2.5 cursor-pointer group outline-none border-none">
            <Link href="/settings" className="flex items-center gap-3 w-full">
              <div className="p-2 bg-slate-100 rounded-lg group-focus:bg-white transition-colors">
                <Settings className="w-4 h-4 text-slate-600" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Настройки аккаунта</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild className="focus:bg-slate-50 rounded-xl p-2.5 cursor-pointer group outline-none border-none">
            <Link href="/help" className="flex items-center gap-3 w-full">
              <div className="p-2 bg-slate-100 rounded-lg group-focus:bg-white transition-colors">
                <Shield className="w-4 h-4 text-slate-600" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Поддержка</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-slate-100 my-2" />

          <DropdownMenuItem
            onClick={async () => {
              await authClient.signOut();
              queryClient.clear();
              router.push("/");
            }}
            className="focus:bg-red-50 rounded-xl p-2.5 cursor-pointer group outline-none border-none"
          >
            <div className="flex items-center gap-3 text-red-600 w-full">
              <div className="p-2 bg-red-50 rounded-lg group-focus:bg-white transition-colors">
                <LogOut className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest">Выйти из системы</span>
            </div>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
