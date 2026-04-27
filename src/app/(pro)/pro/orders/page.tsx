// src/app/(pro)/pro/orders/page.tsx
import * as React from "react"
import { cookies } from "next/headers"

import { getMyProfile } from "@/actions/profile"
import { unwrap } from "@/lib/utils"
import OrdersPageClient from "./OrdersPageClient"
import { getOrders } from "@/actions/order/get"

export default async function OrdersPage() {
  const cookieStore = await cookies()
  const locationRaw = cookieStore.get("user-location-storage")?.value

  // Дефолтные значения (Иркутск), если кука еще не создана
  let lat = 52.2895
  let lng = 104.2806
  let radius = 60

  if (locationRaw) {
    try {
      // Декодируем URI (куки часто кодируются) и парсим JSON
      const parsed = JSON.parse(decodeURIComponent(locationRaw))

      // Извлекаем данные из структуры Zustand (parsed.state)
      if (parsed.state) {
        lat = parsed.state.lat ?? lat
        lng = parsed.state.lng ?? lng
        radius = parsed.state.radius ?? radius
      }

    } catch (e) {
      console.error("Ошибка парсинга куки локации на сервере:", e)
    }
  }

  // Запускаем запросы параллельно. Теперь сервер сразу знает координаты из кук!
  const [ordersRes, profileRes] = await Promise.all([
    getOrders({ lat, lng, radius }),
    getMyProfile()
  ])
  

  return (
    <OrdersPageClient
      initialOrders={unwrap(ordersRes, [])}
      initialProfile={unwrap(profileRes, null)}
    />
  )
}
