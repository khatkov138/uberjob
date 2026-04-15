"use client"

import * as React from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Sparkles, MapPin, Wallet, Clock, Rocket, Loader2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { AddressInput } from "@/components/geo/address-input"

import { createOrderSchema, type CreateOrderValues } from "@/lib/validation"
import { createOrder } from "@/app/(client)/client/new-order/actions"
import { useClientLocationStore } from "@/store/use-client-location-store"

export function CreateOrderForm() {
    const router = useRouter()
    const [showPrice, setShowPrice] = React.useState(false)
    const { lastCity, lastLat, lastLng, setClientLocation } = useClientLocationStore()

    const form = useForm<CreateOrderValues>({
        resolver: zodResolver(createOrderSchema),
        defaultValues: {
            description: "",
            address: lastCity || "",
            lat: lastLat || 0,
            lng: lastLng || 0,
            price: 0,
            dateType: "ASAP" as const,
        }
    });

    // Синхронизация с Zustand после загрузки страницы
    React.useEffect(() => {
        if (lastCity && !form.getValues("address")) {
            form.setValue("address", lastCity)
            form.setValue("lat", lastLat)
            form.setValue("lng", lastLng)
        }
    }, [lastCity, lastLat, lastLng, form])

    const mutation = useMutation({
        mutationFn: (data: CreateOrderValues) => createOrder(data),
        onSuccess: (res) => {
            if (res.success) {
                toast.success(`Заказ создан! `)
                router.push(`/client/orders/${res.orderId}`)
            } else {
                toast.error(res.error || "Ошибка публикации")
            }
        }
    })

    const onSubmit = (data: CreateOrderValues) => {
        mutation.mutate(data);
    };

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card className="p-8 border-2 shadow-none rounded-[3rem] bg-white">
                <CardContent className="space-y-8 p-0">

                    {/* ОПИСАНИЕ */}
                    <Controller
                        control={form.control}
                        name="description"
                        render={({ field, fieldState }) => (
                            <Field>
                                <div className="flex items-center justify-between mb-3">
                                    <FieldLabel className="font-bold text-lg mb-0 italic">Что случилось?</FieldLabel>
                                    <Badge className="bg-blue-600 gap-1 px-3 py-1">
                                        <Sparkles className="w-3 h-3 fill-current" /> AI Смарт
                                    </Badge>
                                </div>
                                <Textarea
                                    placeholder="Например: Нужно починить кран на кухне, начал подтекать снизу..."
                                    className="min-h-[140px] rounded-[2rem] p-6 text-lg bg-slate-50 border-none focus-visible:ring-blue-600 transition-all resize-none shadow-inner"
                                    {...field}
                                />
                                <p className="text-[10px] text-slate-400 mt-2 ml-2 italic">
                                    Опишите только суть работы — так AI точнее подберет специалиста
                                </p>
                                {fieldState.invalid && <p className="text-red-500 text-[10px] mt-1 font-bold">{fieldState.error?.message}</p>}
                            </Field>
                        )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* АДРЕС */}
                        <Controller
                            control={form.control}
                            name="address"
                            render={({ field, fieldState }) => (
                                <Field>
                                    <FieldLabel className="font-bold italic">Населенный пункт</FieldLabel>
                                    <AddressInput
                                        placeholder="Город или поселок..."
                                        defaultValue={field.value}
                                        onSelect={(data) => {
                                            form.setValue("address", data.address, { shouldValidate: true })
                                            form.setValue("lat", data.lat, { shouldValidate: true })
                                            form.setValue("lng", data.lng, { shouldValidate: true })
                                            setClientLocation(data.address, data.lat, data.lng)
                                        }}
                                        onChange={(val) => {
                                            form.setValue("address", val)
                                            form.setValue("lat", 0)
                                            form.setValue("lng", 0)
                                        }}
                                    />
                                    {(fieldState.error || form.formState.errors.lat) && (
                                        <p className="text-[11px] text-red-500 mt-1 font-bold">
                                            Выберите город из списка
                                        </p>
                                    )}
                                </Field>
                            )}
                        />

                        {/* БЮДЖЕТ */}
                        <div className="space-y-2">
                            <FieldLabel className="font-bold italic">Бюджет</FieldLabel>
                            {!showPrice ? (
                                <button
                                    type="button"
                                    onClick={() => setShowPrice(true)}
                                    className="h-14 w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:border-blue-300 hover:text-blue-600 transition-all font-bold text-sm"
                                >
                                    <Wallet className="w-4 h-4" /> + Указать цену (опционально)
                                </button>
                            ) : (
                                <Controller
                                    control={form.control}
                                    name="price"
                                    render={({ field: { onChange, value, ...field } }) => (
                                        <div className="relative animate-in zoom-in-95 duration-200">
                                            <Input
                                                type="number"
                                                {...field}
                                                value={value || ""}
                                                onChange={(e) => onChange(e.target.valueAsNumber || 0)}
                                                className="h-14 rounded-2xl text-lg font-bold bg-slate-50 border-none shadow-inner pr-12"
                                                placeholder="Сумма в ₽"
                                                autoFocus
                                            />
                                            <button
                                                type="button"
                                                onClick={() => { setShowPrice(false); form.setValue("price", 0); }}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-full"
                                            >
                                                <X className="w-4 h-4 text-slate-400" />
                                            </button>
                                        </div>
                                    )}
                                />
                            )}
                            <p className="text-[10px] text-slate-400 italic">Мастера предложат свои цены, если бюджет не указан</p>
                        </div>
                    </div>

                    {/* СРОЧНОСТЬ */}
                    <Controller
                        control={form.control}
                        name="dateType"
                        render={({ field }) => (
                            <Field>
                                <FieldLabel className="font-bold flex items-center gap-2 italic mb-3">
                                    <Clock className="w-4 h-4 text-slate-500" /> Когда приступить?
                                </FieldLabel>
                                <Tabs onValueChange={field.onChange} defaultValue={field.value} className="w-full">
                                    <TabsList className="grid w-full grid-cols-2 h-14 rounded-2xl bg-slate-100 p-1">
                                        <TabsTrigger value="ASAP" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-black italic uppercase transition-all">
                                            Срочно
                                        </TabsTrigger>
                                        <TabsTrigger value="SCHEDULED" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-black italic uppercase transition-all">
                                            В срок
                                        </TabsTrigger>
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
                className="w-full h-16 text-xl font-black rounded-[2rem] bg-slate-900 hover:bg-blue-600 text-white shadow-2xl transition-all active:scale-95 uppercase italic"
            >
                {mutation.isPending ? (
                    <div className="flex items-center gap-3">
                        <Loader2 className="w-6 h-6 animate-spin" /> Анализируем...
                    </div>
                ) : (
                    <span className="flex items-center gap-3">
                        Опубликовать <Rocket className="w-6 h-6" />
                    </span>
                )}
            </Button>
        </form>
    )
}
