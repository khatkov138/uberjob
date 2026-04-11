"use client"

import { useQuery, useMutation } from "@tanstack/react-query"
import { acceptOrderDetails, getProOrderDetails, startOrderWork } from "./actions"
import { completeOrder } from "@/app/actions/orders" // Наш старый экшен
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, MapPin, Clock, Phone, Navigation, CheckCircle2, Play } from "lucide-react"
import { toast } from "sonner"
import { use } from "react"

export default function ProOrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: orderId } = use(params)

    const { data: order, isLoading, refetch } = useQuery({
        queryKey: ["pro-order", orderId],
        queryFn: () => getProOrderDetails(orderId),
    })

    const startMutation = useMutation({
        mutationFn: () => startOrderWork(orderId),
        onSuccess: () => {
            toast.success("Статус обновлен: В работе")
            refetch()
        }
    })

    if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div>
    if (!order) return <div className="text-center p-20">Заказ не найден или уже занят</div>

    const isAccepted = order.status === "ACCEPTED"
    const isInProgress = order.status === "IN_PROGRESS"
    const isCompleted = order.status === "COMPLETED"

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <h1 className="text-3xl font-black">{order.title}</h1>
                        <Badge variant={isCompleted ? "default" : "secondary"}>{order.status}</Badge>
                    </div>
                    <p className="text-muted-foreground flex items-center gap-2">
                        <MapPin className="w-4 h-4" /> {order.address}
                    </p>
                </div>
                <div className="bg-blue-600 text-white p-4 rounded-2xl text-center min-w-[140px]">
                    <p className="text-xs opacity-80 uppercase font-bold">Ваш доход</p>
                    <p className="text-2xl font-black">{order.price / 100} ₽</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <section className="bg-card border rounded-2xl p-6 space-y-3">
                        <h2 className="font-bold text-lg">Что нужно сделать</h2>
                        <p className="text-muted-foreground leading-relaxed italic">
                            "{order.description}"
                        </p>
                    </section>

                    {/* Информация о клиенте */}
                    <section className="space-y-4">
                        <h2 className="font-bold text-lg text-blue-600">Заказчик</h2>
                        <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-dashed">
                            <div className="flex items-center gap-4">
                                <Avatar className="h-12 w-12">
                                    <AvatarImage src={order.client.image || ""} />
                                    <AvatarFallback>{order.client.name?.[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-bold">{order.client.name}</p>
                                    <p className="text-xs text-muted-foreground">Заказывает услуги с 2024 г.</p>
                                </div>
                            </div>
                            <Button size="icon" variant="outline" className="rounded-full">
                                <Phone className="w-4 h-4" />
                            </Button>
                        </div>
                    </section>
                </div>

                {/* ПАНЕЛЬ УПРАВЛЕНИЯ ЗАКАЗОМ */}
                <div className="space-y-4">
                    <Card className="shadow-lg border-2 border-primary/10 overflow-hidden">
                        <div className="bg-primary/5 p-4 border-b">
                            <p className="text-sm font-bold flex items-center gap-2">
                                <Clock className="w-4 h-4" /> Управление заказом
                            </p>
                        </div>

                        <CardContent className="p-4 space-y-3">
                            {/* СОСТОЯНИЕ 1: Заказ еще свободен (PENDING) */}
                            {order.status === "PENDING" && (
                                <Button
                                    className="w-full h-14 font-black text-lg bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20"
                                    onClick={async () => {
                                        const res = await acceptOrderDetails(order.id)
                                        if (res.success) {
                                            toast.success("Вы взяли этот заказ!")
                                            refetch()
                                        } else {
                                            toast.error(res.error)
                                        }
                                    }}
                                >
                                    Взять этот заказ
                                </Button>
                            )}

                            {/* СОСТОЯНИЕ 2: Заказ взят (ACCEPTED) */}
                            {order.status === "ACCEPTED" && (
                                <Button
                                    className="w-full h-12 font-bold gap-2 bg-slate-800 text-white"
                                    onClick={() => startMutation.mutate()}
                                    disabled={startMutation.isPending}
                                >
                                    <Play className="w-4 h-4 fill-current text-blue-400" />
                                    Начать выполнение
                                </Button>
                            )}

                            {/* СОСТОЯНИЕ 3: В процессе (IN_PROGRESS) */}
                            {order.status === "IN_PROGRESS" && (
                                <div className="space-y-3">
                                    <div className="p-3 bg-blue-50 text-blue-700 rounded-xl text-xs font-medium border border-blue-100 flex items-center gap-2">
                                        <Loader2 className="w-3 h-3 animate-spin" /> Заказ в процессе выполнения
                                    </div>
                                    <Button
                                        className="w-full h-12 font-bold gap-2 bg-green-600 hover:bg-green-700"
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

                            {/* Вспомогательные кнопки (доступны всегда) */}
                            <Button variant="outline" className="w-full gap-2 rounded-xl border-slate-200">
                                <Navigation className="w-4 h-4" /> Построить маршрут
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}