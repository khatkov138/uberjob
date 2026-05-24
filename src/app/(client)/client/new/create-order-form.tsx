"use client"

import * as React from "react"
import { useForm, FormProvider, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { MapPin, Wallet, ArrowRight, Loader2, AlertCircle } from "lucide-react"

import { createOrderFormSchema, type CreateOrderFormValues } from "@/lib/validation"
import { cn, handleAction } from "@/lib/utils"
import { createOrder } from "@/actions/order/create"
import { OrderGeoModal } from "./_components/order-geo-modal"
import { ServerLocation } from "@/lib/server-utils"

interface CreateOrderFormProps {
    initialLocation: ServerLocation
}

export function CreateOrderForm({ initialLocation }: CreateOrderFormProps) {
    const router = useRouter()
    const [isGeoOpen, setIsGeoOpen] = React.useState(false)

    const methods = useForm({
        resolver: zodResolver(createOrderFormSchema),
        defaultValues: {
            description: "",
            locationId: initialLocation?.id ?? "",
            city: initialLocation?.name ?? "",
            price: 0,
            dateType: "ASAP",
            lat: initialLocation?.lat,
            lng: initialLocation?.lng,
            address: "", // Поле опционально, изначально пустая строка
            scheduledDate: undefined,
        }
    })

    const { control, handleSubmit, watch, register, formState: { errors } } = methods
    const description = watch("description")
    const cityName = watch("city")
    const preciseAddress = watch("address") 

    const mutation = useMutation({
        mutationFn: async (data: CreateOrderFormValues) => {
            // Отрезаем чисто интерфейсное поле `city`, оставляя payload валидным для Prisma бэкенда
            const { city, ...payload } = data
            return handleAction(createOrder(payload))
        },
        onSuccess: (data) => {
            toast.success("ЗАЗАЧА ЗАПУЩЕНА")
            router.push(`/order/${data.slug}`)
        },
        onError: (err: Error) => {
            toast.error(err.message || "Ошибка публикации")
        }
    })

    const onSubmit = (data: CreateOrderFormValues) => {
        mutation.mutate(data)
    }

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-12">
                {/* Скрытый инпут для отправки строкового адреса, если пользователь его указал */}
                <input type="hidden" {...register("address")} />

                {/* 1. ТЕКСТ ЗАДАЧИ */}
                <div className="relative group cursor-text">
                    <Controller
                        control={control}
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
                                    placeholder="ЧТО НУЖНО СДЕЛАТЬ?"
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">

                    {/* 2. ЛОКАЦИЯ */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between ml-2">
                            <div className="flex items-center gap-2">
                                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Локация</span>
                            </div>
                            
                            {preciseAddress && (
                                <span className="text-[9px] font-mono font-bold text-blue-600 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded uppercase tracking-tight animate-fade-in">
                                    Точка установлена
                                </span>
                            )}
                        </div>
                        
                        <Controller
                            control={control}
                            name="city"
                            render={({ fieldState }) => (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setIsGeoOpen(true)}
                                        // 🔥 Подсвечиваем красным только если не выбран сам населенный пункт
                                        className={cn(
                                            "w-full h-20 px-8 flex flex-col items-start justify-center bg-slate-50 rounded-[2rem] border-2 transition-all shadow-inner group relative",
                                            fieldState.invalid ? "border-red-500 bg-red-50/10" : "border-transparent hover:border-blue-100 hover:bg-white"
                                        )}
                                    >
                                        <div className="w-full flex items-center justify-between pr-8">
                                            <span className={cn(
                                                "font-black uppercase italic tracking-tighter truncate text-slate-900 transition-all",
                                                preciseAddress ? "text-base leading-none text-slate-400" : "text-2xl"
                                            )}>
                                                {cityName || "ВЫБРАТЬ ГОРОД..."}
                                            </span>
                                            <MapPin className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform absolute right-8 top-1/2 -translate-y-1/2" />
                                        </div>
                                        
                                        {/* Если точный адрес откалиброван на карте или введен — рендерим его жирным */}
                                        {preciseAddress && (
                                            <span className="text-2xl font-black uppercase italic tracking-tighter truncate text-slate-900 mt-1 leading-none w-[85%] text-left animate-fade-in">
                                                {preciseAddress}
                                            </span>
                                        )}
                                    </button>

                                    {fieldState.error && (
                                        <p className="text-[10px] font-black uppercase text-red-500 mt-2 ml-2 flex items-center gap-2 italic tracking-widest">
                                            <AlertCircle size={14} /> {fieldState.error.message}
                                        </p>
                                    )}
                                </>
                            )}
                        />
                    </div>

                    {/* 3. БЮДЖЕТ */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 ml-2">
                            <Wallet className="w-3.5 h-3.5 text-blue-600" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Бюджет (₽)</span>
                        </div>
                        <input
                            type="number"
                            {...methods.register("price", { valueAsNumber: true })}
                            className="w-full h-20 px-8 bg-slate-50 rounded-[2rem] border-2 border-transparent focus:border-blue-600 outline-none text-2xl font-black uppercase italic tracking-tighter text-slate-900 transition-all placeholder:text-slate-200"
                            placeholder="0"
                        />
                    </div>
                </div>

                {/* 4. КНОПКА ОТПРАВКИ */}
                <button
                    type="submit"
                    disabled={mutation.isPending}
                    className="w-full h-24 bg-blue-600 rounded-[2.5rem] flex items-center justify-center gap-4 group hover:bg-slate-900 transition-all duration-500 disabled:opacity-50"
                >
                    {mutation.isPending ? (
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                    ) : (
                        <>
                            <span className="text-3xl font-black uppercase italic tracking-tighter text-white">Запустить задачу</span>
                            <ArrowRight className="w-8 h-8 text-white group-hover:translate-x-2 transition-transform" />
                        </>
                    )}
                </button>

                <OrderGeoModal open={isGeoOpen} onOpenChange={setIsGeoOpen} />
            </form>
        </FormProvider>
    )
}
