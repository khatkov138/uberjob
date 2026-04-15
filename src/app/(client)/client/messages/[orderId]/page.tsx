import { getServerSession } from "@/lib/get-session"
import prisma from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import { ChatWindow } from "../chat-window"

export default async function ChatPage({
    params,
    searchParams
}: {
    params: Promise<{ orderId: string }>,
    searchParams: Promise<{ workerId: string }>
}) {
    // 1. Разворачиваем параметры (Next.js 15 Requirement)
    const { orderId } = await params
    const { workerId } = await searchParams

    // 2. Проверяем сессию
    const session = await getServerSession()
    if (!session?.user) redirect("/login")

    if (!workerId) return notFound()

    // 3. Загружаем данные заказа и исполнителя параллельно
    const [order, worker] = await Promise.all(
        [
            prisma.order.findUnique({
                where: { id: orderId },
                select: { id: true, title: true, clientId: true }
            }),
            prisma.user.findUnique({
                where: { id: workerId },
                select: { id: true, name: true, image: true }
            })
        ]
    )

    // 4. Проверка существования и прав доступа
    if (!order || !worker) return notFound()

    // Безопасность: только владелец заказа может инициировать этот чат через клиентский роут
    if (order.clientId !== session.user.id) {
        return notFound()
    }

    return (
         <main className="h-full bg-slate-50/50 flex flex-col items-center overflow-hidden">
            
            {/* ОГРАНИЧИТЕЛЬ ШИРИНЫ ДЛЯ ВСЕЙ СТРАНИЦЫ */}
            <div className="w-full max-w-5xl bg-white h-full flex flex-col border-x border-slate-100 shadow-sm overflow-hidden">
                
                {/* HEADER ЧАТА (Внутри контейнера) */}
                <div className="flex-none p-4 md:p-6 border-b border-slate-100 flex items-center justify-between bg-white z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black text-xl shadow-lg border-2 border-slate-800 shrink-0">
                            {worker.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none mb-1">
                                Переписка
                            </p>
                            <h1 className="text-lg md:text-xl font-black uppercase italic tracking-tighter text-slate-900 truncate">
                                {worker.name}
                            </h1>
                        </div>
                    </div>
                    
                    <div className="text-right hidden sm:block">
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-0.5">Контекст заказа</p>
                        <p className="text-xs font-bold text-slate-500 truncate max-w-[200px] italic leading-none">
                            {order.title}
                        </p>
                    </div>
                </div>

                {/* MESSAGES AREA */}
                <div className="flex-1 min-h-0 relative"> 
                    <ChatWindow 
                        orderId={orderId} 
                        workerId={workerId} 
                        currentUserId={session.user.id} 
                    />
                </div>
            </div>
        </main>
    )
}
