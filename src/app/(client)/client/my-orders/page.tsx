import * as React from "react"

import { ClientOrdersList } from "./client-orders-list"
import { Container } from "@/components/shared/container"
import { getClientOrders } from "@/actions/orders/orders"

export default async function ClientOrdersPage() {
  const result = await getClientOrders()
  const orders = result.success ? result.data : []



  return (
    <Container className="bg-slate-50/50 space-y-10">

      <header className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">ZWORK / CLIENT</span>
          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
        </div>
        <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">
          Мои <span className="text-blue-600">Заказы</span>
        </h1>
      </header>

      <ClientOrdersList initialOrders={orders} />

    </Container >
  )
}
