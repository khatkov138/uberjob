"use client"

import * as React from "react"
import { useFormContext } from "react-hook-form"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Check, Loader2, MapPin, Sparkles, Navigation } from "lucide-react"
import { CitySearchInput } from "./city-search-input"

import { handleAction } from "@/lib/utils"
import { getOrCreateLocation } from "@/actions/location/manage"
import { toast } from "sonner"
import { CreateOrderFormValues } from "@/lib/validation"
import { useLocationStore } from "@/store/use-location-store"
import dynamic from "next/dynamic"
import { PreciseAddressInput } from "./precise-address-input"

// Ленивый импорт карты
const OrderPlacementMap = dynamic(
    () => import("../_components/order-placement-map").then((mod) => mod.OrderPlacementMap),
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
    subtitle?: { text: string }
    uri: string
}

interface OrderGeoModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function OrderGeoModal({ open, onOpenChange }: OrderGeoModalProps) {
    const { setValue, register, getValues, watch } = useFormContext<CreateOrderFormValues>()
    const { setLastOrderLocation } = useLocationStore()

    const [isCalibrating, setIsCalibrating] = React.useState(false)

    // Локальный стейт для управления картой
    const [mapCoords, setMapCoords] = React.useState<[number, number] | null>(null)
    const [cityName, setCityName] = React.useState<string>("")

    // Наблюдаем за точным адресом с карты/инпута в реальном времени
    const currentAddress = watch("address")

    // Синхронизируем состояние при открытии модалки
    React.useEffect(() => {
        if (open) {
            const [formCity, formLat, formLng] = getValues(["city", "lat", "lng"])
            if (formCity && formLat && formLng) {
                setCityName(formCity)
                setMapCoords([formLat, formLng])
            }
        }
    }, [open, getValues])

    // Шаг 1: Пользователь выбрал ГОРОД
    const handleCitySelect = async (item: YandexSuggestItem) => {
        setIsCalibrating(true)
        try {
            const location = await handleAction(getOrCreateLocation(item.uri))

            setValue("locationId", location.id, { shouldValidate: true })
            setValue("city", location.name, { shouldValidate: true })
            setValue("lat", location.lat, { shouldValidate: true })
            setValue("lng", location.lng, { shouldValidate: true })
            setValue("address", "", { shouldValidate: true }) // Жестко чистим старый адрес старого города

            setCityName(location.name)
            setMapCoords([location.lat, location.lng])
            setLastOrderLocation(location.slug)

            toast.success(`Город калиброван: ${location.name}`)
        } catch (err) {
            toast.error("Ошибка калибровки города")
        } finally {
            setIsCalibrating(false)
        }
    }

    // Шаг 2: Пользователь ввел точную УЛИЦУ / ДОМ в инпуте подсказок
    const handleAddressSelect = async (item: YandexSuggestItem) => {
        setValue("address", item.title.text, { shouldValidate: true, shouldDirty: true })

        // По URI подсказки вытаскиваем точные координаты этого дома через подкапотный геокодер Яндекса
        // @ts-ignore
        if (typeof ymaps !== "undefined" && mapCoords) {
            // @ts-ignore
            ymaps.geocode(`${cityName}, ${item.title.text}`).then((res: any) => {
                const firstGeoObject = res.geoObjects.get(0)
                if (firstGeoObject) {
                    const coords = firstGeoObject.getCoordinates() as [number, number]

                    const [targetLat, targetLng] = coords

                    // Передвигаем форму на чистые числовые координаты найденного дома
                    setValue("lat", targetLat, { shouldValidate: true, shouldDirty: true })
                    setValue("lng", targetLng, { shouldValidate: true, shouldDirty: true })

                    // Перерисовываем карту на координаты конкретного здания (плавный useEffect)
                    setMapCoords(coords)
                }
            })
        }
    }

