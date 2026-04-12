"use client"

import { useQuery } from "@tanstack/react-query"
import { getOrderDetails, confirmOrderCompletion } from "./actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, MapPin, Clock, Star, CheckCircle, MessageCircle } from "lucide-react"
import { toast } from "sonner"
import { use } from "react"
import { ReviewForm } from "./review-form"
import { ChatBox } from "@/components/chat/chat-box" // Путь к твоему компоненту чата
import { cn } from "@/lib/utils"

export default function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: orderId } = use(params)

    const { data: order, isLoading, refetch } = useQuery({
        queryKey: ["order", orderId],
        queryFn: () => getOrderDetails(orderId),
        refetchInterval: 5000, // Обновляем раз в 5 сек для "живого" чата без сокетов
    })

    if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div>
    if (!order) return <div className="text-center mt-20 font-bold">Заказ не найден</div>

    const isCompleted = order.status === "COMPLETED"
    const hasWorker = !!order.worker

    const steps = [
        { label: "Поиск", active: true },
        { label: "Выбран", active: order.status !== "PENDING" },
        { label: "В работе", active: ["IN_PROGRESS", "COMPLETED"].includes(order.status) },
        { label: "Готово", active: order.status === "COMPLETED" },
    ]

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-8">
            {/* 1. STEPPER */}
            <div className="relative flex justify-between items-center max-w-2xl mx-auto px-4">
                {steps.map((step, idx) => (
                    <div key={step.label} className="flex flex-col items-center z-10">
                        <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500",
                            step.active ? "bg-blue-600 border-blue-600 text-white" : "bg-background border-muted text-muted-foreground"
                        )}>
                            <span className="text-xs font-bold">{idx + 1}</span>
                        </div>
                        <span className="text-[10px] mt-2 font-bold uppercase tracking-tight">{step.label}</span>
                    </div>
                ))}
                <div className="absolute top-4 left-0 w-full h-[2px] bg-muted -z-0" />
            </div>

            {/* 2. ШАПКА */}
            <div className="flex flex-col md:flex-row justify-between gap-4 border-b pb-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-black tracking-tight">{order.title}</h1>
                        <Badge variant={isCompleted ? "default" : "secondary"} className="rounded-full">
                            {order.status}
                        </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-sm">
                        <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {order.address}</span>
                        <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {new Date(order.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
                <div className="text-left md:text-right bg-blue-50 p-4 rounded-2xl border border-blue-100">
                    <p className="text-xs font-bold text-blue-600 uppercase">Бюджет</p>
                    <p className="text-3xl font-black text-blue-700">{order.price / 100} ₽</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Описание */}
                    <section className="space-y-3">
                        <h2 className="font-bold text-lg">Описание задачи</h2>
                        <p className="text-slate-700 leading-relaxed bg-muted/20 p-6 rounded-3xl border border-dashed text-lg">
                            {order.description}
                        </p>
                    </section>

                    {/* Исполнитель и Чат */}
                    {!hasWorker ? (
                        <div className="p-10 border-2 border-dashed rounded-3xl text-center space-y-4 bg-blue-50/30">
                            <div className="flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>
                            <p className="text-xl font-bold">Ищем лучших мастеров...</p>
                            <p className="text-muted-foreground font-medium">Категория: {order.category}</p>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-in fade-in duration-700">
                            <section className="space-y-4">
                                <h2 className="font-bold text-lg">Ваш исполнитель</h2>
                                <Card className="border-none shadow-xl shadow-blue-500/5 rounded-3xl overflow-hidden bg-card">
                                    <CardContent className="p-6 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <Avatar className="h-16 w-16 border-2 border-white shadow-sm">
                                                <AvatarImage src={order.worker?.image || ""} />
                                                <AvatarFallback>{order.worker?.name?.slice(0, 2)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-black text-xl">{order.worker?.name}</p>
                                                <div className="flex items-center gap-1 text-amber-500">
                                                    <Star className="w-4 h-4 fill-current" />
                                                    <span className="font-bold">{order.worker?.workerProfile?.rating.toFixed(1) || "5.0"}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Button 
                                            variant="secondary" 
                                            className="rounded-full gap-2 font-bold"
                                            onClick={() => document.getElementById('chat-box')?.scrollIntoView({ behavior: 'smooth' })}
                                        >
                                            <MessageCircle className="w-4 h-4" /> Чат
                                        </Button>
                                    </CardContent>
                                </Card>
                            </section>

                            {/* ЧАТБОКС */}
                            <section id="chat-box" className="space-y-4">
                                <h2 className="font-bold text-lg flex items-center gap-2">
                                    Чат с мастером <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                </h2>
                                <ChatBox 
                                    orderId={orderId} 
                                    currentUserId={order.clientId} 
                                    initialMessages={order.messages} 
                                />
                            </section>
                        </div>
                    )}
                </div>

                {/* БОКОВАЯ ПАНЕЛЬ */}
                <div className="space-y-6">
                    <Card className="p-6 bg-slate-900 text-white border-none shadow-2xl rounded-3xl">
                        <h3 className="font-bold mb-4 flex items-center gap-2 text-blue-400">
                            Управление заказом
                        </h3>
                        {isCompleted ? (
                            <div className="text-center py-4 bg-green-500/10 rounded-2xl border border-green-500/20">
                                <p className="font-bold text-green-400">Работа выполнена!</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-xs opacity-70 leading-tight">
                                    Нажмите кнопку ниже только после того, как мастер закончит работу.
                                </p>
                                <Button
                                    className="w-full h-12 font-bold rounded-xl bg-blue-600 hover:bg-blue-500"
                                    disabled={!hasWorker}
                                    onClick={async () => {
                                        const res = await confirmOrderCompletion(order.id);
                                        if (res.success) {
                                            toast.success("Заказ завершен!");
                                            refetch();
                                        }
                                    }}
                                >
                                    Принять работу
                                </Button>
                            </div>
                        )}
                    </Card>

                    {/* ОТЗЫВ */}
                    {isCompleted && order.worker?.workerProfile && (
                        <ReviewForm 
                            orderId={order.id} 
                            profileId={order.worker.workerProfile.id} 
                            initialData={order.review}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}
