"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { getLatestPublicOrders } from "@/app/actions/public-orders"
import { Zap, MapPin } from "lucide-react"

export function LivePulseMarquee() {
  const { data: orders } = useQuery({
    queryKey: ["public-latest-orders"],
    queryFn: () => getLatestPublicOrders(),
    refetchInterval: 30000,
  })

  if (!orders || orders.length === 0) return null

  // Тройной массив для бесконечной бесшовной прокрутки
  const displayOrders = [...orders, ...orders, ...orders]

  return (
    <div className="sticky top-[64px] z-40 w-full h-[48px] border-b bg-white/95 backdrop-blur-md overflow-hidden flex items-center shadow-sm">
      <div className="max-w-7xl mx-auto w-full px-4 flex items-center">
        
        {/* СТАТИЧНЫЙ ЗАГОЛОВОК (Пояснение) */}
        <div className="flex items-center gap-3 pr-6 border-r border-slate-100 shrink-0 bg-white z-10 py-1">
          <div className="relative flex items-center justify-center">
            <Zap className="w-4 h-4 text-blue-600 fill-current" />
            <span className="absolute w-2 h-2 bg-blue-400 rounded-full animate-ping" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 leading-none">
              Сейчас заказывают
            </span>
            <span className="text-[8px] font-bold text-blue-600 uppercase italic leading-tight">
              Live Pulse
            </span>
          </div>
        </div>

        {/* БЕГУЩАЯ СТРОКА */}
        <div className="flex-1 overflow-hidden relative">
          {/* Градиент для мягкого появления текста из-за заголовка */}
          <div className="absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
          
          <div className="flex animate-marquee whitespace-nowrap gap-16 items-center">
            {displayOrders.map((order, idx) => (
              <div key={`${order.id}-${idx}`} className="flex items-center gap-3">
                <span className="text-[9px] font-black uppercase text-blue-500/50 tracking-tighter">
                  #{order.category}
                </span>
                <span className="text-[11px] font-bold text-slate-700 tracking-tight">
                  {order.title}
                </span>
                <div className="flex items-center gap-1 text-slate-300">
                  <MapPin className="w-2.5 h-2.5" />
                  <span className="text-[8px] font-black uppercase tracking-widest">
                    {order.address}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.33%); }
        }
        .animate-marquee {
          display: inline-flex;
          animation: marquee 50s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  )
}
