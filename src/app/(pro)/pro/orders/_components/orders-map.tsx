"use client"

import React, { useMemo } from "react"
import { YMaps, Map, Placemark, Circle, ZoomControl, Clusterer } from "@pbe/react-yandex-maps"
import { FeedOrder } from "@/actions/order/get"

interface OrdersMapProps {
  orders: FeedOrder[]
  center: [number, number]
  radius: number
  mySkillIds: Set<string>
}

export const OrdersMap = ({ orders, center, radius, mySkillIds }: OrdersMapProps) => {
  const mapState = useMemo(() => ({
    center,
    zoom: 12,
    controls: [],
  }), [center])

  return (
    <YMaps query={{ apikey: process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY }}>
      <Map
        state={mapState}
        width="100%"
        height="100%"
        // Добавляем модули для балунов и хинтов явно
        modules={["geoObject.addon.balloon", "geoObject.addon.hint"]}
        options={{
          suppressMapOpenBlock: true,
          // Это позволяет событиям проваливаться сквозь карту к меткам
          yandexMapDisablePoiInteractivity: false
        }}
      >
        <ZoomControl options={{ position: { right: 20, top: 40 } }} />

        <Circle
          geometry={[center, radius * 1000]}
          options={{
            fillColor: "rgba(37, 99, 235, 0.05)",
            strokeColor: "#2563eb",
            strokeWidth: 3,
            outline: true,
            // Эти поля отключают реакцию круга на мышь
            hasHint: false,
            hasBalloon: false,
            interactiveZIndex: false, // Чтобы не участвовал в иерархии кликов
          }}
        />

        <Clusterer
          options={{
            preset: "islands#invertedBlueClusterIcons", // Синие кружки с цифрой
            groupByCoordinates: false,
            clusterDisableClickZoom: false,
            clusterHideIconOnBalloonOpen: false,
            geoObjectHideIconOnBalloonOpen: false,
          }}
        >
          {orders.map((order) => {
            const isMatched = order.categories.some(c => mySkillIds.has(c.categoryId))

            return (
              <Placemark
                key={order.id}
                geometry={[order.lat, order.lng]}
                properties={{
                  hintContent: order.title,
                  balloonContentHeader: `<div style="font-weight:900; text-transform:uppercase; font-family:sans-serif;">${order.title}</div>`,
                  balloonContentBody: `
                    <div style="padding:10px 0; font-family:sans-serif;">
                        <div style="font-weight:900; color:#2563eb; font-size:18px;">${order.price.toLocaleString()} ₽</div>
                        <a href="/orders/${order.id}" style="display:block; background:#000; color:#fff; text-align:center; padding:8px; margin-top:10px; text-decoration:none; font-weight:900; text-transform:uppercase; font-size:10px;">Открыть</a>
                    </div>
                  `,
                }}
                options={{
                  preset: isMatched ? 'islands#blueCircleDotIcon' : 'islands#blackCircleDotIcon',
                  iconColor: isMatched ? '#2563eb' : '#0f172a',
                  // Это делает точку кликабельной:
                  hasBalloon: true,
                  hasHint: true,
                }}
              />
            )
          })}
        </Clusterer>
      </Map>
    </YMaps>
  )
}
