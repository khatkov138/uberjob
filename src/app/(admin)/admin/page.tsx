import prisma from "@/lib/prisma"
import { Users, Zap, CheckCircle2, TrendingUp } from "lucide-react"

export default async function AdminDashboard() {
    // Параллельная загрузка всей статистики
    const [userCount, orderCount, activeOrders, completedOrders] = await Promise.all([
        prisma.user.count(),
        prisma.order.count(),
        prisma.order.count({ where: { status: 'IN_PROGRESS' } }),
        prisma.order.count({ where: { status: 'COMPLETED' } })
    ])

    return (
        <div className="max-w-6xl space-y-12">
            <header>
                <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter text-slate-900">
                    Обзор <span className="text-blue-600">Системы</span>
                </h1>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Режим: SUPERADMIN / LIVE DATA</p>
            </header>

            {/* ГРИД С ПОКАЗАТЕЛЯМИ */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <AdminStatCard title="Всего юзеров" value={userCount} icon={<Users className="text-blue-600" />} />
                <AdminStatCard title="Всего заказов" value={orderCount} icon={<Zap className="text-slate-900" />} />
                <AdminStatCard title="В процессе" value={activeOrders} icon={<TrendingUp className="text-amber-500" />} />
                <AdminStatCard title="Завершено" value={completedOrders} icon={<CheckCircle2 className="text-emerald-500" />} />
            </div>

            {/* БЛОК ПОСЛЕДНЕЙ АКТИВНОСТИ (Заглушка) */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 p-10 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-black uppercase italic tracking-tight">Лог системы</h3>
                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-[9px] font-black uppercase text-emerald-600">Система стабильна</span>
                    </div>
                </div>
                <div className="space-y-4 opacity-30 italic font-medium">
                    <p className="text-sm">Ожидание подключений к вебсокетам...</p>
                    <p className="text-sm">База данных PostgreSQL подключена (0.4ms latency)</p>
                </div>
            </div>
        </div>
    )
}

function AdminStatCard({ title, value, icon }: any) {
    return (
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 flex flex-col justify-between min-h-[160px] shadow-sm hover:-translate-y-1 transition-all">
            <div className="flex justify-between items-start">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">{title}</p>
                <div className="p-2.5 bg-slate-50 rounded-xl">{icon}</div>
            </div>
            <p className="text-5xl font-black italic tracking-tighter text-slate-900">{value}</p>
        </div>
    )
}
