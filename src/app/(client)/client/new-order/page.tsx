"use client"

import * as React from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

// Импортируем серверный экшен для определения гео по IP


// UI Components
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

// Icons
import { Sparkles, MapPin, Wallet, Clock, Rocket, Loader2, Check, Globe } from "lucide-react"

import { createOrderSchema } from "@/lib/validation"
import { createOrder } from "./actions"
import { cn } from "@/lib/utils"
import { getServerLocation } from "@/app/actions/geo"

export default function NewOrderPage() {
    const router = useRouter()
    const [coords, setCoords] = React.useState<{ lat: number, lng: number } | null>(null);
    const [locationSource, setLocationSource] = React.useState<"IP" | "GPS" | null>(null);
    const [isLocating, setIsLocating] = React.useState(false);

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

    // Инициализация локации (IP -> GPS)
    React.useEffect(() => {
        async function initGeo() {
            setIsLocating(true);
            try {
                // 1. Сначала серверное определение по IP (мгновенно)
                const geo = await getServerLocation();
                setCoords({ lat: geo.lat, lng: geo.lng });
                setLocationSource("IP");
                
                // Если адрес еще не введен, подставляем определенный город
                if (!form.getValues("address")) {
                    form.setValue("address", geo.city);
                }

                // 2. Затем пробуем точный GPS (если разрешит)
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition((pos) => {
                        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                        setLocationSource("GPS");
                    });
                }
            } catch (e) {
                console.error("Geo init error", e);
            } finally {
                setIsLocating(false);
            }
        }
        initGeo();
    }, [form]);

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
        <div className="max-w-2xl mx-auto py-10 space-y-8 px-4">
            <div className="text-center space-y-2">
                <h1 className="text-4xl font-black tracking-tight italic">Новая задача</h1>
                <p className="text-muted-foreground italic">Опишите проблему, а AI сделает всё остальное</p>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card className="p-6 border-2 shadow-none rounded-[2.5rem]">
                    <CardContent className="space-y-6 p-0">

                        {/* Название */}
                        <Controller
                            control={form.control}
                            name="title"
                            render={({ field, fieldState }) => (
                                <Field>
                                    <FieldLabel className="font-bold">Название задачи</FieldLabel>
                                    <Input placeholder="Например: Починить розетку" {...field} className="h-12 rounded-2xl" />
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
                                        <Badge variant="secondary" className="gap-1 text-[10px] uppercase bg-blue-50 text-blue-600 border-none px-3 py-1">
                                            <Sparkles className="w-3 h-3" /> AI Анализ
                                        </Badge>
                                    </div>
                                    <Textarea
                                        placeholder="Опишите детали: что случилось, нужен ли инструмент..."
                                        className="min-h-[120px] rounded-2xl resize-none bg-muted/20 border-none focus-visible:ring-blue-500"
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
                                            className="h-12 rounded-2xl"
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
                                            <Input placeholder="Город, улица..." {...field} className="h-12 rounded-2xl pr-12" />
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                                                {isLocating ? (
                                                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                                ) : coords ? (
                                                    <Badge variant="outline" className={cn(
                                                        "px-1.5 py-0 text-[9px] font-black uppercase border-none",
                                                        locationSource === "GPS" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                                                    )}>
                                                        {locationSource}
                                                    </Badge>
                                                ) : null}
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground mt-1 italic">
                                            {locationSource === "IP" ? "Город определен по IP. Уточните улицу." : "Укажите точный адрес для мастера."}
                                        </p>
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
                                        <TabsList className="grid w-full grid-cols-2 h-12 rounded-2xl bg-muted/50 p-1">
                                            <TabsTrigger value="ASAP" className="rounded-xl data-[state=active]:bg-background font-bold">Как можно скорее</TabsTrigger>
                                            <TabsTrigger value="SCHEDULED" className="rounded-xl data-[state=active]:bg-background font-bold">Выбрать дату</TabsTrigger>
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
                    className="w-full h-14 text-lg font-bold rounded-[1.5rem] shadow-xl shadow-blue-500/10 transition-transform active:scale-[0.98]"
                >
                    {mutation.isPending ? (
                        <div className="flex items-center gap-2 italic">
                            <Loader2 className="w-5 h-5 animate-spin" /> Анализируем...
                        </div>
                    ) : (
                        <span className="flex items-center gap-2 font-black italic">
                            Опубликовать задачу <Rocket className="w-5 h-5" />
                        </span>
                    )}
                </Button>
            </form>
        </div>
    )
}
