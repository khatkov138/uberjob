"use client"

import * as React from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { AddressInput } from "@/components/geo/address-input"

import { Sparkles, MapPin, Wallet, Clock, Rocket, Loader2 } from "lucide-react"
import { createOrderSchema, type CreateOrderValues } from "@/lib/validation"
import { createOrder } from "./actions"
import { useClientLocationStore } from "@/store/use-client-location-store"

export default function NewOrderPage() {
    const router = useRouter()
    const [isLocating, setIsLocating] = React.useState(false);

    const { lastCity, lastLat, lastLng, setClientLocation } = useClientLocationStore()

    console.log(lastCity, lastLat, lastLng)

    const form = useForm<CreateOrderValues>({
        resolver: zodResolver(createOrderSchema),
        defaultValues: {
            description: "",
            // Подставляем данные из стора в дефолтные значения формы
            address: lastCity || "",
            lat: lastLat || 0,
            lng: lastLng || 0,
            price: 1000,
            dateType: "ASAP",
        }
    })

    React.useEffect(() => {
        if (lastCity) {
            form.setValue("address", lastCity);
            form.setValue("lat", lastLat);
            form.setValue("lng", lastLng);
        }
    }, [lastCity, lastLat, lastLng, form]);


    const mutation = useMutation({
        mutationFn: createOrder,
        onSuccess: (res) => {
            if (res.success) {
                toast.success(`Заказ создан! Категория: ${res.aiCategory}`)
                router.push(`/client/orders/${res.orderId}`)
            } else {
                toast.error(res.error || "Произошла ошибка")
            }
        }
    })

    const onSubmit = (data: CreateOrderValues) => {
        mutation.mutate(data);
    };

    return (
        <div className="max-w-2xl mx-auto py-10 space-y-8 px-4">
            <header className="text-center space-y-2">
                <h1 className="text-4xl font-black tracking-tight italic uppercase italic">Создать заказ</h1>
                <p className="text-muted-foreground font-medium italic text-sm">Расскажите, что случилось. Остальное сделает нейросеть.</p>
            </header>

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
                                        <FieldLabel className="font-bold text-lg mb-0 italic">Что нужно сделать?</FieldLabel>
                                        <Badge className="bg-blue-600 gap-1 px-3 py-1">
                                            <Sparkles className="w-3 h-3 fill-current" /> AI Смарт
                                        </Badge>
                                    </div>
                                    <Textarea
                                        placeholder="Например: Повесить полку в ванной. Нужен свой перфоратор..."
                                        className="min-h-[140px] rounded-[2rem] p-6 text-lg bg-slate-50 border-none focus-visible:ring-blue-600 transition-all resize-none shadow-inner"
                                        {...field}
                                    />
                                    <p className="text-[10px] text-slate-400 mt-2 ml-2 italic">Опишите только суть работы — так AI точнее подберет специалиста</p>
                                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                </Field>
                            )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Бюджет */}
                            <Controller
                                control={form.control}
                                name="price"
                                render={({ field: { onChange, value, ...field }, fieldState }) => (
                                    <Field>
                                        <FieldLabel className="font-bold flex items-center gap-2 italic">
                                            <Wallet className="w-4 h-4 text-emerald-500" /> Бюджет (₽)
                                        </FieldLabel>
                                        <Input
                                            type="number"
                                            {...field}
                                            value={value?.toString() ?? ""}
                                            onChange={(e) => onChange(e.target.valueAsNumber || 0)}
                                            className="h-14 rounded-2xl text-lg font-bold bg-slate-50 border-none shadow-inner"
                                        />
                                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                    </Field>
                                )}
                            />

                            {/* Населенный пункт */}

                            <Controller
                                control={form.control}
                                name="address"
                                render={({ field, fieldState }) => (
                                    <Field>
                                        <FieldLabel className="font-bold italic">Населенный пункт</FieldLabel>
                                        <AddressInput
                                            placeholder="Название города или поселка..."
                                            defaultValue={field.value}
                                            onSelect={(data) => {
                                                // 1. Обновляем форму
                                                form.setValue("address", data.address, { shouldValidate: true });
                                                form.setValue("lat", data.lat, { shouldValidate: true });
                                                form.setValue("lng", data.lng, { shouldValidate: true });

                                                // 2. Сохраняем в Zustand для следующего раза
                                                setClientLocation(data.address, data.lat, data.lng);
                                            }}
                                            // НОВОЕ: Если пользователь просто ТИПАЕТ текст (не выбрал из списка)
                                            onChange={(val) => {
                                                form.setValue("address", val);
                                                // СБРАСЫВАЕМ координаты в 0, чтобы форма стала невалидной
                                                form.setValue("lat", 0);
                                                form.setValue("lng", 0);
                                            }}
                                        />

                                        {/* Выводим ошибку, если город не выбран из списка */}
                                        {(fieldState.error || form.formState.errors.lat) && (
                                            <p className="text-[12px] text-red-500 mt-2 font-bold animate-pulse">
                                                ⚠️ Пожалуйста, выберите город из выпадающего списка
                                            </p>
                                        )}
                                    </Field>
                                )}
                            />
                        </div>

                        {/* ВЫБОР СРОКОВ */}
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
                                            <TabsTrigger value="ASAP" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md font-black italic transition-all uppercase">
                                                Срочно
                                            </TabsTrigger>
                                            <TabsTrigger value="SCHEDULED" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md font-black italic transition-all uppercase">
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
                    disabled={mutation.isPending || isLocating}
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
        </div>
    )
}
