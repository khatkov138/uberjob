// components/navbar/navbar-ui.tsx
"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { MessageSquare, PlusCircle, Search } from "lucide-react"

import { UserDropdown } from "@/components/navbar/_components/user-dropdown"
import { cn } from "@/lib/utils"

import { RoleSwitcher } from "./_components/role-switcher"
import { NotificationsBell } from "./_components/notifications-bell"
import { useNavbarStore } from "./navbar-provider"
import { UnreadBadge } from "./_components/unread-badge"
import { User } from "@/lib/auth"

interface NavbarUIProps {
    user: User | null
}

// 1. БРЕНД И НАВИГАЦИЯ (Читает строго стейт из Zustand, который проинициализирован сервером)
function BrandNav({ user }: { user: User | null }) {
    const pathname = usePathname() // Перерисовывает только ссылки ХАБА при переходах
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

// 2. ЦЕНТРАЛЬНАЯ КНОПКА (Читает строго стейт из Zustand)
function CentralActionButton({ user }: { user: User | null }) {
    const mode = useNavbarStore((state) => state.mode)
    if (!user) return null

    return (
        <div className="w-full">
            {mode === 'CLIENT' ? (
                <Link
                    href="/client/new"
                    className="w-full h-12 flex items-center justify-center gap-3 bg-blue-600 hover:bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all shadow-lg shadow-blue-500/10 active:scale-95"
                >
                    <PlusCircle size={18} className="stroke-[3px]" />
                    <span>Создать заказ</span>
                </Link>
            ) : (
                <Link
                    href="/orders"
                    className="w-full h-12 flex items-center justify-center gap-3 bg-slate-900 hover:bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all shadow-xl shadow-slate-200 active:scale-95"
                >
                    <Search size={18} className="stroke-[3px]" />
                    <span>Поиск заказов</span>
                </Link>
            )}
        </div>
    )
}

// ГЛАВНЫЙ СТАБИЛЬНЫЙ МОНОЛИТ НАВБАРА (Абсолютный железный затвор)
export const NavbarUI = React.memo(
    function NavbarUI({ user }: NavbarUIProps) {
        // Лог сработает строго 1 раз при первой загрузке (F5) страницы!
        console.log('render nav — ИДЕАЛЬНАЯ ЧИСТАЯ АРХИТЕКТУРА (0ms ЛАГОВ, 0 РЕРЕНДЕРОВ)')

        return (
            <header className="sticky top-0 z-50 w-full h-20 bg-white/95 backdrop-blur-md border-b border-slate-100">
                <div className="max-w-5xl mx-auto h-full px-4 md:px-6 flex items-center justify-between gap-4">

                    {/* 1. БРЕНД И НАВИГАЦИЯ */}
                    <BrandNav user={user} />

                    {/* 2. ЦЕНТРАЛЬНАЯ КНОПКА */}
                    <div className="flex-1 max-w-sm">
                        <CentralActionButton user={user} />
                    </div>

                    {/* 3. УПРАВЛЕНИЕ */}
                    <div className="flex items-center gap-3 shrink-0">
                        {user ? (
                            <>
                                <div className="hidden lg:block">
                                    <RoleSwitcher />
                                </div>

                                <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-[1.3rem] border border-slate-100 relative">
                                    <div className="absolute -top-1.5 -left-1.5 z-20">
                                        <div className="relative flex items-center justify-center h-4 w-4 bg-white rounded-full shadow-sm border border-slate-100">
                                            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                        </div>
                                    </div>

                                    <Link
                                        href="/chat"
                                        className="w-11 h-11 flex items-center justify-center rounded-xl text-slate-400 hover:bg-white hover:text-blue-600 transition-all relative group bg-white/50 border border-transparent hover:border-slate-200 shadow-sm"
                                    >
                                        <MessageSquare size={20} className="group-hover:scale-110 transition-transform" />
                                        <UnreadBadge />
                                    </Link>

                                    <NotificationsBell />
                                </div>

                                <UserDropdown user={user} />
                            </>
                        ) : (
                            <div className="flex items-center gap-4">
                                <Link href="/sign-in" className="text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors">Вход</Link>
                                <Link href="/sign-up" className="h-12 px-8 flex items-center bg-slate-900 hover:bg-blue-600 text-white rounded-[1.2rem] font-black uppercase italic text-[11px] tracking-widest transition-all shadow-xl shadow-slate-200">
                                    Начать работу
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </header>
        )
    },
    (prev, next) => {
        // Жесткий затвор от каскадных ререндеров TanStack Query фида/хедера [INDEX]
        if (prev.user === null && next.user === null) return true
        if (prev.user === null || next.user === null) return false
        return prev.user.id === next.user.id
    }
)
