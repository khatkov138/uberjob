"use client"

import { useQuery } from "@tanstack/react-query"
import { getOrderDetails, confirmOrderCompletion } from "./actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, MapPin, Clock, Star, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import { use } from "react"

export default function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {

    const unwrappedParams = use(params)
    const orderId = unwrappedParams.id

    const { data: order, isLoading, refetch } = useQuery({
        queryKey: ["order", orderId], // Используем уже распакованный id
        queryFn: () => getOrderDetails(orderId),
    })

    if (isLoading) return <Loader2 className="mx-auto mt-20 animate-spin" />
    if (!order) return <div className="text-center mt-20 font-bold">Заказ не найден</div>

    const isCompleted = order.status === "COMPLETED"
    const hasWorker = !!order.worker

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
            {/* Шапка заказа */}
            <div className="flex flex-col md:flex-row justify-between gap-4 border-b pb-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-black">{order.title}</h1>
                        <Badge variant={isCompleted ? "default" : "secondary"}>{order.status}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-muted-foreground text-sm">
                        <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {order.address}</span>
                        <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {new Date(order.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-sm text-muted-foreground">Бюджет</p>
                    <p className="text-3xl font-black text-blue-600">{order.price / 100} ₽</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Описание */}
                <div className="lg:col-span-2 space-y-6">
                    <section className="space-y-2">
                        <h2 className="font-bold text-lg">Описание задачи</h2>
                        <p className="text-muted-foreground leading-relaxed bg-muted/20 p-4 rounded-xl">
                            {order.description}
                        </p>
                    </section>

                    {/* Статус выполнения */}
                    {!hasWorker ? (
                        <div className="p-8 border-2 border-dashed rounded-2xl text-center space-y-4">
                            <div className="flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
                            <p className="font-bold">Ищем лучших мастеров поблизости...</p>
                            <p className="text-sm text-muted-foreground">Обычно это занимает не более 15 минут</p>
                        </div>
                    ) : (
                        <section className="space-y-4">
                            <h2 className="font-bold text-lg">Ваш исполнитель</h2>
                            <Card className="border-blue-500/20 bg-blue-50/10">
                                <CardContent className="p-6 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-14 w-14 border-2 border-white shadow-sm">
                                            <AvatarImage src={order.worker?.image || ""} />
                                            <AvatarFallback>{order.worker?.name?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-bold text-lg">{order.worker?.name}</p>
                                            <div className="flex items-center gap-1 text-amber-500">
                                                <Star className="w-4 h-4 fill-current" />
                                                <span className="text-sm font-bold">{order.worker?.workerProfile?.rating || "5.0"}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <Button variant="outline" className="rounded-full">Чат с мастером</Button>
                                </CardContent>
                            </Card>
                        </section>
                    )}
                </div>

                {/* Боковая панель действий */}
                <div className="space-y-4">
                    <Card className="p-6 bg-slate-900 text-white border-none shadow-xl">
                        <h3 className="font-bold mb-4">Управление заказом</h3>
                        {order.status === "COMPLETED" ? (
                            <div className="text-center space-y-2">
                                <CheckCircle className="w-10 h-10 text-green-400 mx-auto" />
                                <p className="font-bold text-sm">Заказ выполнен!</p>
                                <Button className="w-full mt-2" variant="secondary">Оставить отзыв</Button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <p className="text-xs opacity-70">Если мастер закончил работу, подтвердите выполнение:</p>
                                <Button
                                    className="w-full font-bold"
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
                                <Button variant="ghost" className="w-full text-red-400 hover:text-red-500 hover:bg-red-500/10">
                                    Отменить заказ
                                </Button>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    )
}