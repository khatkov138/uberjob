"use client"

import * as React from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

// UI Components
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

// Icons
import { Sparkles, MapPin, Wallet, Clock, Rocket, Loader2, Check } from "lucide-react"

import { createOrderSchema } from "@/lib/validation"
import { createOrder } from "./actions"

export default function NewOrderPage() {
    const router = useRouter()
    const [coords, setCoords] = React.useState<{ lat: number, lng: number } | null>(null);

    // Автоматический запрос гео при загрузке
    React.useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                () => console.log("Геопозиция отклонена")
            );
        }
    }, []);

    const form = useForm({
        resolver: zodResolver(createOrderSchema),
        defaultValues: {
            title: "",
            description: "",
            address: "",
            price: 1000,
            priority: "MEDIUM",
            dateType: "ASAP",
        }
    })

    const mutation = useMutation({
        mutationFn: createOrder,
        onSuccess: (res) => {
            if (res.success) {
                toast.success(`ИИ определил категорию: ${res.aiCategory}`)
                router.push(`/client/orders/${res.orderId}`)
            } else {
                toast.error(res.error)
            }
        }
    })

    const onSubmit = (data: any) => mutation.mutate({
        ...data,
        lat: coords?.lat,
        lng: coords?.lng
    });

    return (
        <div className="max-w-2xl mx-auto py-10 space-y-8">
            <div className="text-center space-y-2">
                <h1 className="text-4xl font-black tracking-tight italic">Новая задача</h1>
                <p className="text-muted-foreground italic">Опишите проблему, а AI сделает всё остальное</p>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card className="p-6 border-2 shadow-none rounded-3xl">
                    <CardContent className="space-y-6 p-0">

                        {/* Название */}
                        <Controller
                            control={form.control}
                            name="title"
                            render={({ field, fieldState }) => (
                                <Field>
                                    <FieldLabel className="font-bold">Название задачи</FieldLabel>
                                    <Input placeholder="Например: Починить розетку" {...field} className="h-12 rounded-xl" />
                                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                </Field>
                            )}
                        />

                        {/* Описание */}
                        <Controller
                            control={form.control}
                            name="description"
                            render={({ field, fieldState }) => (
                                <Field>
                                    <div className="flex items-center justify-between mb-2">
                                        <FieldLabel className="font-bold mb-0">Подробности</FieldLabel>
                                        <Badge variant="secondary" className="gap-1 text-[10px] uppercase bg-blue-50 text-blue-600 border-none px-3">
                                            <Sparkles className="w-3 h-3" /> AI Анализ
                                        </Badge>
                                    </div>
                                    <Textarea
                                        placeholder="Опишите детали..."
                                        className="min-h-[120px] rounded-xl resize-none bg-muted/20 border-none"
                                        {...field}
                                    />
                                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                </Field>
                            )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Бюджет */}
                            <Controller
                                control={form.control}
                                name="price"
                                render={({ field: { onChange, value, ...field }, fieldState }) => (
                                    <Field>
                                        <FieldLabel className="font-bold flex items-center gap-2">
                                            <Wallet className="w-4 h-4 text-emerald-500" /> Бюджет (₽)
                                        </FieldLabel>
                                        <Input
                                            type="number"
                                            {...field}
                                            value={value?.toString() ?? ""}
                                            onChange={(e) => onChange(e.target.valueAsNumber || 0)}
                                            className="h-12 rounded-xl"
                                        />
                                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                    </Field>
                                )}
                            />

                            {/* Адрес */}
                            <Controller
                                control={form.control}
                                name="address"
                                render={({ field, fieldState }) => (
                                    <Field>
                                        <FieldLabel className="font-bold flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-blue-500" /> Адрес
                                        </FieldLabel>
                                        <div className="relative">
                                            <Input placeholder="Город, улица..." {...field} className="h-12 rounded-xl pr-10" />
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                {coords ? <Check className="w-4 h-4 text-green-500" /> : <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                                            </div>
                                        </div>
                                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                    </Field>
                                )}
                            />
                        </div>

                        {/* Срочность */}
                        <Controller
                            control={form.control}
                            name="dateType"
                            render={({ field }) => (
                                <Field>
                                    <FieldLabel className="font-bold flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-slate-500" /> Срочность
                                    </FieldLabel>
                                    <Tabs onValueChange={field.onChange} defaultValue={field.value} className="w-full">
                                        <TabsList className="grid w-full grid-cols-2 h-12 rounded-xl bg-muted/50 p-1">
                                            <TabsTrigger value="ASAP" className="rounded-lg data-[state=active]:bg-background font-bold">Как можно скорее</TabsTrigger>
                                            <TabsTrigger value="SCHEDULED" className="rounded-lg data-[state=active]:bg-background font-bold">Выбрать дату</TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                </Field>
                            )}
                        />
                    </CardContent>
                </Card>

                <Button 
                    type="submit" 
                    disabled={mutation.isPending}
                    className="w-full h-14 text-lg font-bold rounded-2xl shadow-xl shadow-blue-500/10"
                >
                    {mutation.isPending ? "ИИ анализирует..." : "Разместить заказ"}
                </Button>
            </form>
        </div>
    )
}
