"use client"

import React from "react"
import { YMaps, Map, Placemark, ZoomControl } from "@pbe/react-yandex-maps"
import { FeedOrder } from "@/actions/order/get"

interface OrdersMapProps {
  orders: FeedOrder[]
  center: [number, number]
  mySkillIds: Set<string>
}

export const OrdersMap = ({ orders, center, mySkillIds }: OrdersMapProps) => {
  // Мемоизируем стейт, чтобы карта не ререндерилась при каждом чихе
  const mapState = React.useMemo(() => ({
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
        options={{ suppressMapOpenBlock: true }}
      >
        <ZoomControl options={{ position: { right: 20, top: 40 } }} />

        {orders.map((order) => {
          // Тот самый быстрый матчинг через Set
          const isMatched = order.categories.some(c => mySkillIds.has(c.categoryId))
          
          return (
            <Placemark
              key={order.id}
              geometry={[order.lat, order.lng]}
              properties={{
                balloonContentHeader: `
                  <div style="font-family: inherit; font-weight: 900; font-style: italic; text-transform: uppercase; font-size: 13px; color: #0f172a;">
                    ${order.title}
                  </div>
                `,
                balloonContentBody: `
                  <div style="margin-top: 8px; font-family: inherit;">
                    <div style="font-weight: 900; color: #2563eb; font-size: 18px; font-style: italic;">
                      ${order.price.toLocaleString()} ₽
                    </div>
                    <p style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #94a3b8; margin-top: 4px;">
                      ${order.distance} км от вас
                    </p>
                  </div>
                `,
                balloonContentFooter: `
                  <a href="/orders/${order.id}" 
                     style="display: block; width: 100%; background: #0f172a; color: #fff; text-align: center; padding: 10px; margin-top: 10px; text-decoration: none; font-weight: 900; font-style: italic; text-transform: uppercase; font-size: 9px; border-radius: 8px;">
                    Детали
                  </a>
                `,
              }}
              options={{
                // Синий — подходит под скиллы, Черный — нет
                preset: 'islands#blackStretchyIcon',
                iconColor: isMatched ? '#2563eb' : '#0f172a',
                hideIconOnBalloonOpen: false,
                balloonMaxWidth: 200,
              }}
            />
          )
        })}
      </Map>
    </YMaps>
  )
}
