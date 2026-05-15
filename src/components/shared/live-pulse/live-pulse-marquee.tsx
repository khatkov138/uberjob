"use client"

import * as React from "react"
import { use, useCallback, useEffect, useMemo, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { Zap, MapPin } from "lucide-react"
import { usePathname } from "next/navigation"
import { motion, useAnimationControls } from "framer-motion"
import Link from "next/link"

import { handleAction, unwrap } from "@/lib/utils"
import { getLatestPublicOrders } from "@/actions/order/get"

interface LivePulseMarqueeProps {
  ordersPromise: Promise<any>
}

interface LivePulseMarqueeCoreProps {
  serverDataRaw: any
  isAdminPage: boolean
}

let connectorRenderCount = 0;
let coreRenderCount = 0;
let trackRenderCount = 0;

/**
 * 🧬 CONNECTOR COMPONENT
 */
export function LivePulseMarquee({ ordersPromise }: LivePulseMarqueeProps) {
  connectorRenderCount++
  const pathname = usePathname()
  const isAdminPage = pathname?.startsWith('/admin')

  const isServer = typeof window === 'undefined'
  const envMarker = isServer ? '🧬 [SERVER-SSR]' : '💻 [CLIENT-HYDRATE]'

  //console.log(`${envMarker} 🔔 [CONNECTOR RENDER #${connectorRenderCount}] LivePulseMarquee | Admin: ${isAdminPage}`)

  // Извлекаем поток данных сервера
  const serverDataRaw = !isAdminPage ? use(ordersPromise) : null

  return (
    <LivePulseMarqueeCore 
      serverDataRaw={serverDataRaw} 
      isAdminPage={isAdminPage} 
    />
  )
}

/**
 * 🎛️ CORE COMPONENT
 */
const LivePulseMarqueeCore = React.memo(function LivePulseMarqueeCore({
  serverDataRaw,
  isAdminPage
}: LivePulseMarqueeCoreProps) {
  coreRenderCount++
 // console.log(`🎬 [CORE ENTRY #${coreRenderCount}] LivePulseMarqueeCore начал выполнение тела функции.`)

  const containerRef = useRef<HTMLDivElement>(null)

  const query = useQuery({
    queryKey: ["public-latest-orders"],
    // 🛡️ Чистый handleAction для сохранения кэша при сбоях сети
    queryFn: async () => {
    //  console.log(`🚀 [NETWORK FETCH] Танстек ТЯНЕТ свежие заказы для бегущей строки через queryFn!`)
      return handleAction(getLatestPublicOrders())
    },
    refetchInterval: 60000,
    enabled: !isAdminPage,
    
    // 🌱 Сидинг данных в кэш TanStack
    initialData: (): any => {
    //  console.log(`🌱 [INITIAL DATA SEEDER] Опрос затвора бегущей строки для сидинга.`)
      if (!serverDataRaw) return undefined
      return serverDataRaw 
    },

    // ⚡️ Безопасный процессор данных на уровне ядра
    select: (data: any) => {
     // console.log('⚡️ [SELECT PROCESSOR] Безопасная распаковка данных бегущей строки через unwrap')
      return unwrap(data, [])
    },
    staleTime: 1000 * 30,
  })

  //console.log(`🏁 [CORE COMMIT #${coreRenderCount}] useQuery пройден, JSX уходит на рендеринг.`)

  const orders = query.data ?? []

  // Бесконечный повтор ленты для плавного скролла без дыр
  const displayOrders = useMemo(() => {
    if (!orders || orders.length === 0) return []
    return [...orders, ...orders, ...orders, ...orders, ...orders]
  }, [orders])

  if (isAdminPage || orders.length === 0) return null

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

        {/* ЗОНА ТРЕКА БЕГУЩЕЙ СТРОКИ */}
        <div className="flex-1 overflow-hidden relative h-full" ref={containerRef}>
          <MarqueeTrack displayOrders={displayOrders} />

          {/* ГРАДИЕНТЫ ДЛЯ МЯГКОГО СКРЫТИЯ КОНТЕНТА */}
          <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-white via-white/80 to-transparent z-20 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-white via-white/80 to-transparent z-20 pointer-events-none" />
        </div>
      </div>
    </div>
  )
})

/**
 * 🎛️ ИЗОЛИРОВАННЫЙ ТРЕК АНИМАЦИИ (0 ререндеров, плавное продолжение движения)
 */
const MarqueeTrack = React.memo(function MarqueeTrack({ displayOrders }: { displayOrders: any[] }) {
  trackRenderCount++
 // console.log(`🏃‍♂️ [TRACK RENDER #${trackRenderCount}] Отрисовка изолированного трека анимации.`)
  
  const controls = useAnimationControls()
  const trackRef = useRef<HTMLDivElement>(null)

  // Базовое время полного цикла движения в секундах
  const BASE_DURATION = 25 

  // Функция запуска анимации с текущей позиции до победного конца (-50%)
  const startAnimation = useCallback((customDuration?: number) => {
    let duration = customDuration ?? BASE_DURATION
    
    // Рассчитываем оставшееся время пропорционально расстоянию
    if (trackRef.current && !customDuration) {
      const transform = window.getComputedStyle(trackRef.current).transform
      if (transform && transform !== 'none') {
        const matrix = new WebKitCSSMatrix(transform)
        const currentX = matrix.m41 // Смещение по X в пикселях
        const trackWidth = trackRef.current.offsetWidth
        const endX = -(trackWidth / 2) // Конечная координата трека (-50%)
        
        if (currentX < 0 && endX < 0) {
          const remainingPercent = (currentX - endX) / Math.abs(endX)
          if (remainingPercent > 0 && remainingPercent <= 1) {
            duration = BASE_DURATION * remainingPercent
          }
        }
      }
    }

    controls.start({
      x: "-50%",
      transition: {
        duration: duration,
        ease: "linear",
      }
    }).then((result) => {
      // Бесшовный перезапуск: сброс в 0 и запуск полного круга
      if (result?.finished) {
        controls.set({ x: 0 })
        startAnimation(BASE_DURATION)
      }
    })
  }, [controls])

  // Первый запуск при монтировании
  useEffect(() => {
    startAnimation(BASE_DURATION)
    return () => controls.stop()
  }, [startAnimation, controls])

  // Замораживаем матрицу трансформации на текущем пикселе
  const handleMouseEnter = () => {
    controls.stop()
  }

  // Продолжаем движение дальше без рывков назад
  const handleMouseLeave = () => {
    startAnimation()
  }

  return (
    <motion.div
      ref={trackRef}
      className="flex items-center h-full will-change-transform py-2"
      animate={controls}
      initial={{ x: 0 }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {displayOrders.map((order: any, idx: number) => (
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
  )
})

/**
 * 💀 SKELETON
 */
export function LivePulseSkeleton() {
  return (
    <div className="w-full h-12 border-b border-slate-100 bg-white flex items-center overflow-hidden">
      <div className="max-w-5xl mx-auto w-full px-4 flex items-center h-full">
        <div className="flex items-center gap-2.5 pr-6 border-r border-slate-100 shrink-0 h-full">
          <div className="w-4 h-4 rounded-full bg-slate-100 animate-pulse" />
          <div className="h-2 w-24 bg-slate-100 rounded-full animate-pulse" />
        </div>
        <div className="flex-1 flex items-center gap-10 px-8 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 shrink-0">
              <div className="w-16 h-5 bg-slate-50 rounded-md animate-pulse" />
              <div className="h-3 w-40 bg-slate-100 rounded-full animate-pulse" />
              <div className="w-1.5 h-1.5 rounded-full bg-slate-50" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
