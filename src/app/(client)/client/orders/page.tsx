// app/(client)/client/my-orders/page.tsx
import * as React from "react"
import { ClientOrdersList } from "./client-orders-list"
import { Container } from "@/components/shared/container"
import { getClientOrders } from "@/actions/order/get" // Импорт из нового места
import { unwrap } from "@/lib/utils" // Твой синхронный unwrap

export default async function ClientOrdersPage() {
  // Используем наш брутальный unwrap: если ошибка — вернет []
  const orders = unwrap(await getClientOrders(), [])

  return (
    <Container className="bg-slate-50/50 py-10 space-y-12">
      <header className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
            ZWORK / CLIENT
          </span>
          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
        </div>
        <h1 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter text-slate-900 leading-[0.8]">
          Мои <span className="text-blue-600">Заказы</span>
        </h1>
      </header>

      {/* Передаем чистые данные, типизация подхватится автоматически */}
      <ClientOrdersList initialOrders={orders} />
    </Container>
  )
}
