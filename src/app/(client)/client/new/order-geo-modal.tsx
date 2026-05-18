"use client"

import * as React from "react"
import { useFormContext } from "react-hook-form"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Check, Loader2, MapPin } from "lucide-react"
import { AddressInput } from "./address-input"
import { handleAction } from "@/lib/utils"
import { getOrCreateLocation } from "@/actions/location/manage"
import { toast } from "sonner"
import { CreateOrderFormValues } from "@/lib/validation"
import { useLocationStore } from "@/store/use-location-store"
import dynamic from "next/dynamic"

// Ленивый импорт карты
const OrderPlacementMap = dynamic(
    () => import("./order-placement-map").then((mod) => mod.OrderPlacementMap),
    {
        ssr: false,
        loading: () => (
            <div className="absolute inset-0 bg-slate-50 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" strokeWidth={3} />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 animate-pulse">
                    Спутник инициализируется...
                </span>
            </div>
        )
    }
)

interface YandexSuggestItem {
    title: { text: string }
    uri: string
}

interface OrderGeoModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function OrderGeoModal({ open, onOpenChange }: OrderGeoModalProps) {
    const { setValue, register, getValues } = useFormContext<CreateOrderFormValues>()
    const { setLastOrderLocation,  } = useLocationStore()
    
    const [isCalibrating, setIsCalibrating] = React.useState(false)
    
    // 🔥 ГЛАВНЫЙ МОСТИК: Храним координаты для инициализации карты
    const [mapCoords, setMapCoords] = React.useState<[number, number] | null>(null)
    const [cityName, setCityName] = React.useState<string>("")

    // Синхронизируем локальный стейт один раз при открытии окна, если в форме уже что-то сохранено
    React.useEffect(() => {
        if (open) {
            const [formCity, formLat, formLng] = getValues(["city", "lat", "lng"])
            if (formCity && formLat && formLng) {
                setCityName(formCity)
                setMapCoords([formLat, formLng])
            }
        }
    }, [open, getValues])

    // Пользователь кликнул по подсказке (выбрал город на клиенте)
    const handleLocationSelect = async (item: YandexSuggestItem) => {
        setIsCalibrating(true)
        try {
            // Дергаем экшен, берем координаты из базы Postgres
            const location = await handleAction(getOrCreateLocation(item.uri))

            // 1. Пишем данные напрямую в форму
            setValue("locationId", location.id, { shouldValidate: true })
            setValue("city", location.name, { shouldValidate: true })
            setValue("lat", location.lat)
            setValue("lng", location.lng)

            // 2. Обновляем локальный стейт, чтобы карта перерендерилась в новом городе
            setCityName(location.name)
            setMapCoords([location.lat, location.lng])

            // 3. Синкаем куку
            setLastOrderLocation(location.slug)

            toast.success(`Радар перенаправлен на город: ${location.name}`)
        } catch (err) {
            toast.error("Ошибка калибровки города")
        } finally {
            setIsCalibrating(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] p-0 border-none bg-white rounded-[3.5rem] shadow-2xl overflow-hidden">
                {/* Регистрируем скрытые поля формы */}
                <input type="hidden" {...register("locationId")} />
                <input type="hidden" {...register("lat")} />
                <input type="hidden" {...register("lng")} />

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
                            defaultValue={cityName}
                            onSelect={handleLocationSelect}
                        />
                    </div>

                    {/* КАРТА-ПРИЦЕЛ */}
                    <div className="space-y-2">
                        <p className="ml-2 text-[9px] font-black uppercase text-slate-400 tracking-widest italic">
                            2. Уточнить точку встречи на карте
                        </p>
                        <div className="h-[280px] w-full bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 relative overflow-hidden group shadow-inner">
                            {isCalibrating ? (
                                <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-3">
                                    <Loader2 className="w-10 h-10 animate-spin text-blue-600" strokeWidth={3} />
                                    <span className="text-[10px] font-black uppercase italic text-blue-600 animate-pulse">
                                        Синхронизация радара...
                                    </span>
                                </div>
                            ) : mapCoords ? (
                                // 🔥 Пересоздаем карту по ключу из координат. 
                                // При зуме и драге mapCoords НЕ меняется, поэтому карта работает монолитно!
                                <OrderPlacementMap 
                                    key={cityName} 
                                    initialCenter={mapCoords} 
                                />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-slate-50">
                                    <MapPin className="w-8 h-8 mb-2 text-slate-200" />
                                    <p className="text-[10px] font-black uppercase italic text-slate-400 max-w-[240px] leading-tight tracking-widest">
                                        Выберите город в поиске выше, чтобы открыть карту
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        disabled={isCalibrating || !mapCoords}
                        className="w-full h-20 bg-slate-900 hover:bg-blue-600 disabled:bg-slate-100 text-white rounded-[2rem] flex items-center justify-center gap-3 transition-all active:scale-95 group"
                    >
                        <span className="text-xl font-black uppercase italic tracking-tighter">
                            Подтвердить адрес
                        </span>
                        {!isCalibrating && mapCoords && <Check className="w-6 h-6 group-hover:scale-125 transition-transform" />}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
