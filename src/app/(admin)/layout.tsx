import { getServerSession } from "@/lib/get-session"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { 
  LayoutDashboard, 
  Users, 
  Zap, 
  ShieldAlert, 
  LogOut, 
  ShieldCheck, 
  Settings, 
  Database 
} from "lucide-react"
import { isAdmin, isSuperAdmin } from "@/lib/auth-client"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession()
    const role = session?.user?.role
    
    // Если не админ и не суперадмин — на выход
    if (!isAdmin(role)) notFound()

    const superMode = isSuperAdmin(role)

    return (
        <div className="fixed inset-0 flex bg-slate-50">
            {/* СУРОВЫЙ ТЕМНЫЙ САЙДБАР */}
            <aside className="w-72 bg-slate-900 flex flex-col p-8 shrink-0 text-white shadow-2xl z-20">
                <div className="mb-16">
                    <span className="font-black text-3xl tracking-tighter italic uppercase">
                        <span className="text-blue-500">Z</span>ADMIN
                    </span>
                    {/* Динамический статус под логотипом */}
                    <p className={`text-[8px] font-black uppercase tracking-[0.5em] mt-2 ${superMode ? "text-blue-400" : "text-slate-500"}`}>
                        {superMode ? "Root / Super Access" : "Staff / Restricted"}
                    </p>
                </div>

                <nav className="space-y-2 flex-1">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-4 mb-4">Основные</p>
                    <AdminLink href="/admin" icon={<LayoutDashboard size={18} />} label="Обзор" />
                    <AdminLink href="/admin/users" icon={<Users size={18} />} label="Пользователи" />
                    <AdminLink href="/admin/orders" icon={<Zap size={18} />} label="Все заказы" />

                    {/* СЕКЦИЯ ТОЛЬКО ДЛЯ SUPERADMIN */}
                    {superMode && (
                        <div className="pt-10 space-y-2">
                            <p className="text-[9px] font-black text-blue-500/50 uppercase tracking-widest px-4 mb-4 italic">Super Control</p>
                            <AdminLink 
                                href="/admin/staff" 
                                icon={<ShieldCheck size={18} className="text-blue-400" />} 
                                label="Команда" 
                            />
                            <AdminLink 
                                href="/admin/system" 
                                icon={<Database size={18} />} 
                                label="База данных" 
                            />
                            <AdminLink 
                                href="/admin/security" 
                                icon={<ShieldAlert size={18} />} 
                                label="Безопасность" 
                            />
                        </div>
                    )}
                </nav>

                <div className="pt-8 border-t border-white/5">
                    <Link href="/client/dashboard" className="flex items-center gap-3 text-[10px] font-black uppercase text-slate-400 hover:text-white transition-all group">
                        <LogOut size={14} className="group-hover:-translate-x-1 transition-transform" />
                        Выход в сервис
                    </Link>
                </div>
            </aside>

            {/* КОНТЕНТНАЯ ОБЛАСТЬ */}
            <main className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-[#F8FAFC]">
                <div className="max-w-6xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    )
}

function AdminLink({ href, icon, label }: any) {
    // В реальном проекте здесь лучше добавить проверку на active через usePathname, 
    // но оставляем твою структуру для чистоты дизайна
    return (
        <Link href={href} className="flex items-center gap-4 px-5 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all group text-slate-400 hover:bg-white/5 hover:text-white active:scale-95">
            <span className="opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all">{icon}</span>
            {label}
        </Link>
    )
}
