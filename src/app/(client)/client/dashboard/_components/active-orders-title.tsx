import { Suspense } from "react"
import Link from "next/link"
import { ShoppingBag, ArrowUpRight } from "lucide-react"
import { OrdersCounter } from "./orders-counter"

export function ActiveOrdersTile() {
  return (
    <Link href="/client/orders" className="group md:col-span-2">
      <div className="h-full min-h-[220px] rounded-[2.5rem] p-8 bg-blue-600 text-white transition-all duration-500 flex flex-col justify-between hover:shadow-2xl">
        <div className="flex justify-between items-start">
          <div className="p-4 rounded-2xl bg-white/10 group-hover:scale-110 transition-transform">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <ArrowUpRight className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-all" />
        </div>
        <div>
          <h3 className="text-3xl font-black uppercase italic tracking-tighter mb-1">Мои заказы</h3>
          
          {/* СУСПЕНС ТОЛЬКО ТУТ! Все остальное вокруг уже видно */}
          <Suspense fallback={<div className="h-4 w-32 bg-white/20 animate-pulse rounded-full" />}>
            <OrdersCounter />
          </Suspense>
        </div>
      </div>
    </Link>
  )
}
