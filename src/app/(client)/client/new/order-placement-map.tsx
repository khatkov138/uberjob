"use client"

import React, { useRef, useEffect } from "react"
import { YMaps, Map, Placemark } from "@pbe/react-yandex-maps"
import { useFormContext } from "react-hook-form"
import { Target } from "lucide-react"
import { type CreateOrderFormValues } from "@/lib/validation"

interface OrderPlacementMapProps {
    center: [number, number] // Центр города, полученный из геокодера
}

export function OrderPlacementMap({ center }: OrderPlacementMapProps) {
    const mapRef = useRef<any>(null)
    const placemarkRef = useRef<any>(null)

    // 1. Подключаемся к контексту формы, созданной в CreateOrderForm
    const { setValue, watch } = useFormContext<CreateOrderFormValues>()
    
    // Реактивно наблюдаем за текущими координатами точки
    const [currentLat, currentLng] = watch(["lat", "lng"])

    // 2. Синхронизируем положение карты, когда пользователь меняет город в поиске
    useEffect(() => {
        if (mapRef.current && center) {
            mapRef.current.setCenter(center, 15, { duration: 800 })
            // Сразу инициализируем координаты формы центром города, если они еще не заданы
            if (!currentLat || !currentLng) {
                setValue("lat", center[0])
                setValue("lng", center[1])
            }
        }
    }, [center, setValue])

    // 3. Обработчик завершения перетаскивания метки (DragEnd)
    const handleDragEnd = () => {
        if (placemarkRef.current) {
            const coords = placemarkRef.current.geometry.getCoordinates()
            setValue("lat", coords[0])
            setValue("lng", coords[1])
            console.log(`📍 [MAP DRAG] Новая точка зафиксирована: ${coords[0]}, ${coords[1]}`)
        }
    }

    // 4. Обработчик клика по карте (быстрое перемещение метки на дом/улицу)
    const handleMapClick = (e: any) => {
        const coords = e.get("coords")
        setValue("lat", coords[0])
        setValue("lng", coords[1])
        console.log(`🎯 [MAP CLICK] Точка перемещена кликом: ${coords[0]}, ${coords[1]}`)
    }

    // Координаты для рендеринга метки на карте (фолбэк на дефолтный центр)
    const markerGeometry = currentLat && currentLng ? [currentLat, currentLng] : center

    const handleGeoLocation = () => {
        if (navigator.geolocation && mapRef.current) {
            navigator.geolocation.getCurrentPosition((position) => {
                const coords = [position.coords.latitude, position.coords.longitude]
                setValue("lat", coords[0])
                setValue("lng", coords[1])
                mapRef.current.setCenter(coords, 16, { duration: 1000 })
            })
        }
    }

    return (
        <YMaps query={{ apikey: process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY }}>
            <div className="relative w-full h-full">
                
                {/* МЕТКА ТЕКУЩЕГО СТАТУСА */}
                <div className="absolute top-4 left-4 z-20 pointer-events-none">
                    <div className="bg-slate-950 text-white px-4 py-2 rounded-xl border border-white/10 shadow-xl">
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                            Координаты радара
                        </p>
                        <p className="font-mono text-[9px] font-bold text-blue-400 mt-0.5">
                            {currentLat?.toFixed(6) ?? "0.0"}, {currentLng?.toFixed(6) ?? "0.0"}
                        </p>
                    </div>
                </div>

                <Map
                    instanceRef={mapRef}
                    state={{ center, zoom: 14, controls: [] }}
                    width="100%"
                    height="100%"
                    onClick={handleMapClick}
                    options={{
                        suppressMapOpenBlock: true,
                        maxZoom: 18,
                        minZoom: 4
                    }}
                >
                    <Placemark
                        instanceRef={placemarkRef}
                        geometry={markerGeometry}
                        options={{
                            preset: 'islands#blueCircleDotIconWithCaption',
                            iconColor: '#2563eb',
                            draggable: true, // 🔥 ВКЛЮЧАЕМ РЕЖИМ ПЕРЕТАСКИВАНИЯ ТОЧКИ
                        }}
                        properties={{
                            iconCaption: "Точка встречи"
                        }}
                        onDragEnd={handleDragEnd}
                    />
                </Map>

                {/* КНОПКА ГЕОЛОКАЦИИ ЮЗЕРА */}
                <button
                    type="button"
                    onClick={handleGeoLocation}
                    className="absolute right-4 bottom-4 z-20 w-12 h-12 bg-white border border-slate-200 shadow-xl rounded-2xl flex items-center justify-center hover:bg-slate-50 transition-all active:scale-95 group"
                >
                    <Target className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
                </button>
            </div>
        </YMaps>
    )
}
