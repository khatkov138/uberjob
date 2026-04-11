"use client"

import * as React from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"

// UI Components
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldLabel, FieldError } from "@/components/ui/field" // Твои новые компоненты
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

// Icons
import { Sparkles, MapPin, Wallet, Clock, Rocket } from "lucide-react"

import { createOrderSchema } from "@/lib/validation"
import { createOrder } from "./actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export default function NewOrderPage() {
    const router = useRouter()
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

    const onSubmit = (data: any) => mutation.mutate(data)

    return (
        <div className="max-w-2xl mx-auto py-10 space-y-8">
            <div className="text-center space-y-2">
                <h1 className="text-4xl font-black tracking-tight">Новая задача</h1>
                <p className="text-muted-foreground">Опишите проблему, а AI подберет категорию и мастеров</p>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card className="p-6 border-2 shadow-none rounded-3xl">
                    <CardContent className="space-y-6 p-0">

                        {/* Название задачи */}
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
                                        <Badge variant="secondary" className="gap-1 text-[10px] uppercase bg-blue-50 text-blue-600">
                                            <Sparkles className="w-3 h-3" /> AI Анализ
                                        </Badge>
                                    </div>
                                    <Textarea
                                        placeholder="Опишите детали: что случилось, нужен ли инструмент..."
                                        className="min-h-[120px] rounded-xl resize-none"
                                        {...field}
                                    />
                                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                </Field>
                            )}
                        />

                        {/* Бюджет и Адрес */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Controller
                                control={form.control}
                                name="price"
                                render={({ field: { onChange, value, ...field }, fieldState }) => (
                                    <Field>
                                        <FieldLabel className="font-bold flex items-center gap-2">
                                            <Wallet className="w-4 h-4" /> Бюджет (₽)
                                        </FieldLabel>
                                        <Input
                                            type="number"
                                            {...field}
                                            // Превращаем число в строку для инпута, чтобы не было ошибки
                                            value={value?.toString() ?? ""}
                                            // Превращаем строку из инпута обратно в число для Zod/Prisma
                                            onChange={(e) => onChange(e.target.valueAsNumber || 0)}
                                            className="h-12 rounded-xl"
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
                                        <FieldLabel className="font-bold flex items-center gap-2">
                                            <MapPin className="w-4 h-4" /> Адрес
                                        </FieldLabel>
                                        <Input placeholder="Город, улица..." {...field} className="h-12 rounded-xl" />
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
                                        <Clock className="w-4 h-4" /> Срочность
                                    </FieldLabel>
                                    <Tabs onValueChange={field.onChange} defaultValue={field.value} className="w-full">
                                        <TabsList className="grid w-full grid-cols-2 h-12 rounded-xl">
                                            <TabsTrigger value="ASAP" className="rounded-lg">Как можно скорее</TabsTrigger>
                                            <TabsTrigger value="SCHEDULED" className="rounded-lg">Выбрать дату</TabsTrigger>
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
                    {mutation.isPending ? "ИИ анализирует..." : (
                        <span className="flex items-center gap-2">
                            Разместить заказ <Rocket className="w-5 h-5" />
                        </span>
                    )}
                </Button>
            </form>
        </div>
    )
}