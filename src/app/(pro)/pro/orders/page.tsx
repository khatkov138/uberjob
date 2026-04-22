
import { getOrders } from "@/actions/orders/orders"
import OrdersPageClient from "./OrdersPageClient"
import { getMyProfile } from "@/actions/profile"


export default async function OrdersPage() {
  const orders = await getOrders()
  const profile = await getMyProfile()

  return <OrdersPageClient
    initialOrders={orders}
    initialProfile={profile}
  />
}