    // Проверки для геймификации шагов
    const isStep1Done = !!cityName && !isCalibrating
    const isStep2Done = !!currentAddress && currentAddress !== "Определяем адрес..." && currentAddress !== ""

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] p-0 border-none bg-white rounded-[3.5rem] shadow-2xl overflow-hidden">
                <input type="hidden" {...register("locationId")} />
                <input type="hidden" {...register("lat")} />
                <input type="hidden" {...register("lng")} />
                <input type="hidden" {...register("address")} />

                <div className="p-8 pb-4">
                    <DialogTitle className="text-4xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">
                        Где встретимся<span className="text-blue-600">?</span>
                    </DialogTitle>
                </div>

                <div className="px-8 pb-8 space-y-6">

                    {/* ШАГ 1: ВЫБОР ГОРОДА */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 ml-2">
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-all duration-300 ${isStep1Done ? "bg-emerald-500 scale-110" : "bg-slate-200"
                                }`}>
                                {isStep1Done ? (
                                    <Check size={10} className="text-white" />
                                ) : (
                                    <span className="text-[9px] font-black text-slate-500">1</span>
                                )}
                            </div>
                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest italic">
                                Выберите населенный пункт
                            </p>
                        </div>
                        <CitySearchInput
                            defaultValue={cityName}
                            onSelect={handleCitySelect}
                            placeholder="Например: Иркутск, Ангарск..."
                        />
                    </div>

                    {/* ДИНАМИЧЕСКИЙ БЛОК: Раскрывается только когда Шаг 1 успешно пройден */}
                    {mapCoords && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">

                            {/* ШАГ 2: ВВОД УЛИЦЫ И ДОМА */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 ml-2">
                                    <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-all duration-300 ${isStep2Done ? "bg-emerald-500 scale-110" : "bg-slate-200"
                                        }`}>
                                        {isStep2Done ? (
                                            <Check size={10} className="text-white" />
                                        ) : (
                                            <span className="text-[9px] font-black text-slate-500">2</span>
                                        )}
                                    </div>
                                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest italic">
                                        Укажите улицу и номер дома (необязательно)
                                    </p>
                                </div>
                                <PreciseAddressInput
                                    key={`address-for-${cityName}`}
                                    defaultValue={currentAddress === "Определяем адрес..." ? "" : currentAddress}
                                    onSelect={handleAddressSelect}
                                    placeholder={`Искать в г. ${cityName}...`}
                                    boundedCoords={mapCoords}
                                />
                            </div>

                            {/* ШАГ 3: КАРТА-ПРИЦЕЛ */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 ml-2">
                                    <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-all duration-300 ${isStep2Done ? "bg-emerald-500 scale-110" : "bg-slate-200"
                                        }`}>
                                        {isStep2Done ? (
                                            <Check size={10} className="text-white" />
                                        ) : (
                                            <Navigation size={9} className="text-slate-500" />
                                        )}
                                    </div>
                                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest italic">
                                        Или уточните прицелом на карте
                                    </p>
                                </div>
                                <div className="h-[200px] w-full bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 relative overflow-hidden group shadow-inner">
                                    {isCalibrating ? (
                                        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-3">
                                            <Loader2 className="w-10 h-10 animate-spin text-blue-600" strokeWidth={3} />
                                            <span className="text-[10px] font-black uppercase italic text-blue-600 animate-pulse">
                                                Калибровка радара...
                                            </span>
                                        </div>
                                    ) : (
                                        <OrderPlacementMap
                                            key={cityName}
                                            initialCenter={mapCoords}
                                        />
                                    )}
                                </div>
                            </div>

                        </div>
                    )}

                    {/* ИНФОРМАЦИОННЫЙ ИНДИКАТОР ИТОГОВОЙ ТОЧКИ */}
                    {isStep1Done && (
                        <div className="px-4 py-2.5 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3 animate-in fade-in zoom-in-95 duration-200">
                            <div className="w-7 h-7 bg-emerald-500 text-white rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                                <Sparkles size={14} />
                            </div>
                            <div className="truncate">
                                <p className="text-[8px] font-black uppercase tracking-widest text-emerald-600 leading-none">Точка зафиксирована</p>
                                <p className="text-xs font-bold text-slate-900 mt-1 truncate">
                                    {cityName}{isStep2Done ? `, ${currentAddress}` : " (калибровка по центру)"}
                                </p>
                            </div>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        // 🔥 ФИКС: Кнопка нажимается сразу, как только успешно выполнен Шаг 1 (выбран город)
                        disabled={!isStep1Done || currentAddress === "Определяем адрес..."}
                        className="w-full h-18 bg-slate-900 hover:bg-blue-600 disabled:bg-slate-100 text-white rounded-[2rem] flex items-center justify-center gap-3 transition-all active:scale-95 group"
                    >
                        <span className="text-lg font-black uppercase italic tracking-tighter">
                            Подтвердить адрес
                        </span>
                        {isStep1Done && (
                            <Check className="w-6 h-5 group-hover:scale-125 transition-transform" />
                        )}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
