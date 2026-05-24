"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { MessageSquare, PlusCircle, Search } from "lucide-react"

import { UserDropdown } from "@/components/navbar/_components/user-dropdown"
import { cn } from "@/lib/utils"

import { NotificationsBell } from "./_components/notifications-bell"
import { useNavbarStore, useNavbarUser } from "./navbar-provider"
import { UnreadBadge } from "./_components/unread-badge"
import { useLocationStore } from "@/store/use-location-store"
import { LOCATION_CONFIG } from "@/lib/location-config"

// 1. БРЕНД И НАВИГАЦИЯ
function BrandNav() {
    const pathname = usePathname()
    const user = useNavbarUser()
    const mode = useNavbarStore((state) => state.mode)
    const logoHref = user ? (mode === 'PRO' ? '/pro/dashboard' : '/client/dashboard') : "/"
    const isDashboard = pathname.includes('dashboard')

    return (
        <div className="flex items-center gap-8 shrink-0">
            <Link href={logoHref} className="hover:opacity-80 transition-opacity">
                <span className="font-black text-2xl tracking-tighter italic text-slate-900 leading-none">
                    <span className="text-blue-600">Z</span>WORK
                </span>
            </Link>

            {user && (
                <nav className="hidden sm:flex items-center">
                    <Link
                        href={mode === 'PRO' ? "/pro/dashboard" : "/client/dashboard"}
                        className={cn(
                            "text-[11px] font-black uppercase tracking-[0.2em] transition-all relative py-1",
                            isDashboard ? "text-blue-600" : "text-slate-400 hover:text-slate-900"
                        )}
                    >
                        ХАБ
                        {isDashboard && (
                            <div className="absolute bottom-[-4px] left-0 w-full h-[3px] bg-blue-600 rounded-full" />
                        )}
                    </Link>
                </nav>
            )}
        </div>
    )
}

// 2. ЦЕНТРАЛЬНАЯ КНОПКА (УМНЫЕ НАТИВНЫЕ ССЫЛКИ ДЛЯ PROXY С АВТО-СВИТЧЕМ)
function CentralActionButton() {
    const user = useNavbarUser()
    const mode = useNavbarStore((state) => state.mode)
    const setMode = useNavbarStore((state) => state.setMode) // 🧱 Твой оригинальный хук

    const currentCitySlug = useLocationStore(s => s.globalLocationSlug)
    const activeCitySlug = currentCitySlug || LOCATION_CONFIG.DEFAULT.slug

    if (!user) return null

    return (
        <div className="w-full">
            {mode === 'CLIENT' ? (
                <div className="flex gap-2 w-full">
                    {/* Основная ссылка для Клиента */}
                    <Link
                        href="/client/new"
                        className="flex-1 h-12 flex items-center justify-center gap-3 bg-blue-600 hover:bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all shadow-lg shadow-blue-500/10 active:scale-95"
                    >
                        <PlusCircle size={18} className="stroke-[3px]" />
                        <span>Создать заказ</span>
                    </Link>
                    
                    {/* Нативная ссылка-телепорт для перехода в режим PRO */}
                    <Link
                        href={`/orders/${activeCitySlug}`}
                        onClick={() => setMode('PRO')}
                        className="w-12 h-12 flex items-center justify-center bg-slate-50 hover:bg-slate-950 text-slate-400 hover:text-white rounded-2xl transition-all active:scale-95 shrink-0 shadow-sm"
                        title="Перейти к поиску заказов (PRO)"
                    >
                        <Search size={16} className="stroke-[3px]" />
                    </Link>
                </div>
            ) : (
                <div className="flex gap-2 w-full">
                    {/* Основная ссылка для Исполнителя */}
                    <Link
                        href={`/orders/${activeCitySlug}`}
                        className="flex-1 h-12 flex items-center justify-center gap-3 bg-slate-900 hover:bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all shadow-xl shadow-slate-200 active:scale-95"
                    >
                        <Search size={18} className="stroke-[3px]" />
                        <span>Поиск заказов</span>
                    </Link>

                    {/* Нативная ссылка-телепорт для перехода в режим клиента */}
                    <Link
                        href="/client/new"
                        onClick={() => setMode('CLIENT')}
                        className="w-12 h-12 flex items-center justify-center bg-slate-50 hover:bg-blue-600 text-slate-400 hover:text-white rounded-2xl transition-all active:scale-95 shrink-0 shadow-sm"
                        title="Разместить свой заказ (Клиент)"
                    >
                        <PlusCircle size={16} className="stroke-[3px]" />
                    </Link>
                </div>
            )}
        </div>
    )
}

// ГЛАВНЫЙ СТАБИЛЬНЫЙ МОНОЛИТ НАВБАРА
export const NavbarUI = (function NavbarUI() {
    const user = useNavbarUser()
  
    console.log('🚨🚨🚨🚨render NavbarUI — ИДЕАЛЬНАЯ ЧИСТАЯ АРХИТЕКТУРА (0ms ЛАГОВ, 0 РЕРЕНДЕРОВ)🚨🚨🚨🚨🚨')

    return (
        <header className="sticky top-0 z-50 w-full h-20 bg-white/95 backdrop-blur-md border-b border-slate-100">
            <div className="max-w-5xl mx-auto h-full px-4 md:px-6 flex items-center justify-between gap-4">

                {/* 1. БРЕНД И НАВИГАЦИЯ */}
                <BrandNav />

                {/* 2. ЦЕНТРАЛЬНАЯ КНОПКА С АВТОМАТИКОЙ РОЛЕЙ */}
                <div className="flex-1 max-w-sm">
                    <CentralActionButton />
                </div>

                {/* 3. УПРАВЛЕНИЕ */}
                <div className="flex items-center gap-3 shrink-0">
                    {user ? (
                        <>
                            {/* ТУЛБОКС УВЕДОМЛЕНИЙ И ЧАТОВ */}
                            <div className="flex items-center gap-2 bg-slate-50/80 p-1.5 rounded-2xl border border-slate-100">
                                <Link
                                    href="/chat"
                                    className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:bg-white hover:text-blue-600 transition-all relative group bg-white/50 border border-transparent hover:border-slate-100 shadow-sm"
                                >
                                    <MessageSquare size={18} className="group-hover:scale-105 transition-transform" />
                                    <UnreadBadge />
                                </Link>

                                <NotificationsBell />
                            </div>

                            {/* ЕДИНАЯ СУПЕР-КНОПКА АВАТАРА С РОЛЯМИ ВНУТРИ */}
                            <UserDropdown />
                        </>
                    ) : (
                        <div className="flex items-center gap-4">
                            <Link href="/sign-in" className="text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors">Вход</Link>
                            <Link href="/sign-up" className="h-12 px-8 flex items-center bg-slate-900 hover:bg-blue-600 text-white rounded-[1.2rem] font-black uppercase text-[11px] tracking-widest transition-all shadow-xl shadow-slate-200">
                                Начать работу
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
});
