"use client"

import React, { useMemo, useRef, useEffect } from "react"
import { YMaps, Map, Placemark, Circle, ZoomControl, Clusterer } from "@pbe/react-yandex-maps"
import { Target, MapPin, Radio, Loader2 } from "lucide-react"
import { type FeedOrder } from "@/actions/order/get"
import { useLocationStore } from "@/store/use-location-store"
import { cn } from "@/lib/utils"

interface OrdersMapProps {
  orders: FeedOrder[]
  center: [number, number]
  mySkillIds: Set<string>
  isFetching?: boolean
}

export const MapEngine = ({ orders, center, mySkillIds, isFetching }: OrdersMapProps) => {
  const mapRef = useRef<any>(null)
  const { radius, _hasHydrated } = useLocationStore()

  // Авто-фокус на пачку заказов
  useEffect(() => {
    if (mapRef.current && orders.length > 0) {
      mapRef.current.setBounds(mapRef.current.geoObjects.getBounds(), {
        checkZoomRange: true,
        zoomMargin: 100,
        duration: 800,
      });
    }
  }, [orders]);

  const handleGeoLocation = () => {
    if (navigator.geolocation && mapRef.current) {
      navigator.geolocation.getCurrentPosition((position) => {
        const coords = [position.coords.latitude, position.coords.longitude];
        mapRef.current.setCenter(coords, 14, { duration: 1000 });
      });
    }
  };

  // Вычисляем статистику для радара на карте
  const stats = useMemo(() => {
    const matchedCount = orders.filter(o =>
      o.categories.some(c => mySkillIds.has(c.categoryId))
    ).length
    return { matched: matchedCount, total: orders.length }
  }, [orders, mySkillIds])

  return (
    <YMaps query={{ apikey: process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY }}>
      <div className="relative w-full h-full">

        {/* СТАТУС РАДАРА */}
        <div className="absolute top-6 left-6 z-20">
          <div className="bg-white/80 backdrop-blur-md border border-slate-200 px-4 py-2.5 rounded-2xl shadow-lg shadow-slate-200/40">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
              <span className="font-black italic uppercase text-[10px] tracking-widest text-slate-900 leading-none">
                {stats.matched} <span className="text-blue-600">Подходят</span>
              </span>
            </div>
            <p className="text-[8px] font-bold uppercase text-slate-400 mt-1 tracking-tighter">
              Всего в эфире: {stats.total}
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
            yandexMapDisablePoiInteractivity: false,
            maxZoom: 18,
            minZoom: 4
          }}
        >
          <ZoomControl options={{ position: { right: 20, top: 40 } }} />

          <Clusterer
            options={{
              preset: "islands#invertedBlueClusterIcons",
              groupByCoordinates: false,
              clusterDisableClickZoom: false,
              clusterOpenBalloonOnClick: true,
            }}
          >
            {orders.map((order, index) => {
              const isMatched = order.categories.some((c) => mySkillIds.has(c.categoryId))

              // Твой спиральный джиттер (работает отлично!)
              const angle = index * 0.8;
              const dist = 0.00025 * Math.sqrt(index);

              return (
                <Placemark
                  key={order.id}
                  geometry={[order.lat + dist * Math.cos(angle), order.lng + dist * Math.sin(angle)]}
                  properties={{
                    balloonContentHeader: `<div style="font-family: sans-serif; font-weight: 900; font-style: italic; text-transform: uppercase; font-size: 12px; border-bottom: 2px solid #000; padding-bottom: 4px; margin-bottom: 8px;">${order.title}</div>`,
                    balloonContentBody: `<div style="font-family: sans-serif; font-weight: 900; font-style: italic; color: #2563eb; font-size: 20px;">${order.price > 0 ? (order.price / 100).toLocaleString() + ' ₽' : 'Договорная'}</div>`,
                    balloonContentFooter: `<a href="/orders/${order.id}" target="_blank" style="display: block; background: #000; color: #fff; text-decoration: none; text-align: center; padding: 10px; margin-top: 12px; font-family: sans-serif; font-weight: 900; font-style: italic; text-transform: uppercase; font-size: 10px; border-radius: 8px; border: 2px solid #2563eb;">Открыть заказ</a>`
                  }}
                  options={{
                    preset: isMatched ? 'islands#blueCircleDotIcon' : 'islands#blackCircleDotIcon',
                    iconColor: isMatched ? '#2563eb' : '#0f172a',
                    hideIconOnBalloonOpen: false,
                    balloonOffset: [0, -30]
                  }}
                />
              )
            })}
          </Clusterer>

          <Circle
            geometry={[center, radius * 1000]}
            options={{
              // Цвет заливки (очень прозрачный синий)
              fillColor: "rgba(37, 99, 235, 0.04)",
              // Цвет границы
              strokeColor: "#2563eb",
              // Толщина
              strokeWidth: 2,
              // ВОТ ТУТ ИСПРАВЛЕНИЕ:
              strokeStyle: 'shortdash', // Варианты: 'dash', 'dot', 'shortdash', 'shortdot'
              // Чтобы круг не перехватывал клики по маркерам
              interactivityModel: 'default#transparent',
              outline: true,
            }}
          />
        </Map>

        {/* КНОПКА ГЕОЛОКАЦИИ */}
        <button
          onClick={handleGeoLocation}
          className="absolute right-6 bottom-10 z-20 w-12 h-12 bg-white border border-slate-200 shadow-xl shadow-slate-200/50 rounded-2xl flex items-center justify-center hover:bg-slate-50 transition-all active:scale-95 group"
        >
          <Target className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
        </button>
      </div>
    </YMaps>
  )
}
