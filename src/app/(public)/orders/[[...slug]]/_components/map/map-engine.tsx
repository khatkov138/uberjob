"use client"

import React, { useMemo, useRef, useEffect } from "react"
import { YMaps, Map, Placemark, Circle, ZoomControl, Clusterer } from "@pbe/react-yandex-maps"
import { Target, MapPin, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { BaseOrder } from "@/actions/order/get-feed"

interface OrdersMapProps {
  orders: BaseOrder[]
  center: [number, number]
  radius: number
  isFetching?: boolean
}

export const MapEngine = ({ orders, center, radius, isFetching }: OrdersMapProps) => {
  const mapRef = useRef<any>(null)

  // 1. Статистика через готовый флаг isMatch
  const stats = useMemo(() => {
    const matchedCount = orders.filter(o => o.isMatch).length
    return { matched: matchedCount, total: orders.length }
  }, [orders])

  // 2. Авто-фокус на маркеры
  useEffect(() => {
    if (mapRef.current && orders.length > 0) {
      mapRef.current.setBounds(mapRef.current.geoObjects.getBounds(), {
        checkZoomRange: true,
        zoomMargin: 100,
        duration: 800,
      });
    }
  }, [orders.length]);

  const handleGeoLocation = () => {
    if (navigator.geolocation && mapRef.current) {
      navigator.geolocation.getCurrentPosition((position) => {
        const coords = [position.coords.latitude, position.coords.longitude];
        mapRef.current.setCenter(coords, 14, { duration: 1000 });
      });
    }
  };

  return (
    <YMaps query={{ apikey: process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY }}>
      <div className="relative w-full h-full">

        {/* ИНДИКАТОР СТАТИСТИКИ */}
        <div className="absolute top-6 left-6 z-20">
          <div className="bg-white/90 backdrop-blur-md border border-slate-200 px-4 py-2.5 rounded-2xl shadow-lg">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                isFetching ? "bg-blue-400 animate-ping" : "bg-blue-600 animate-pulse"
              )} />
              <span className="font-black italic uppercase text-[10px] tracking-widest text-slate-900 leading-none">
                {stats.matched} <span className="text-blue-600">Подходят</span>
              </span>
            </div>
            <p className="text-[8px] font-bold uppercase text-slate-400 mt-1 tracking-tighter">
              Всего в области: {stats.total}
            </p>
          </div>
        </div>

        <Map
          instanceRef={mapRef}
          state={{ center, zoom: 12, controls: [] }}
          width="100%"
          height="100%"
          modules={["geoObject.addon.balloon", "geoObject.addon.hint"]}
          options={{
            suppressMapOpenBlock: true,
            maxZoom: 18,
            minZoom: 4
          }}
        >
          <ZoomControl options={{ position: { right: 20, top: 40 } }} />

          <Clusterer
            options={{
              preset: "islands#invertedBlueClusterIcons",
              clusterDisableClickZoom: false,
            }}
          >
            {orders.map((order, index) => {
              // ТВОЙ ГЕНИАЛЬНЫЙ ДЖИТТЕР (сохранен на 100%)
              const angle = index * 0.8;
              const dist = 0.00025 * Math.sqrt(index);
              const jitteredGeometry = [order.lat + dist * Math.cos(angle), order.lng + dist * Math.sin(angle)];

              return (
                <Placemark
                  key={order.id}
                  geometry={jitteredGeometry}
                  properties={{
                    balloonContentHeader: `<div style="font-family: sans-serif; font-weight: 900; font-style: italic; text-transform: uppercase; font-size: 12px; border-bottom: 2px solid #000; padding-bottom: 4px; margin-bottom: 8px;">Заказ #${order.id.slice(-4)}</div>`,
                    balloonContentBody: `<div style="font-family: sans-serif; font-weight: 900; font-style: italic; color: #2563eb; font-size: 20px;">${order.price > 0 ? order.price.toLocaleString() + ' ₽' : 'Договорная'}</div>`,
                  }}
                  options={{
                    preset: order.isMatch ? 'islands#blueCircleDotIcon' : 'islands#blackCircleDotIcon',
                    iconColor: order.isMatch ? '#2563eb' : '#0f172a',
                    hideIconOnBalloonOpen: false, // Оставляем балун как быстрый чек
                  }}
                  onClick={() => {
                    const params = new URLSearchParams(window.location.search);
                    // Используем ПРАВИЛЬНОЕ поле slug
                    params.set("viewOrder", order.slug);

                    const newUrl = `${window.location.pathname}?${params.toString()}`;
                    window.history.pushState(null, "", newUrl);

                    console.log(`🎯 [MAP] Opening Sheet for Slug: ${order.slug}`);
                  }}
                />
              )
            })}
          </Clusterer>

          <Circle
            geometry={[center, radius * 1000]}
            options={{
              fillColor: "rgba(37, 99, 235, 0.04)",
              strokeColor: "#2563eb",
              strokeWidth: 2,
              strokeStyle: 'shortdash',
            }}
          />
        </Map>

        <button
          onClick={handleGeoLocation}
          className="absolute right-6 bottom-10 z-20 w-12 h-12 bg-white border border-slate-200 shadow-xl rounded-2xl flex items-center justify-center hover:bg-slate-50 transition-all active:scale-95 group"
        >
          <Target className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
        </button>
      </div>
    </YMaps>
  )
}
