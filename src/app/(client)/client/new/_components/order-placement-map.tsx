"use client"

import React, { useRef, useState, useMemo, useEffect } from "react"
import { YMaps, Map, Rectangle, Placemark } from "@pbe/react-yandex-maps"
import { useFormContext } from "react-hook-form"
import { Target } from "lucide-react"
import { type CreateOrderFormValues } from "@/lib/validation"

interface OrderPlacementMapProps {
    initialCenter: [number, number]
}

/**
 * Точный расчет дельты координат для Иркутской широты (~52.2° N).
 */
function getGeoDeltas(centerLat: number, sizeKm: number) {
    const latDegreeKm = 111.132
    const lngDegreeKm = 111.320 * Math.cos((centerLat * Math.PI) / 180)

    return {
        latDelta: (sizeKm / 2) / latDegreeKm,
        lngDelta: (sizeKm / 2) / lngDegreeKm,
    }
}

export function OrderPlacementMap({ initialCenter }: OrderPlacementMapProps) {
    const mapRef = useRef<any>(null)
    const { setValue } = useFormContext<CreateOrderFormValues>()
    const debounceTimer = useRef<NodeJS.Timeout | null>(null)
    
    // 🛡️ ПРЕДОХРАНИТЕЛИ ЛИШНИХ ЗАПРОСОВ И РЕРЕНДЕРОВ
    const isFirstRender = useRef<boolean>(true) // Блокирует холостой выстрел при открытии модалки
    const lastCoordsRef = useRef<[number, number] | null>(null) // Защита от спама микро-сдвигов
    const isCorrectionInitialized = useRef<boolean>(false)
    
    const [isDragging, setIsDragging] = useState(false)
    
    // Фиксируем координаты города для нативной рамки
    const [cityLat, cityLng] = useMemo(() => initialCenter, []) 
    const cityFixedCenter = useMemo<[number, number]>(() => [cityLat, cityLng], [cityLat, cityLng])

    const { latDelta, lngDelta } = useMemo(() => getGeoDeltas(cityLat, 50), [cityLat])

    const constraints = useMemo(() => ({
        minLat: cityLat - latDelta,
        maxLat: cityLat + latDelta,
        minLng: cityLng - lngDelta,
        maxLng: cityLng + lngDelta
    }), [cityLat, latDelta, lngDelta])

    // Локальный стейт только для текста на плашке, чтобы не перерисовывать всю карту
    const [resolvedAddress, setResolvedAddress] = useState("Радар готов к уточнению...")

    const defaultMapState = useMemo(() => ({
        center: [cityLat, cityLng],
        zoom: 16, 
        controls: []
    }), [cityLat, cityLng])

    const mapOptions = useMemo(() => ({
        suppressMapOpenBlock: true,
        maxZoom: 18,
        minZoom: 10,
        avoidFractionalZoom: true,
        yandexMapDisablePoiInteractivity: true,
    }), [])

    const squareBounds = useMemo(() => [
        [constraints.minLat, constraints.minLng],
        [constraints.maxLat, constraints.maxLng]
    ], [constraints])

    // 🔥 СИНХРОНИЗАЦИЯ: Плавный перелет, если адрес выбран через PreciseAddressInput
    useEffect(() => {
        if (!mapRef.current) return
        
        // Если это первый запуск при открытии модалки — гасим автоматический перелет
        if (isFirstRender.current) {
            isFirstRender.current = false
            return
        }

        const mapInstance = mapRef.current
        const currentCenter = mapInstance.getCenter() as [number, number]
        
        const isProgrammaticMove = 
            Math.abs(currentCenter[0] - initialCenter[0]) > 0.0001 || 
            Math.abs(currentCenter[1] - initialCenter[1]) > 0.0001

        if (isProgrammaticMove) {
            mapInstance.setCenter(initialCenter, 17, { duration: 400 })
            fetchAddressFromServer(initialCenter)
        }
    }, [initialCenter])

    // Оптимизированная функция отправки сетевого запроса
    const fetchAddressFromServer = async (coords: [number, number]) => {
        const [lat, lng] = coords

        // 🛡️ Смарт-фильтр: Если новые координаты сместились меньше чем на ~15 метров — отменяем запрос
        if (lastCoordsRef.current) {
            const [lastLat, lastLng] = lastCoordsRef.current
            if (Math.abs(lat - lastLat) < 0.0002 && Math.abs(lng - lastLng) < 0.0002) {
                return 
            }
        }

        try {
            const response = await fetch(`/api/geo/suggest?lat=${lat}&lng=${lng}`)
            if (!response.ok) throw new Error()
            
            const result = await response.json()
            const finalAddress = result?.address || result?.data?.address

            if (finalAddress) {
                lastCoordsRef.current = [lat, lng] // Фиксируем точку успешного запроса
                setResolvedAddress(finalAddress)
                setValue("address", finalAddress, { shouldValidate: true, shouldDirty: true })
            }
        } catch (err) {
            setResolvedAddress("Точный адрес не определен")
        }
    }

    // Инициализация карты без холостых запросов в сеть
    const handleMapLoad = (mapInstance: any) => {
        if (!mapInstance) {
            mapRef.current = null
            return
        }
        mapRef.current = mapInstance
        isCorrectionInitialized.current = false

        mapInstance.events.add('actionbegin', () => {
            if (isCorrectionInitialized.current) return
            if (mapInstance.action && mapInstance.action.manager) {
                mapInstance.action.manager.setCorrection((actionTick: any) => {
                    actionTick.center = Math.max(constraints.minLat, Math.min(constraints.maxLat, actionTick.center))
                    actionTick.center = Math.max(constraints.minLng, Math.min(constraints.maxLng, actionTick.center))
                    return actionTick
                })
                isCorrectionInitialized.current = true
            }
        })

        // 🛡️ УБРАЛИ ХОЛОСТОЙ ВЫСТРЕЛ: fetchAddressFromServer отсюда удален. 
        // При монтировании адрес определится только если пользователь сдвинет прицел.
    }

    // Обработчик BoundsChange: только локальный UI, сеть спит!
    const handleBoundsChange = () => {
        if (!mapRef.current) return

        const currentCenter = mapRef.current.getCenter() as [number, number]
        if (!currentCenter || currentCenter.length < 2) return
        const [currentLat, currentLng] = currentCenter

        setResolvedAddress("Определяем адрес...")

        // Записываем координаты в RHF тихим ходом
        setValue("lat", currentLat, { shouldValidate: true, shouldDirty: true })
        setValue("lng", currentLng, { shouldValidate: true, shouldDirty: true })

        if (debounceTimer.current) clearTimeout(debounceTimer.current)
        
        // Мощный дебаунс на замирание мыши (800мс)
        debounceTimer.current = setTimeout(() => {
            fetchAddressFromServer([currentLat, currentLng])
        }, 800)
    }

    // Обработчик окончания физического движения (отпускание мыши / трекпада)
    const handleActionEnd = () => {
        setIsDragging(false)
        if (!mapRef.current) return

        const currentCenter = mapRef.current.getCenter() as [number, number]
        if (!currentCenter || currentCenter.length < 2) return

        if (debounceTimer.current) clearTimeout(debounceTimer.current)
        
        // При полном отпускании руки делаем аккуратный триггер в 300мс
        debounceTimer.current = setTimeout(() => {
            fetchAddressFromServer(currentCenter)
        }, 300)
    }

    const handleGeoLocation = () => {
        if (navigator.geolocation && mapRef.current) {
            navigator.geolocation.getCurrentPosition((position) => {
                const lat = position.coords.latitude
                const lng = position.coords.longitude
                
                const isLatValid = lat >= constraints.minLat && lat <= constraints.maxLat
                const isLngValid = lng >= constraints.minLng && lng <= constraints.maxLng
                
                if (isLatValid && isLngValid) {
                    isFirstRender.current = false // Разрешаем перелет
                    mapRef.current.setCenter([lat, lng], 17, { duration: 600 })
                    setValue("lat", lat, { shouldValidate: true, shouldDirty: true })
                    setValue("lng", lng, { shouldValidate: true, shouldDirty: true })
                    fetchAddressFromServer([lat, lng])
                }
            })
        }
    }

    useEffect(() => {
        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current)
        }
    }, [])

    return (
        <YMaps query={{ apikey: process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY, lang: "ru_RU" }}>
            <div 
                data-dragging={isDragging} 
                className="group relative w-full h-full bg-slate-100 select-none"
            >
                {/* КООРДИНАТНАЯ И АДРЕСНАЯ ПЛАШКА */}
                <div className="absolute top-4 left-4 right-16 z-20 pointer-events-none">
                    <div className="backdrop-blur-md px-4 py-3 rounded-2xl border shadow-2xl bg-slate-950/90 border-white/10 text-white">
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 leading-none">
                            Точка встречи
                        </p>
                        <p className="text-xs font-bold mt-1.5 truncate text-slate-100">
                            {resolvedAddress}
                        </p>
                    </div>
                </div>

                {/* ЛЕТАЮЩИЙ HTML-ПРИЦЕЛ */}
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none select-none">
                    <div className="relative flex flex-col items-center">
                        <div className="absolute top-0 -translate-y-[100%] flex flex-col items-center transition-all duration-200 ease-out group-data-[dragging=true]:-translate-y-[118%]">
                            <div className="relative w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white shadow-xl
                                after:content-[''] after:absolute after:bottom-[-6px] after:left-1/2 after:-translate-x-1/2 
                                after:w-0 after:h-0 after:border-l-[6px] after:border-l-transparent after:border-r-[6px] after:border-r-transparent after:border-t-[8px] after:border-t-blue-600
                                before:content-[''] before:absolute before:bottom-[-9px] before:left-1/2 before:-translate-x-1/2 
                                before:w-0 before:h-0 after:border-t-blue-600 before:border-l-[7px] before:border-l-transparent before:border-r-[7px] before:border-r-transparent before:border-t-[9px] before:border-t-white before:-z-10"
                            >
                                <div className="w-3.5 h-3.5 bg-white rounded-full shadow-inner" />
                            </div>
                        </div>
                        <div className="relative flex items-center justify-center">
                            <div className="w-1.5 h-1.5 bg-slate-950 rounded-full border border-white shadow-sm z-10" />
                            <div className="absolute w-4 h-1 bg-slate-950/30 rounded-full blur-[0.5px] -bottom-[0.5px] scale-100 transition-all duration-200 group-data-[dragging=true]:scale-50 group-data-[dragging=true]:opacity-40" />
                        </div>
                    </div>
                </div>

                <Map
                    instanceRef={handleMapLoad}
                    defaultState={defaultMapState}
                    options={mapOptions}
                    width="100%"
                    height="100%"
                    onBoundsChange={handleBoundsChange}
                    onActionBegin={() => setIsDragging(true)}
                    onActionEnd={handleActionEnd}
                    className="w-full h-full"
                >
                    <Rectangle
                        geometry={squareBounds}
                        options={{
                            strokeColor: "#2563eb",
                            strokeOpacity: 0.8,
                            strokeWidth: 2,
                            strokeStyle: "dash",
                            strokeDasharray:[6,4],
                            fillColor: "#2563eb",
                            fillOpacity: 0.02,
                            interactive: false, 
                            hasHint: false,
                            hasBalloon: false,
                        } as any}
                    />

                    <Placemark
                        geometry={cityFixedCenter}
                        options={{ preset: "islands#dotIcon", iconColor: "#1e1b4b" }}
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
