"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Zap, MapPin, Clock, User } from "lucide-react"
import { getLatestPublicOrders } from "@/actions/orders/public-orders"
import { usePathname } from "next/navigation"

// Твой любимый формат времени
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
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith('/admin');

  const { data: orders, isLoading } = useQuery({
    queryKey: ["public-latest-orders"],
    queryFn: () => getLatestPublicOrders(),
    refetchInterval: 60000,
    enabled: !isAdminPage,
  })

  if (isAdminPage) return null;

  // 1. СКЕЛЕТОН ЗАГРУЗКИ (чтобы высота 48px была статичной сразу)
  if (isLoading || !orders || orders.length === 0) {
    return (
      <div className="sticky top-[64px] z-40 w-full h-[48px] border-b bg-white flex items-center shadow-sm">
        <div className="max-w-7xl mx-auto w-full px-4 flex items-center gap-8">
          <div className="flex items-center gap-3 shrink-0 py-1 opacity-20">
            <Zap className="w-4 h-4 text-slate-400 fill-current" />
            <div className="h-3 w-32 bg-slate-200 rounded-full animate-pulse" />
          </div>
          <div className="flex-1 h-3 bg-slate-50 rounded-full overflow-hidden relative">
             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-200 to-transparent animate-shimmer" />
          </div>
        </div>
      </div>
    );
  }

  // Дублируем заказы для бесконечного цикла marquee
  const displayOrders = [...orders, ...orders, ...orders, ...orders];

  return (
    <div className="sticky top-[64px] z-40 w-full h-[48px] border-b bg-white/95 backdrop-blur-md overflow-hidden flex items-center shadow-sm group">
      <div className="max-w-7xl mx-auto w-full px-4 flex items-center">

        {/* СТАТИЧНЫЙ ЗАГОЛОВОК (БЕЗ ИЗМЕНЕНИЙ НАЗВАНИЯ) */}
        <div className="flex items-center gap-2.5 pr-6 border-r border-slate-100 shrink-0 bg-white z-20 py-1 relative">
          <div className="relative">
            <Zap className="w-4 h-4 text-blue-600 fill-current" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-600 rounded-full animate-ping" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 leading-none italic">
            СЕЙЧАС <span className="text-blue-600">ЗАКАЗЫВАЮТ</span>
          </span>
        </div>

        {/* БЕГУЩАЯ СТРОКА */}
        <div className="flex-1 overflow-hidden relative h-[48px] flex items-center">
          <div className="flex animate-marquee items-center will-change-transform">
            {displayOrders.map((order, idx) => (
              <div key={`${order.id}-${idx}`} className="flex items-center shrink-0">

                <div className="flex items-center gap-6 px-10">
                  
                  {/* ГОРОД (ВЫРАЖЕННЫЙ АКЦЕНТ) */}
                  <div className="flex items-center gap-1.5 bg-slate-900 text-white px-3 py-1 rounded-lg shrink-0 shadow-lg">
                    <MapPin className="w-3 h-3 text-blue-400" />
                    <span className="text-[10px] font-black uppercase tracking-wider italic leading-none">
                      {order.address?.split(',')[0]} 
                    </span>
                  </div>

                  {/* ОДИН ХЕШТЕГ */}
                  {order.categories?.[0] && (
                    <span className="text-[11px] font-black uppercase text-blue-600 tracking-tighter shrink-0 italic">
                      #{order.categories[0].replace(/\s+/g, '')}
                    </span>
                  )}

                  {/* НАЗВАНИЕ + ЗАКАЗЧИК (clientId logic) */}
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] font-black text-slate-800 tracking-tight uppercase italic leading-none">
                      {order.title.length > 30 ? `${order.title.substring(0, 30)}...` : order.title}
                    </span>
                    
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 rounded-full shrink-0 border border-slate-100">
                      <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center">
                        <User className="w-2.5 h-2.5 text-slate-400" />
                      </div>
                      <span className="text-[9px] font-black text-slate-500 uppercase leading-none italic">
                        {order.client?.name || "Заказчик"}
                      </span>
                    </div>
                  </div>

                  {/* ВРЕМЯ */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Clock className="w-3 h-3 text-slate-300" />
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-tight">
                      {formatRelativeTime(order.createdAt)}
                    </span>
                  </div>

                </div>

                {/* РАЗДЕЛИТЕЛЬ */}
                <div className="w-1.5 h-1.5 rounded-full bg-slate-100" />

              </div>
            ))}
          </div>
          
          {/* Маски по краям для плавного исчезновения */}
          <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
        </div>
      </div>

      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-marquee {
          display: inline-flex;
          animation: marquee 70s linear infinite;
        }
        .group:hover .animate-marquee {
          animation-play-state: paused;
        }
        .animate-shimmer {
          animation: shimmer 2.5s infinite;
        }
      `}</style>
    </div>
  )
}
