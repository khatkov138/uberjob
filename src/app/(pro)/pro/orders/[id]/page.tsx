"use client"

import * as React from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { acceptOrderDetails, getProOrderDetails, startOrderWork } from "./actions"
import { completeOrder } from "@/app/actions/orders"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, MapPin, Clock, Phone, Navigation, CheckCircle2, Play, MessageCircle } from "lucide-react"
import { toast } from "sonner"
import { ChatBox } from "@/components/chat/chat-box"
import { cn } from "@/lib/utils"



export default function ProOrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: orderId } = React.use(params)

    const { data: order, isLoading, refetch } = useQuery({
        queryKey: ["pro-order", orderId],
        queryFn: () => getProOrderDetails(orderId),
        refetchInterval: 5000, // Опрос сервера для чата
    })

    const startMutation = useMutation({
        mutationFn: () => startOrderWork(orderId),
        onSuccess: () => {
            toast.success("Статус обновлен: В работе")
            refetch()
        }
    })

    if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-600" /></div>
    if (!order) return <div className="text-center p-20 font-bold">Заказ не найден или занят</div>

    const isPending = order.status === "PENDING"
    const isAccepted = order.status === "ACCEPTED"
    const isInProgress = order.status === "IN_PROGRESS"
    const isCompleted = order.status === "COMPLETED"


    const openNavigation = () => {
        if (!order?.lat || !order?.lng) return;

        const protocol = "https://";
        const domain = "www.google.com";
        const path = "/maps/search/";
        const params = "?api=1&query=";

        // Собираем всё по частям, чтобы ничего не потерялось
        const url = protocol + domain + path + params + order.lat + "," + order.lng;

        window.open(url, "_blank");
    };
    return (
        <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
            {/* ШАПКА */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <h1 className="text-3xl font-black tracking-tight">{order.title}</h1>
                        <Badge variant={isCompleted ? "default" : "secondary"} className="rounded-full">
                            {order.status}
                        </Badge>
                    </div>
                    <p className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
                        <MapPin className="w-4 h-4 text-blue-600" /> {order.address}
                    </p>
                </div>
                <div className="bg-blue-600 text-white p-4 rounded-3xl text-center min-w-[160px] shadow-lg shadow-blue-500/20">
                    <p className="text-[10px] opacity-80 uppercase font-black tracking-widest mb-1">Ваш доход</p>
                    <p className="text-3xl font-black">{order.price / 100} ₽</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Описание задачи */}
                    <section className="bg-card border-2 border-dashed rounded-3xl p-6 space-y-3">
                        <h2 className="font-bold text-lg flex items-center gap-2">
                            <Clock className="w-4 h-4 text-blue-500" /> Суть задачи
                        </h2>
                        <p className="text-slate-700 leading-relaxed italic text-lg">
                            "{order.description}"
                        </p>
                    </section>

                    {/* Информация о заказчике */}
                    <section className="space-y-4">
                        <h2 className="font-bold text-lg">Заказчик</h2>
                        <div className="flex items-center justify-between p-5 bg-muted/20 rounded-3xl border border-blue-500/10">
                            <div className="flex items-center gap-4">
                                <Avatar className="h-14 w-14 border-2 border-white shadow-sm">
                                    <AvatarImage src={order.client.image || ""} />
                                    <AvatarFallback>{order.client.name?.slice(0, 2)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-black text-lg leading-none">{order.client.name}</p>
                                    <p className="text-xs text-muted-foreground mt-1">Клиент на UberJob</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button size="icon" variant="outline" className="rounded-full shadow-sm">
                                    <Phone className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </section>

                    {/* СЕКЦИЯ ЧАТА (только если заказ уже не PENDING) */}
                    {!isPending && (
                        <section id="chat-box" className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h2 className="font-bold text-lg flex items-center gap-2">
                                Чат с клиентом <MessageCircle className="w-4 h-4 text-blue-500" />
                            </h2>
                            <ChatBox
                                orderId={orderId}
                                currentUserId={order.workerId}
                                initialMessages={order.messages}
                            />
                        </section>
                    )}
                </div>

                {/* ПАНЕЛЬ УПРАВЛЕНИЯ */}
                <div className="space-y-6">
                    <Card className="shadow-2xl border-none overflow-hidden rounded-3xl bg-slate-900 text-white">
                        <div className="bg-white/5 p-4 border-b border-white/10">
                            <p className="text-xs font-bold uppercase tracking-widest opacity-70">Действия</p>
                        </div>

                        <CardContent className="p-4 space-y-3">
                            {isPending && (
                                <Button
                                    className="w-full h-14 font-black text-lg bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/30"
                                    onClick={async () => {
                                        const res = await acceptOrderDetails(order.id)
                                        if (res.success) {
                                            toast.success("Вы назначены исполнителем!")
                                            refetch()
                                        } else {
                                            toast.error(res.error)
                                        }
                                    }}
                                >
                                    Взять в работу
                                </Button>
                            )}

                            {isAccepted && (
                                <Button
                                    className="w-full h-14 font-bold gap-2 bg-blue-500 hover:bg-blue-400"
                                    onClick={() => startMutation.mutate()}
                                    disabled={startMutation.isPending}
                                >
                                    <Play className="w-4 h-4 fill-current" />
                                    Начать выполнение
                                </Button>
                            )}

                            {isInProgress && (
                                <div className="space-y-3">
                                    <div className="p-4 bg-blue-500/10 text-blue-400 rounded-2xl text-xs font-bold border border-blue-500/20 flex items-center gap-2">
                                        <Loader2 className="w-3 h-3 animate-spin" /> Статус: Выполняется...
                                    </div>
                                    <Button
                                        className="w-full h-14 font-bold gap-2 bg-emerald-600 hover:bg-emerald-500"
                                        onClick={async () => {
                                            const res = await completeOrder(order.id)
                                            if (res.success) {
                                                toast.success("Работа завершена!")
                                                refetch()
                                            }
                                        }}
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                        Завершить работу
                                    </Button>
                                </div>
                            )}

                            {isCompleted && (
                                <div className="text-center py-6 space-y-2 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                                    <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400" />
                                    <p className="font-bold text-emerald-400">Работа завершена</p>
                                </div>
                            )}

                            

                            <Button
                                onClick={openNavigation}
                                variant="ghost" className="w-full gap-2 text-white/60 hover:text-white hover:bg-white/10 h-12">
                                <Navigation className="w-4 h-4" /> Маршрут
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
