"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Zap, MapPin } from "lucide-react"
import { usePathname } from "next/navigation"
import { motion, useAnimationFrame, useMotionValue, useTransform } from "framer-motion"
import Link from "next/link"

import { handleAction } from "@/lib/utils"
import { getLatestPublicOrders } from "@/actions/order/get"

export function LivePulseMarquee() {
  const pathname = usePathname()
  const isAdminPage = pathname?.startsWith('/admin')
  const [isPaused, setIsPaused] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const { data: orders, isLoading } = useQuery({
    queryKey: ["public-latest-orders"],
    queryFn: async () => await handleAction(getLatestPublicOrders()),
    refetchInterval: 60000,
    enabled: !isAdminPage,
  })

  // Увеличиваем количество повторов, чтобы лента была "бесконечной" без дырок
  const displayOrders = React.useMemo(() => {
    if (!orders || orders.length === 0) return []
    return [...orders, ...orders, ...orders, ...orders, ...orders]
  }, [orders])

  if (isAdminPage) return null

  // Скелетон с той же высотой, чтобы не дергалась страница при загрузке
  if (isLoading || !orders || orders.length === 0) {
    return <div className="h-12 border-b border-slate-100 bg-white" />
  }

  return (
    <div className="sticky top-[80px] z-40 w-full h-12 border-b border-slate-100 bg-white/95 backdrop-blur-md overflow-hidden flex items-center shadow-sm">
      <div className="max-w-5xl mx-auto w-full px-4 flex items-center h-full relative">

        {/* ФИКСИРОВАННЫЙ ЛЕЙБЛ */}
        <div className="flex items-center gap-2.5 pr-6 border-r border-slate-100 shrink-0 bg-white z-30 h-full relative">
          <Zap className="w-4 h-4 text-blue-600 fill-current" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 italic">
            СЕЙЧАС <span className="text-blue-600">ЗАКАЗЫВАЮТ</span>
          </span>
        </div>

        <div className="flex-1 overflow-hidden relative h-full" ref={containerRef}>
          <motion.div
            className="flex items-center h-full will-change-transform py-2"
            // Замедлили до 100 секунд для плавного скольжения
            animate={isPaused ? {} : { x: [0, "-50%"] }}
            transition={{
              x: {
                repeat: Infinity,
                repeatType: "loop",
                duration: 10,
                ease: "linear",
              },
            }}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {displayOrders.map((order, idx) => (
              <Link
                key={`${order.id}-${idx}`}
                href={`/orders/${order.id}`}
                className="flex items-center gap-6 px-8 shrink-0 hover:opacity-70 transition-opacity cursor-pointer group"
              >
                {/* ГОРОД */}
                <div className="flex items-center gap-1.5 bg-slate-900 text-white px-2 py-0.5 rounded-md transition-colors group-hover:bg-blue-600">
                  <MapPin className="w-2.5 h-2.5 text-blue-400 group-hover:text-white" />
                  <span className="text-[9px] font-black uppercase italic leading-none">
                    {order.location?.name || "РФ"}
                  </span>
                </div>

                {/* НАЗВАНИЕ ЗАКАЗА */}
                <span className="text-[11px] font-black text-slate-800 uppercase italic tracking-tight">
                  {order.title}
                </span>

                {/* КАТЕГОРИЯ */}
                {order.categories?.[0]?.category?.name && (
                  <span className="text-[10px] font-black uppercase text-blue-600/50 italic group-hover:text-blue-600 transition-colors">
                    #{order.categories[0].category.name.replace(/\s+/g, '')}
                  </span>
                )}

                {/* РАЗДЕЛИТЕЛЬ */}
                <div className="w-1 h-1 rounded-full bg-slate-200" />
              </Link>
            ))}
          </motion.div>

          {/* ГРАДИЕНТЫ ДЛЯ МЯГКОГО СКРЫТИЯ КОНТЕНТА */}
          <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-white via-white/80 to-transparent z-20 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-white via-white/80 to-transparent z-20 pointer-events-none" />
        </div>
      </div>
    </div>
  )
}

export function LivePulseSkeleton() {
  return (
    <div className="w-full h-12 border-b border-slate-100 bg-white flex items-center overflow-hidden">
      <div className="max-w-5xl mx-auto w-full px-4 flex items-center h-full">

        {/* Фиксированная левая часть (Лейбл) */}
        <div className="flex items-center gap-2.5 pr-6 border-r border-slate-100 shrink-0 h-full">
          <div className="w-4 h-4 rounded-full bg-slate-100 animate-pulse" />
          <div className="h-2 w-24 bg-slate-100 rounded-full animate-pulse" />
        </div>

        {/* Бегущая строка (заглушки) */}
        <div className="flex-1 flex items-center gap-10 px-8 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 shrink-0">
              {/* Кружок-локация */}
              <div className="w-16 h-5 bg-slate-50 rounded-md animate-pulse" />
              {/* Текст заказа */}
              <div className="h-3 w-40 bg-slate-100 rounded-full animate-pulse" />
              {/* Разделитель */}
              <div className="w-1.5 h-1.5 rounded-full bg-slate-50" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
