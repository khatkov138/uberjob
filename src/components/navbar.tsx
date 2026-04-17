"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserDropdown } from "@/components/user-dropdown"
import { NotificationsBell } from "./notifications-bell"
import { useRoleModeStore } from "@/store/use-role-store"
import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"
import { MessageSquare, PlusCircle, Search, Radio } from "lucide-react"
import { RoleSwitcher } from "./shared/role-switcher"

export default function Navbar() {
    const { data: session } = authClient.useSession()
    const user = session?.user
    const { mode } = useRoleModeStore()
    const pathname = usePathname()

    const [mounted, setMounted] = React.useState(false)
    React.useEffect(() => setMounted(true), [])


    const isAdminPage = pathname.startsWith('/admin')
    if (isAdminPage) return null

    const logoHref = user ? (mode === 'PRO' ? '/pro/dashboard' : '/client/dashboard') : "/"

    return (
        <header className="sticky top-0 z-50 w-full h-20 bg-white/95 backdrop-blur-md border-b border-slate-100">
            <div className="max-w-5xl mx-auto h-full px-4 md:px-6 flex items-center justify-between gap-4">

                {/* 1. БРЕНД И КОРНЕВАЯ НАВИГАЦИЯ */}
                <div className="flex items-center gap-8 shrink-0">
                    <Link href={logoHref} className="hover:opacity-80 transition-opacity">
                        <span className="font-black text-2xl tracking-tighter italic text-slate-900 leading-none">
                            <span className="text-blue-600">Z</span>WORK
                        </span>
                    </Link>

                    {mounted && user && (
                        <nav className="hidden sm:flex items-center">
                            <Link
                                href={mode === 'PRO' ? "/pro/dashboard" : "/client/dashboard"}
                                className={cn(
                                    "text-[11px] font-black uppercase tracking-[0.2em] transition-all relative py-1",
                                    pathname.includes('dashboard') ? "text-blue-600" : "text-slate-400 hover:text-slate-900"
                                )}
                            >
                                ХАБ
                                {pathname.includes('dashboard') && (
                                    <div className="absolute bottom-[-4px] left-0 w-full h-[3px] bg-blue-600 rounded-full" />
                                )}
                            </Link>
                        </nav>
                    )}
                </div>

                {/* 2. ЦЕНТРАЛЬНАЯ КНОПКА ДЕЙСТВИЯ (Инструментальный блок) */}
                <div className="flex-1 max-w-sm">
                    {mounted && user && (
                        <div className="animate-in fade-in zoom-in-95 duration-500">
                            {mode === 'CLIENT' ? (
                                <Link
                                    href="/client/new-order"
                                    className="w-full h-12 flex items-center justify-center gap-3 bg-blue-600 hover:bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all shadow-lg shadow-blue-500/10 active:scale-95"
                                >
                                    <PlusCircle size={18} className="stroke-[3px]" />
                                    <span>Создать заказ</span>
                                </Link>
                            ) : (
                                <Link
                                    href="/pro/feed"
                                    className="w-full h-12 flex items-center justify-center gap-3 bg-slate-900 hover:bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all shadow-xl shadow-slate-200 active:scale-95"
                                >
                                    <Search size={18} className="stroke-[3px]" />
                                    <span>Найти работу</span>
                                </Link>
                            )}
                        </div>
                    )}
                </div>

                {/* 3. УПРАВЛЕНИЕ И СТАТУС */}
                <div className="flex items-center gap-3 shrink-0">
                    {mounted && user ? (
                        <>
                            <div className="hidden lg:block">
                                <RoleSwitcher />
                            </div>

                            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-[1.3rem] border border-slate-100 relative">
                                {/* ГЛОБАЛЬНЫЙ ИНДИКАТОР ОНЛАЙНА */}
                                <div className="absolute -top-1.5 -left-1.5 z-20">
                                    <div className="relative flex items-center justify-center h-4 w-4 bg-white rounded-full shadow-sm border border-slate-100">
                                        <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </div>
                                </div>

                                {/* СООБЩЕНИЯ */}
                                <Link
                                    href="/messages"
                                    className="w-11 h-11 flex items-center justify-center rounded-xl text-slate-400 hover:bg-white hover:text-blue-600 transition-all relative group bg-white/50 border border-transparent hover:border-slate-200 shadow-sm"
                                >
                                    <MessageSquare size={20} className="group-hover:scale-110 transition-transform" />
                                    <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-blue-600 rounded-full border-2 border-white" />
                                </Link>

                                {/* УВЕДОМЛЕНИЯ */}
                                <NotificationsBell />
                            </div>

                            <UserDropdown user={user as any} />
                        </>
                    ) : (
                        mounted && (
                            <div className="flex items-center gap-4">
                                <Link href="/sign-in" className="text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors">Вход</Link>
                                <Link href="/sign-up" className="h-12 px-8 flex items-center bg-slate-900 hover:bg-blue-600 text-white rounded-[1.2rem] font-black uppercase italic text-[11px] tracking-widest transition-all shadow-xl shadow-slate-200">
                                    Начать работу
                                </Link>
                            </div>
                        )
                    )}
                </div>
            </div>
        </header>
    )
}
