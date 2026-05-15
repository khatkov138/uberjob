import { Suspense } from "react"
import { getLatestPublicOrders } from "@/actions/order/get"
import { LivePulseMarquee, LivePulseSkeleton } from "./live-pulse-marquee"

export async function LivePulse() {
  // Тяжелый промис: напрямую вызываем экшен без handleAction на сервере (как getOrders в твоем примере)
  const ordersPromise = (async () => {
    return getLatestPublicOrders()
  })()

  return (
    <Suspense fallback={<LivePulseSkeleton />}>
      <LivePulseMarquee ordersPromise={ordersPromise} />
    </Suspense>
  )
}
