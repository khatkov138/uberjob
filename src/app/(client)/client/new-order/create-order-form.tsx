"use client"

import * as React from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { MapPin, Wallet, ArrowRight, Loader2, AlertCircle } from "lucide-react"

import { AddressInput } from "@/components/geo/address-input"
import { createOrderSchema, type CreateOrderValues } from "@/lib/validation"

import { useClientLocationStore } from "@/store/use-client-location-store"
import { cn } from "@/lib/utils"
import { createOrder } from "@/actions/orders/create"

export function CreateOrderForm() {
    const router = useRouter()
    const { lastCity, lastLat, lastLng, setClientLocation } = useClientLocationStore()

    const form = useForm<CreateOrderValues>({
        resolver: zodResolver(createOrderSchema),
        mode: "onChange",
        defaultValues: {
            description: "",
            address: lastCity || "",
            lat: lastLat || 0,
            lng: lastLng || 0,
            price: 0,
            dateType: "ASAP",
        }
    });

    const description = form.watch("description")

    const mutation = useMutation({
        mutationFn: (data: CreateOrderValues) => createOrder(data),
        onSuccess: (res) => {
            if (res.success) {
                toast.success("ЗАДАЧА ЗАПУЩЕНА")
                router.push(`/client/my-orders`)
            } else {
                toast.error(res.error || "Ошибка публикации")
            }
        }
    })

    const onSubmit = (data: CreateOrderValues) => mutation.mutate(data)

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">
            
            {/* 1. ВЕРНУЛИ ВЫСОТУ: min-h-[220px] */}
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
                                    fieldState.invalid ? "text-red-500 placeholder:text-red-200" : "text-slate-900 placeholder:text-slate-100"
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
                
                {description.length === 0 && !form.formState.errors.description && (
                    <div className="flex items-center gap-2 text-slate-300 mt-4">
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-100 border-t-blue-600 animate-spin" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Ждем вашего ввода...</span>
                    </div>
                )}
            </div>

            {/* 2. ПАРАМЕТРЫ (КОМПАКТНЫЕ) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                <div className="space-y-3">
                    <div className="flex items-center gap-2 ml-2">
                        <MapPin className="w-3.5 h-3.5 text-blue-600" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Локация</span>
                    </div>
                    <Controller
                        control={form.control}
                        name="address"
                        render={({ field, fieldState }) => (
                            <>
                                <div className={cn(
                                    "bg-slate-50 rounded-2xl p-1 border-2 transition-all shadow-inner",
                                    fieldState.invalid ? "border-red-500 bg-red-50/20" : "border-transparent focus-within:border-blue-100 focus-within:bg-white"
                                )}>
                                    <AddressInput
                                        placeholder="Город или адрес..."
                                        defaultValue={field.value}
                                        onSelect={(data) => {
                                            form.setValue("address", data.address, { shouldValidate: true })
                                            form.setValue("lat", data.lat, { shouldValidate: true })
                                            form.setValue("lng", data.lng, { shouldValidate: true })
                                            setClientLocation(data.address, data.lat, data.lng)
                                        }}
                                    />
                                </div>
                                {fieldState.error && (
                                    <p className="text-[9px] font-black uppercase text-red-500 ml-2 mt-1 italic">Выберите город из списка</p>
                                )}
                            </>
                        )}
                    />
                </div>

                <div className="space-y-3">
                    <div className="flex items-center gap-2 ml-2">
                        <Wallet className="w-3.5 h-3.5 text-blue-600" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Бюджет (₽)</span>
                    </div>
                    <Controller
                        control={form.control}
                        name="price"
                        render={({ field: { onChange, value, ...field } }) => (
                            <input
                                type="number"
                                {...field}
                                value={value || ""}
                                onChange={(e) => onChange(e.target.valueAsNumber || 0)}
                                placeholder="0"
                                className="w-full h-16 md:h-18 px-6 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-100 focus:bg-white outline-none font-black italic text-3xl tracking-tighter text-slate-900 placeholder:text-slate-200 transition-all shadow-inner"
                            />
                        )}
                    />
                </div>
            </div>

            {/* 3. ВЕРНУЛИ ГИГАНТСКУЮ КНОПКУ: h-24 md:h-32 */}
            <div className="pt-6">
                <button
                    type="submit"
                    disabled={mutation.isPending}
                    className={cn(
                        "w-full h-24 md:h-32 rounded-[2.5rem] md:rounded-[3.5rem] flex items-center justify-between px-10 md:px-16 transition-all duration-700 active:scale-[0.97] group overflow-hidden cursor-pointer",
                        mutation.isPending ? "bg-slate-800" : "bg-slate-900 text-white shadow-2xl shadow-slate-200 hover:bg-blue-600"
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
                            <div className={cn(
                                "w-14 h-14 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all duration-500 bg-white/10 group-hover:bg-white group-hover:scale-110"
                            )}>
                                <ArrowRight className="w-8 h-8 md:w-10 md:h-10 text-white group-hover:text-blue-600 transition-colors" />
                            </div>
                        </>
                    )}
                </button>
            </div>
        </form>
    )
}
