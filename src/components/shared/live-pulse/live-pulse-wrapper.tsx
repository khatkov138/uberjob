import { Suspense } from "react"
import { getLatestPublicOrders } from "@/actions/order/get"
import { LivePulseMarquee, LivePulseSkeleton } from "./live-pulse-marquee"

export async function LivePulse() {
  // Вызываем функцию напрямую. ordersPromise — это чистый Promise<ActionResponse<LatesPublicOrders>>
  const ordersPromise = getLatestPublicOrders()

  return (
    <Suspense fallback={<LivePulseSkeleton />}>
      <LivePulseMarquee ordersPromise={ordersPromise} />
    </Suspense>
  )
}