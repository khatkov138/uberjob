"use client"

import React, { useRef, useState, useMemo, useEffect } from "react"
import { YMaps, Map, Rectangle } from "@pbe/react-yandex-maps" // 🔥 Импортируем нативный Rectangle
import { useFormContext } from "react-hook-form"
import { Target } from "lucide-react"
import { type CreateOrderFormValues } from "@/lib/validation"

interface OrderPlacementMapProps {
    initialCenter: [number, number]
}

export function OrderPlacementMap({ initialCenter }: OrderPlacementMapProps) {
    const mapRef = useRef<any>(null)
    const { setValue } = useFormContext<CreateOrderFormValues>()
    
    // Радиус ограничений: ±25 км во все стороны (сторона квадрата 50 км)
    const DELTA_LIMIT = 0.225
    const [centerLat, centerLng] = initialCenter || [52.289588, 104.280606]

    const [geoStatus, setGeoStatus] = useState<{
        lat: number
        lng: number
        isValid: boolean
    }>({
        lat: centerLat,
        lng: centerLng,
        isValid: true
    })

    const defaultMapState = useMemo(() => ({
        center: [centerLat, centerLng],
        zoom: 11, 
        controls: []
    }), [centerLat, centerLng])

    // Ограничиваем ход камеры с запасом (100х100 км), чтобы прицел мог встать на самый край
    const mapOptions = useMemo(() => {
        const cameraDelta = 0.45 
        return {
            suppressMapOpenBlock: true,
            maxZoom: 18,
            minZoom: 10,
            yandexMapDisablePoiInteractivity: true,
            restrictMapArea: [
                [centerLat - cameraDelta, centerLng - cameraDelta],
                [centerLat + cameraDelta, centerLng + cameraDelta]
            ]
        }
    }, [centerLat, centerLng])

    // Рассчитываем точные географические координаты углов нашей рамки обслуживания (Земля)
    const squareBounds = useMemo(() => {
        return [
            [centerLat - DELTA_LIMIT, centerLng - DELTA_LIMIT], // Юго-западный угол
            [centerLat + DELTA_LIMIT, centerLng + DELTA_LIMIT]  // Северо-восточный угол
        ]
    }, [centerLat, centerLng])

    useEffect(() => {
        setValue("lat", centerLat)
        setValue("lng", centerLng)
    }, [centerLat, centerLng, setValue])

    // Проверяем, уложился ли прицел в квадратные рамки
    const handleBoundsChange = () => {
        if (!mapRef.current) return

        const newCenter = mapRef.current.getCenter() as [number, number]
        if (!newCenter || newCenter.length < 2) return
        
        const [currentLat, currentLng] = newCenter

        const isLatValid = Math.abs(currentLat - centerLat) <= DELTA_LIMIT
        const isLngValid = Math.abs(currentLng - centerLng) <= DELTA_LIMIT
        const isInsideSquare = isLatValid && isLngValid

        if (isInsideSquare) {
            setValue("lat", currentLat)
            setValue("lng", currentLng)
            setGeoStatus({ lat: currentLat, lng: currentLng, isValid: true })
        } else {
            setValue("lat", null as any)
            setValue("lng", null as any)
            setGeoStatus({ lat: currentLat, lng: currentLng, isValid: false })
        }
    }

    const handleGeoLocation = () => {
        if (navigator.geolocation && mapRef.current) {
            navigator.geolocation.getCurrentPosition((position) => {
                const lat = position.coords.latitude
                const lng = position.coords.longitude
                
                const isLatValid = Math.abs(lat - centerLat) <= DELTA_LIMIT
                const isLngValid = Math.abs(lng - centerLng) <= DELTA_LIMIT
                
                if (isLatValid && isLngValid) {
                    mapRef.current.setCenter([lat, lng], 16, { duration: 600 })
                    setValue("lat", lat)
                    setValue("lng", lng)
                    setGeoStatus({ lat, lng, isValid: true })
                }
            })
        }
    }

    return (
        <YMaps query={{ apikey: process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY, lang: "ru_RU" }}>
            <div className="relative w-full h-full bg-slate-100">
                
                {/* КООРДИНАТНАЯ ПЛАШКА */}
                <div className="absolute top-4 left-4 z-20 pointer-events-none">
                    <div className={`backdrop-blur-md px-4 py-2.5 rounded-2xl border shadow-2xl transition-colors duration-300 ${
                        geoStatus.isValid 
                            ? "bg-slate-950/90 border-white/10 text-white" 
                            : "bg-red-950/90 border-red-500/20 text-red-200"
                    }`}>
                        <p className="text-[8px] font-black uppercase tracking-widest opacity-60">
                            {geoStatus.isValid ? "Прицел радара" : "Внимание"}
                        </p>
                        <p className={`font-mono text-[10px] font-bold mt-0.5 tracking-tight ${
                            geoStatus.isValid ? "text-blue-400" : "text-red-400 animate-pulse"
                        }`}>
                            {geoStatus.isValid 
                                ? `${geoStatus.lat.toFixed(6)}, ${geoStatus.lng.toFixed(6)}` 
                                : "ВНЕ ЗОНЫ ОБСЛУЖИВАНИЯ"
                            }
                        </p>
                    </div>
                </div>

                {/* ЖЕСТКИЙ HTML-ПРИЦЕЛ (СИДИТ НА СТЕКЛЕ МОНИТОРА, ВСЕГДА ПО ЦЕНТРУ ОКНА КАРТЫ) */}
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none select-none">
                    <div className="relative flex flex-col items-center -translate-y-1/2">
                        <div className={`w-7 h-7 rounded-full border-4 border-white shadow-2xl flex items-center justify-center transition-colors duration-300 ${
                            geoStatus.isValid ? "bg-blue-600" : "bg-red-500 scale-110"
                        }`}>
                            <div className="w-1.5 h-1.5 bg-white rounded-full" />
                        </div>
                    </div>
                </div>

                <Map
                    instanceRef={mapRef}
                    defaultState={defaultMapState}
                    options={mapOptions}
                    width="100%"
                    height="100%"
                    onBoundsChange={handleBoundsChange}
                    className="w-full h-full"
                >
                    {/* 🔥 ЗАКРЕПЛЕННЫЙ КВАДРАТ ЯНДЕКСА: Теперь он жестко лежит на координатах земли! */}
                    {/* Он скроллится и зумится намертво вместе с улицами Шелехова, Иркутска и Маркова */}
                    <Rectangle
                        geometry={squareBounds}
                        options={{
                            fillColor: geoStatus.isValid ? "rgba(37, 99, 235, 0.01)" : "rgba(239, 68, 68, 0.02)",
                            strokeColor: geoStatus.isValid ? "#2563eb" : "#ef4444", // Меняет цвет контура на красный
                            strokeOpacity: 0.6,
                            strokeWidth: 3,
                            strokeStyle: "shortdash",     // Наш фирменный пунктир радара ZWORK
                            hasHint: false,               // Отключаем хинты, чтобы не перехватывать клики мыши
                            hasBalloon: false,            // Отключаем балуны
                            cursor: "grab"                // Курсор остается хваталкой для свободного вождения карты
                        }}
                    />
                </Map>

                <button
                    type="button"
                    onClick={handleGeoLocation}
                    className="absolute right-4 bottom-4 z-20 w-12 h-12 bg-white border border-slate-200 shadow-xl rounded-2xl flex items-center justify-center hover:bg-slate-50 transition-all active:scale-95 group"
                >
                    <Target className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </button>
            </div>
        </YMaps>
    )
}
