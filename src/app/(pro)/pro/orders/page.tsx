// src/app/(pro)/pro/orders/page.tsx
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { getServerSession } from "@/lib/get-session"
import { unwrap } from "@/lib/utils"
import { getOrders } from "@/actions/order/get"
import { getMyProfile } from "@/actions/profile/get"
import OrdersPageClient from "./OrdersPageClient"
import { DEFAULT_LOCATION, roundCoord } from "@/lib/location-config"


export default async function OrdersPage() {
  const session = await getServerSession()
  if (!session) redirect("/login")

  const cookieStore = await cookies()
  const locationRaw = cookieStore.get("user-location-storage")?.value

  // Изначально берем всё из общих констант
  let location = { ...DEFAULT_LOCATION }



  if (locationRaw) {
    try {
      const parsed = JSON.parse(decodeURIComponent(locationRaw))
      // ВАЖНО: Zustand хранит всё внутри объекта state
      if (parsed?.state) {
        location = {
          city: parsed.state.city ?? DEFAULT_LOCATION.city,
          // Используем roundCoord И ТУТ, чтобы сервер выдал те же цифры
          lat: roundCoord(parsed.state.lat ?? DEFAULT_LOCATION.lat),
          lng: roundCoord(parsed.state.lng ?? DEFAULT_LOCATION.lng),
          radius: Number(parsed.state.radius ?? DEFAULT_LOCATION.radius)
        }
      }
    } catch (e) {
      console.error("Ошибка синхронизации кук на сервере", e)
    }
  }

  // Запрос в базу с гарантированно идентичными координатами
  const [ordersRes, profileRes] = await Promise.all([
    getOrders(location),
    getMyProfile()
  ])

  return (
    <OrdersPageClient
      session={session}
      initialOrders={unwrap(ordersRes, [])}
      initialProfile={unwrap(profileRes, null)}
      serverLocation={location}
    />
  )
}

