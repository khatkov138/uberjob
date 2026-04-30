"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Zap, MapPin } from "lucide-react"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import Link from "next/link" // Добавляем ссылку

import { handleAction } from "@/lib/utils"
import { getLatestPublicOrders } from "@/actions/order/get"

export function LivePulseMarquee() {
  const pathname = usePathname()
  const isAdminPage = pathname?.startsWith('/admin')

  // Состояние для паузы
  const [isPaused, setIsPaused] = React.useState(false)

  const { data: orders, isLoading } = useQuery({
    queryKey: ["public-latest-orders"],
    queryFn: async () => await handleAction(getLatestPublicOrders()),
    refetchInterval: 60000,
    enabled: !isAdminPage,
  })

  const displayOrders = React.useMemo(() => {
    if (!orders) return []
    return [...orders, ...orders, ...orders]
  }, [orders])

  if (isAdminPage) return null

  if (isLoading || !orders || orders.length === 0) {
    // ... твой Skeleton остается без изменений
    return <div className="h-12 border-b bg-white" />
  }

  return (
    <div className="sticky top-[80px] z-40 w-full h-12 border-b bg-white/95 backdrop-blur-md overflow-hidden flex items-center shadow-sm">
      <div className="max-w-5xl mx-auto w-full px-4 flex items-center h-full">

        <div className="flex items-center gap-2.5 pr-6 border-r border-slate-100 shrink-0 bg-white z-20 h-full relative">
          <Zap className="w-4 h-4 text-blue-600 fill-current" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 italic">
            СЕЙЧАС <span className="text-blue-600">ЗАКАЗЫВАЮТ</span>
          </span>
        </div>

        <div className="flex-1 overflow-hidden relative flex items-center h-full">
          <motion.div
            className="flex items-center whitespace-nowrap will-change-transform"
            animate={isPaused ? {} : { x: [0, "-50%"] }} // Если пауза — фиксируем позицию
            transition={{
              x: {
                repeat: Infinity,
                repeatType: "loop",
                duration: 60, // Увеличил с 30 до 60, чтобы бежало медленнее
                ease: "linear",
              },
            }}
            onMouseEnter={() => setIsPaused(true)} // Останавливаем при наведении
            onMouseLeave={() => setIsPaused(false)} // Запускаем, когда убрали мышь
          >
            {displayOrders.map((order, idx) => (
              <Link
                key={`${order.id}-${idx}`}
                href={`/orders/${order.id}`} // Переход на страницу заказа
                className="flex items-center gap-6 px-10 shrink-0 hover:opacity-70 transition-opacity cursor-pointer"
              >
                <div className="flex items-center gap-1.5 bg-slate-900 text-white px-2 py-0.5 rounded-md">
                  <MapPin className="w-3 h-3 text-blue-400" />
                  <span className="text-[9px] font-black uppercase italic leading-none">
                    {order.address?.split(',')[0]}
                  </span>
                </div>

                {order.categories?.[0]?.category?.name && (
                  <span className="text-[10px] font-black uppercase text-blue-600 italic">
                    #{order.categories[0].category.name.replace(/\s+/g, '')}
                  </span>
                )}

                <span className="text-[12px] font-black text-slate-800 uppercase italic">
                  {order.title}
                </span>
                <div className="w-1.5 h-1.5 rounded-full bg-slate-100" />
              </Link>
            ))}
          </motion.div>

          <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
        </div>
      </div>
    </div>
  )
}
