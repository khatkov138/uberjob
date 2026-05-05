"use client"

import * as React from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { MapPin, Wallet, ArrowRight, Loader2, AlertCircle } from "lucide-react"

import { createOrderSchema, type CreateOrderValues } from "@/lib/validation"
import { cn, handleAction } from "@/lib/utils"
import { createOrder } from "@/actions/order/create"
import { OrderGeoModal } from "./order-geo-modal"
import { ServerLocation } from "@/lib/server-utils"
import { useLocationStore } from "@/store/use-location-store"

interface CreateOrderFormProps {
    initialLocation: ServerLocation
}
export function CreateOrderForm({ initialLocation }: CreateOrderFormProps) {
    const router = useRouter()
    const [isGeoOpen, setIsGeoOpen] = React.useState(false)

    const { setLocation } = useLocationStore()

    const form = useForm<CreateOrderValues>({
        resolver: zodResolver(createOrderSchema),
        defaultValues: {
            description: "",
            city: initialLocation?.city ?? "",
            lat: initialLocation?.lat ?? 0,
            lng: initialLocation?.lng ?? 0,
            yandexUri: initialLocation?.yandexUri ?? "",
            price: 0,
            dateType: "ASAP",
        }
    });

    const description = form.watch("description")

    const mutation = useMutation({
        mutationFn: (data: CreateOrderValues) => handleAction(createOrder(data)),
        onSuccess: (data) => {
            toast.success("ЗАДАЧА ЗАПУЩЕНА")
            router.push(`/order/${data.slug}`)
        },
        onError: (error: Error) => {
            toast.error(error.message || "Ошибка публикации")
        }
    })

    return (
        <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-12">

            {/* ОПИСАНИЕ */}
            <div className="relative group cursor-text">
                <Controller
                    control={form.control}
                    name="description"
                    render={({ field, fieldState }) => (
                        <>
                            <div className={cn(
                                "absolute -left-6 top-0 bottom-0 w-1.5 rounded-full transition-all duration-500",
                                fieldState.invalid ? "bg-red-500" : (description.length > 0 ? "bg-blue-600" : "bg-slate-100")
                            )} />
                            <textarea
                                {...field}
                                autoFocus
                                placeholder="ОПИШИТЕ ЗАДАЧУ ЗДЕСЬ..."
                                className={cn(
                                    "w-full bg-transparent text-4xl md:text-7xl font-black uppercase italic tracking-tighter outline-none resize-none min-h-[220px] transition-all leading-[0.9] overflow-y-auto no-scrollbar",
                                    fieldState.invalid ? "text-red-500 placeholder:text-red-100" : "text-slate-900 placeholder:text-slate-100"
                                )}
                            />
                            {fieldState.error && (
                                <p className="text-[10px] font-black uppercase text-red-500 mt-4 flex items-center gap-2 italic tracking-widest">
                                    <AlertCircle size={14} /> {fieldState.error.message}
                                </p>
                            )}
                        </>
                    )}
                />
            </div>

            {/* ПАРАМЕТРЫ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">

                {/* КНОПКА ЛОКАЦИИ */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 ml-2">
                        <MapPin className="w-3.5 h-3.5 text-blue-600" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Локация</span>
                    </div>

                    <Controller
                        control={form.control}
                        name="city"
                        render={({ field, fieldState }) => (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setIsGeoOpen(true)}
                                    className={cn(
                                        "w-full h-20 px-8 flex items-center justify-between bg-slate-50 rounded-[2rem] border-2 transition-all shadow-inner group",
                                        fieldState.invalid ? "border-red-500 bg-red-50/20" : "border-transparent hover:border-blue-100 hover:bg-white"
                                    )}
                                >
                                    <div className="flex flex-col items-start min-w-0">
                                        <span className="text-2xl font-black uppercase italic tracking-tighter truncate leading-none text-slate-900">
                                            {field.value || "УКАЗАТЬ МЕСТО..."}
                                        </span>
                                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-blue-600 mt-2">
                                            Нажмите, чтобы изменить
                                        </span>
                                    </div>
                                    <MapPin className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform" />
                                </button>



                                <OrderGeoModal
                                    open={isGeoOpen}
                                    onOpenChange={setIsGeoOpen}
                                    initialData={{
                                        city: form.getValues("city"),
                                        lat: form.getValues("lat"),
                                        lng: form.getValues("lng"),
                                        uri: form.getValues("yandexUri"),
                                       
                                    }}
                                    onConfirm={(data) => {
                                        // 1. Обновляем локальный стейт формы (для валидации и отправки)
                                        form.setValue("city", data.city, { shouldValidate: true })
                                        form.setValue("lat", data.lat, { shouldValidate: true })
                                        form.setValue("lng", data.lng, { shouldValidate: true })
                                        form.setValue("yandexUri", data.uri, { shouldValidate: true })

                                        // 2. СИНХРОНИЗИРУЕМ С ГЛОБАЛЬНЫМ СТОРОМ (чтобы в ленте тоже сменился город)
                                        // Важно: нам нужен еще slug. Если data его не содержит, 
                                        // убедись, что getOrCreateLocation возвращает его.
                                        setLocation(data.city, data.lat, data.lng, data.slug, data.uri)
                                        console.log(data.city, data.lat, data.lng, data.slug, data.uri)
                                        setIsGeoOpen(false)
                                    }}
                                />
                            </>
                        )}
                    />
                </div>

                {/* БЮДЖЕТ */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 ml-2">
                        <Wallet className="w-3.5 h-3.5 text-blue-600" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Бюджет (₽)</span>
                    </div>
                    <Controller
                        control={form.control}
                        name="price"
                        render={({ field: { onChange, value } }) => (
                            <input
                                type="number"
                                value={value || ""}
                                onChange={(e) => onChange(e.target.valueAsNumber || 0)}
                                placeholder="0"
                                className="w-full h-20 px-8 bg-slate-50 rounded-[2rem] border-2 border-transparent focus:border-blue-100 focus:bg-white outline-none font-black italic text-4xl tracking-tighter text-slate-900 placeholder:text-slate-100 transition-all shadow-inner"
                            />
                        )}
                    />
                </div>
            </div>

            {/* КНОПКА ОТПРАВКИ */}
            <div className="pt-6">
                <button
                    type="submit"
                    disabled={mutation.isPending}
                    className={cn(
                        "w-full h-24 md:h-32 rounded-[2.5rem] md:rounded-[3.5rem] flex items-center justify-between px-10 md:px-16 transition-all duration-700 active:scale-[0.97] group overflow-hidden",
                        mutation.isPending ? "bg-slate-800" : "bg-slate-900 text-white shadow-2xl hover:bg-blue-600"
                    )}
                >
                    {mutation.isPending ? (
                        <div className="flex items-center gap-6 mx-auto">
                            <Loader2 className="w-12 h-12 animate-spin text-white" />
                            <span className="text-3xl font-black uppercase italic tracking-tighter">Запуск...</span>
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-col items-start leading-none text-left">
                                <span className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter">Опубликовать</span>
                                <span className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-40 mt-3">Мгновенный поиск мастеров</span>
                            </div>
                            <div className="w-14 h-14 md:w-20 md:h-20 rounded-full flex items-center justify-center bg-white/10 group-hover:bg-white transition-all">
                                <ArrowRight className="w-8 h-8 md:w-10 md:h-10 text-white group-hover:text-blue-600" />
                            </div>
                        </>
                    )}
                </button>
            </div>
        </form>
    )
}
