"use client"

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserDropdown } from "@/components/user-dropdown";
import { NotificationsBell } from "./notifications-bell";
import { useRoleModeStore } from "@/store/use-role-store";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { MessageSquare } from "lucide-react";
import { RoleSwitcher } from "./shared/role-switcher";
import { Button } from "@/components/ui/button";

export default function Navbar() {
    const { data: session } = authClient.useSession();
    const user = session?.user;
    const { mode } = useRoleModeStore();
    const pathname = usePathname();

    // 🛡️ ЗАЩИТА ОТ ОШИБОК ГИДРАТАЦИИ
    const [mounted, setMounted] = React.useState(false);

    // useEffect срабатывает только на клиенте после первого рендера
    React.useEffect(() => {
        setMounted(true);
    }, []);

    const logoHref = user ? (mode === 'PRO' ? '/pro/dashboard' : '/client/dashboard') : "/";

    // ПЕРЕВОД И ПОДСВЕТКА
    const links = mode === 'PRO' 
        ? [
            { name: "ХАБ", href: "/pro/dashboard" },
            { name: "ЛЕНТА", href: "/pro/feed" },
            { name: "ОТКЛИКИ", href: "/pro/my-offers" },
            { name: "ЗАДАЧИ", href: "/pro/my-orders" },
          ]
        : [
            { name: "ХАБ", href: "/client/dashboard" },
            { name: "МОИ ЗАКАЗЫ", href: "/client/my-orders" },
          ];

    return (
        <header className="sticky top-0 z-50 w-full h-20 bg-white border-b border-slate-100">
            <div className="max-w-5xl mx-auto h-full px-4 md:px-6 flex items-center justify-between">
                
                {/* ЛЕВО: ЛОГО + НАВИГАЦИЯ */}
                <div className="flex items-center gap-10">
                    <Link href={logoHref} className="hover:opacity-80 transition-opacity shrink-0">
                        <span className="font-black text-2xl tracking-tighter italic text-slate-900 leading-none">
                            <span className="text-blue-600">Z</span>WORK
                        </span>
                    </Link>

                    <nav className="hidden lg:flex items-center gap-6">
                        {/* Показываем ссылки только после монтирования, чтобы избежать мерцания ролей */}
                        {mounted && user && links.map((link) => (
                            <Link 
                                key={link.href} 
                                href={link.href}
                                className={cn(
                                    "text-[11px] font-black uppercase tracking-[0.2em] transition-all relative py-1",
                                    pathname === link.href 
                                        ? "text-blue-600 after:absolute after:bottom-[-4px] after:left-0 after:w-full after:h-[3px] after:bg-blue-600 after:rounded-full" 
                                        : "text-slate-400 hover:text-slate-900"
                                )}
                            >
                                {link.name}
                            </Link>
                        ))}
                    </nav>
                </div>

                {/* ПРАВО: СВИТЧЕР + ИКОНКИ / КНОПКИ ВХОДА */}
                <div className="flex items-center gap-4">
                    {/* Если неmounted — показываем пустую заглушку, чтобы контент не прыгал */}
                    {!mounted ? (
                        <div className="h-10 w-24 bg-slate-50 animate-pulse rounded-2xl" />
                    ) : user ? (
                        <>
                            <RoleSwitcher />
                            
                            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                                <Link 
                                    href="/messages" 
                                    className="w-11 h-11 flex items-center justify-center rounded-xl text-slate-400 hover:bg-white hover:text-blue-600 transition-all relative group bg-white/50 border border-transparent hover:border-slate-200 shadow-sm"
                                >
                                    <MessageSquare className="w-5 h-5" />
                                    <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-blue-600 rounded-full border-2 border-white shadow-sm" />
                                </Link>
                                <NotificationsBell />
                            </div>
                            <UserDropdown user={user as any} />
                        </>
                    ) : (
                        <div className="flex items-center gap-3">
                            <Link 
                                href="/sign-in" 
                                className="text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors px-4"
                            >
                                Вход
                            </Link>
                            <Button asChild className="rounded-2xl h-12 px-8 bg-slate-900 hover:bg-blue-600 text-white font-black uppercase italic text-[11px] tracking-widest transition-all shadow-xl shadow-slate-200 active:scale-95">
                                <Link href="/sign-up">Начать работу</Link>
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
