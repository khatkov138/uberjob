"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"

import { Zap, MapPin, Clock } from "lucide-react"
import { getLatestPublicOrders } from "@/actions/public-orders";

function formatRelativeTime(date: Date) {
  const diffInSeconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  if (diffInSeconds < 60) return 'только что';
  const mins = Math.floor(diffInSeconds / 60);
  if (mins < 60) return `${mins} мин. назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ч. назад`;
  return 'сегодня';
}

export function LivePulseMarquee() {
  const { data: orders } = useQuery({
    queryKey: ["public-latest-orders"],
    queryFn: () => getLatestPublicOrders(),
    refetchInterval: 30000,
  })

  if (!orders || orders.length === 0) return null

  const displayOrders = [...orders, ...orders, ...orders]

  return (
    <div className="sticky top-[64px] z-40 w-full h-[48px] border-b bg-white/95 backdrop-blur-md overflow-hidden flex items-center shadow-sm">
      <div className="max-w-5xl mx-auto w-full px-4 flex items-center">

        {/* СТАТИЧНЫЙ ЗАГОЛОВОК */}
        <div className="flex items-center gap-3 pr-6 border-r border-slate-100 shrink-0 bg-white z-10 py-1">
          <div className="relative">
            <Zap className="w-4 h-4 text-blue-600 fill-current" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-600 rounded-full animate-ping" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 leading-none">
            Сейчас заказывают
          </span>
        </div>

        {/* БЕГУЩАЯ СТРОКА */}
        <div className="flex-1 overflow-hidden relative h-full flex items-center">
          {/* Градиент для плавного выплывания текста */}
          <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />

          <div className="flex animate-marquee whitespace-nowrap items-center">
            {displayOrders.map((order, idx) => (
              <div key={`${order.id}-${idx}`} className="flex items-center">
                
                {/* КОНТЕНТ ЗАКАЗА */}
                <div className="flex items-center gap-6 px-8">
                  
                  {/* ВРЕМЯ */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Clock className="w-3 h-3 text-slate-300" />
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">
                      {formatRelativeTime(order.createdAt)}
                    </span>
                  </div>

                  {/* КАТЕГОРИИ */}
                  <div className="flex items-center gap-2 shrink-0">
                    {order.categories?.map((cat: string, i: number) => (
                      <span key={i} className="text-[11px] font-black uppercase text-blue-600 tracking-tighter">
                        #{cat.replace(/\s+/g, '')}
                      </span>
                    ))}
                  </div>

                  {/* СУТЬ */}
                  <span className="text-[13px] font-bold text-slate-800 tracking-tight">
                    {order.title}
                  </span>

                  {/* ГОРОД */}
                  <div className="flex items-center gap-1.5 text-slate-400 shrink-0">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black uppercase tracking-widest italic">
                      {order.address}
                    </span>
                  </div>

                </div>

                {/* ВЕРТИКАЛЬНЫЙ РАЗДЕЛИТЕЛЬ */}
                <div className="h-4 w-px bg-slate-200" />
                
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
