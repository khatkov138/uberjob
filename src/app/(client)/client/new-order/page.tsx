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

// Наш новый компонент
import { AddressInput } from "@/components/geo/address-input"

// Icons
import { Sparkles, MapPin, Wallet, Clock, Rocket, Loader2 } from "lucide-react"

import { createOrderSchema, type CreateOrderValues } from "@/lib/validation"
import { createOrder } from "./actions"
import { getServerLocation } from "@/app/actions/geo"

export default function NewOrderPage() {
    const router = useRouter()
    const [isLocating, setIsLocating] = React.useState(false);
    const [locationSource, setLocationSource] = React.useState<"IP" | "GPS" | null>(null);

    const form = useForm<CreateOrderValues>({
        resolver: zodResolver(createOrderSchema),
        defaultValues: {
            title: "",
            description: "",
            address: "",
            lat: 0,
            lng: 0,
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
                const geo = await getServerLocation();
                if (!form.getValues("address")) {
                    form.setValue("address", geo.city, { shouldValidate: true });
                    form.setValue("lat", geo.lat);
                    form.setValue("lng", geo.lng);
                    setLocationSource("IP");
                }

                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition((pos) => {
                        form.setValue("lat", pos.coords.latitude);
                        form.setValue("lng", pos.coords.longitude);
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

    const onSubmit = (data: CreateOrderValues) => mutation.mutate(data);

    return (
        <div className="max-w-2xl mx-auto py-10 space-y-8 px-4">
            <div className="text-center space-y-2">
                <h1 className="text-4xl font-black tracking-tight italic uppercase">Новая задача</h1>
                <p className="text-muted-foreground font-medium italic">Опишите проблему, а AI сделает всё остальное</p>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card className="p-6 border-2 shadow-none rounded-[2.5rem]">
                    <CardContent className="space-y-6 p-0">

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
                                        placeholder="Опишите детали..."
                                        className="min-h-[100px] rounded-2xl resize-none bg-muted/20 border-none focus-visible:ring-blue-500"
                                        {...field}
                                    />
                                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                </Field>
                            )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                            <Controller
                                control={form.control}
                                name="address"
                                render={({ field, fieldState }) => (
                                    <Field>
                                        <div className="flex items-center justify-between mb-2">
                                            <FieldLabel className="font-bold mb-0 flex items-center gap-2">
                                                <MapPin className="w-4 h-4 text-blue-500" /> Населенный пункт
                                            </FieldLabel>
                                            {locationSource && (
                                                <span className="text-[9px] font-black uppercase text-blue-500 bg-blue-50 px-2 py-0.5 rounded transition-all animate-in fade-in">
                                                    {locationSource}
                                                </span>
                                            )}
                                        </div>

                                        <AddressInput
                                          
                                            defaultValue={field.value}
                                            onSelect={(data) => {
                                                form.setValue("address", data.address, { shouldValidate: true });
                                                form.setValue("lat", data.lat);
                                                form.setValue("lng", data.lng);
                                                setLocationSource(null); 
                                            }}
                                        />
                                        <p className="text-[10px] text-muted-foreground mt-2 italic leading-tight">
                                            Укажите только ваш город или район. Точный адрес (дом/кв) вы сообщите мастеру позже в чате.
                                        </p>
                                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                    </Field>
                                )}
                            />

                        </div>

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
                                            <TabsTrigger value="ASAP" className="rounded-xl data-[state=active]:bg-background font-bold transition-all">Срочно</TabsTrigger>
                                            <TabsTrigger value="SCHEDULED" className="rounded-xl data-[state=active]:bg-background font-bold transition-all">В срок</TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                </Field>
                            )}
                        />
                    </CardContent>
                </Card>

                <Button
                    type="submit"
                    disabled={mutation.isPending || isLocating}
                    className="w-full h-14 text-lg font-black rounded-[1.5rem] shadow-xl shadow-blue-500/10 transition-all active:scale-[0.98]"
                >
                    {mutation.isPending ? (
                        <div className="flex items-center gap-2 italic">
                            <Loader2 className="w-5 h-5 animate-spin" /> Анализируем...
                        </div>
                    ) : (
                        <span className="flex items-center gap-2">
                            Опубликовать задачу <Rocket className="w-5 h-5" />
                        </span>
                    )}
                </Button>
            </form>
        </div>
    )
}
