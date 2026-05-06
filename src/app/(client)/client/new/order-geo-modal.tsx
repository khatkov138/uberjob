"use client"

import * as React from "react"
import { useFormContext } from "react-hook-form"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { MapPin, Check, Loader2 } from "lucide-react"
import { AddressInput } from "./address-input"
import { cn, handleAction } from "@/lib/utils"
import { getOrCreateLocation } from "@/actions/location/manage"
import { toast } from "sonner"
import { CreateOrderFormValues } from "@/lib/validation"
import { useLocationStore } from "@/store/use-location-store"

interface YandexSuggestItem {
    title: { text: string }
    uri: string
    subtitle?: { text: string }
}

interface OrderGeoModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function OrderGeoModal({ open, onOpenChange }: OrderGeoModalProps) {
    // 1. Подключаемся к контексту расширенной формы
    const { setValue, watch } = useFormContext<CreateOrderFormValues>()
    const { setLastOrderLocation } = useLocationStore()

    const [isCalibrating, setIsCalibrating] = React.useState(false)

    // 2. Наблюдаем за полями в реальном времени (вместо локального стейта preview)
    const [currentCity, currentLat] = watch(["city", "lat"])

    const handleLocationSelect = async (item: YandexSuggestItem) => {
        setIsCalibrating(true)
        try {
            const location = await handleAction(getOrCreateLocation(item.uri))

            // 3. Синхронно обновляем все поля формы
            setValue("locationId", location.id, { shouldValidate: true })
            setValue("city", location.name, { shouldValidate: true })
            setValue("lat", location.lat)
            setValue("lng", location.lng)

            // 4. Синхроним Zustand для сохранения "черновика" локации (для F5)
            setLastOrderLocation(location.id)

            toast.success(`Радар откалиброван: ${location.name}`)
            onOpenChange(false)
        } catch (err) {
            toast.error("Ошибка калибровки")
        } finally {
            setIsCalibrating(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] p-0 border-none bg-white rounded-[3.5rem] shadow-2xl overflow-hidden">
                <div className="p-8 pb-4">
                    <DialogTitle className="text-4xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">
                        Где встретимся<span className="text-blue-600">?</span>
                    </DialogTitle>
                </div>

                <div className="px-8 pb-8 space-y-6">
                    {/* ПОИСК */}
                    <div className="space-y-2">
                        <p className="ml-2 text-[9px] font-black uppercase text-slate-400 tracking-widest italic">
                            1. Найти населенный пункт
                        </p>
                        <AddressInput
                            defaultValue={currentCity}
                            onSelect={handleLocationSelect}
                        />
                    </div>

                    {/* ВИЗУАЛИЗАЦИЯ (КАРТА) */}
                    <div className="space-y-2">
                        <p className="ml-2 text-[9px] font-black uppercase text-slate-400 tracking-widest italic">
                            2. Точка на карте
                        </p>
                        <div className="h-[280px] w-full bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 relative overflow-hidden group">
                            {isCalibrating ? (
                                <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-3">
                                    <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                                    <span className="text-[10px] font-black uppercase italic text-blue-600 animate-pulse">
                                        Синхронизация...
                                    </span>
                                </div>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                                    <MapPin className={cn(
                                        "w-8 h-8 mb-2 transition-all duration-500",
                                        currentCity ? "text-blue-600 animate-bounce" : "text-slate-200"
                                    )} />
                                    <p className="text-[10px] font-black uppercase italic text-slate-400 max-w-[240px] leading-tight">
                                        {currentCity || "Выберите город в поиске выше"}
                                        {currentLat && (
                                            <span className="block text-blue-500/50 mt-1 uppercase">
                                                [Координаты в базе]
                                            </span>
                                        )}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ПОДТВЕРЖДЕНИЕ */}
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        disabled={isCalibrating || !currentCity}
                        className="w-full h-20 bg-slate-900 hover:bg-blue-600 disabled:bg-slate-100 disabled:text-slate-300 text-white rounded-[2rem] flex items-center justify-center gap-3 transition-all active:scale-95 group"
                    >
                        <span className="text-xl font-black uppercase italic tracking-tighter">
                            {isCalibrating ? "Минутку..." : "Подтвердить адрес"}
                        </span>
                        {!isCalibrating && currentCity && (
                            <Check className="w-6 h-6 group-hover:scale-125 transition-transform" />
                        )}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
