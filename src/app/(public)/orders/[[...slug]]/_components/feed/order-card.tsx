"use client"

import { memo, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import {
  Sparkles, Clock, MessageSquare, MapPin,
  Zap, Wallet, Banknote
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import Image from "next/image"
import { FeedOrder } from "@/actions/order/get-feed"

interface OrderCardProps {
  order: FeedOrder
  isMatch: boolean
}

export const OrderCard = memo(function OrderCard({ order, isMatch }: OrderCardProps) {
  // ⚛️ [REPLAY CHECK]
  // console.log(`🃏 [CARD REPLAY] ID: ${order.id.slice(-4)}`);

  // Стабилизируем ключи массивов для useMemo
  const categoriesKey = JSON.stringify(order.categories);

  return useMemo(() => {
    // 🎯 [JSX CHECK] 
    // Если этот лог дублируется — значит пропсы (id, price, slug или categories) 
    // меняют identity между тиками гидратации.
   // console.log(`✨ [CARD JSX-COMMIT] ID: ${order.id.slice(-4)} | isMatch: ${isMatch}`);

    const isNegotiable = order.price === 0;
    
    // ВРЕМЕННО: Константа для исключения Hydration Mismatch
    const timeAgo = "недавно"; 

    const formattedDistance = (typeof order.distance === 'number' && order.distance !== null)
      ? order.distance < 1
        ? `${Math.round(order.distance * 1000)} м`
        : `${order.distance.toFixed(1)} км`
      : null;

    return (
      <div className="relative group">
        {/* 1. БЕЙДЖ ПОДБОРА */}
        {isMatch && (
          <div className="absolute -top-2.5 left-6 md:left-8 z-20 bg-blue-600 text-white text-[8px] font-black px-3 py-1 rounded-full shadow-lg flex items-center gap-1 uppercase tracking-wider">
            <Sparkles className="w-2.5 h-2.5 fill-current text-blue-200" /> Подходит вам
          </div>
        )}

        <Card className={cn(
          "overflow-hidden border-2 transition-all duration-500 rounded-[2.5rem] bg-white relative",
          "hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)]",
          isMatch ? "border-blue-500/20 shadow-blue-500/5" : "border-slate-100"
        )}>
          <CardContent className="p-6 md:p-8">

            {/* 2. ШАПКА: ТИТУЛ И ЦЕНА */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-2">
              <div className="space-y-3 flex-1 w-full">
                <Link href={`/order/${order.slug}`} className="block">
                  <h3 className="text-2xl md:text-3xl font-black italic tracking-tighter uppercase text-slate-900 leading-[0.9] group-hover:text-blue-600 transition-colors">
                    {order.title}
                  </h3>
                </Link>

                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {order.categories.map((catObj) => (
                    <span
                      key={catObj.categoryId}
                      className={cn(
                        "text-[9px] font-black uppercase tracking-widest transition-all",
                        isMatch ? "text-blue-600" : "text-slate-400"
                      )}
                    >
                      #{catObj.category.name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="md:text-right shrink-0">
                {isNegotiable ? (
                  <div className="flex flex-col md:items-end text-emerald-500">
                    <div className="flex items-center gap-1.5">
                      <Wallet className="w-4 h-4" />
                      <span className="text-xl md:text-2xl font-black italic tracking-tighter">ОТКРЫТА</span>
                    </div>
                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest leading-none">ПРЕДЛОЖИТЕ ЦЕНУ</span>
                  </div>
                ) : (
                  <div className="flex flex-col md:items-end">
                    <div className="flex items-center gap-1.5 text-slate-900">
                      <Banknote className="w-4 h-4 text-slate-300" />
                      <span className="text-2xl md:text-3xl font-black italic tracking-tighter">
                        {Math.floor(order.price / 100).toLocaleString()} ₽
                      </span>
                    </div>
                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest leading-none">ФИКС. ОПЛАТА</span>
                  </div>
                )}
              </div>
            </div>

            {/* 3. ТЕЛО: ОПИСАНИЕ */}
            <div className="mt-6 mb-7 pl-5 border-l-2 border-slate-100">
              <p className="text-base text-slate-500 font-medium italic lowercase leading-snug line-clamp-2">
                {order.description}
              </p>
            </div>

            {/* 4. МЕТА ТЕГИ */}
            <div className="flex flex-wrap gap-2 mb-8">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 rounded-xl border border-orange-100 text-orange-500 text-[9px] font-black uppercase italic shadow-sm">
                <Zap className="w-3 h-3 fill-current" /> Срочно
              </div>

              <div className="flex items-center bg-blue-50 rounded-xl border border-blue-100 shadow-sm overflow-hidden">
                <div className="flex items-center gap-1.5 px-3 py-1.5 border-r border-blue-100 text-blue-700 text-[9px] font-black uppercase italic">
                  <MapPin className="w-3 h-3" />
                  <span>{order.location?.name || "Уточняется"}</span>
                </div>
                {formattedDistance && (
                  <div className="px-3 py-1.5 bg-white/50 text-blue-600 text-[9px] font-black uppercase italic">
                    {formattedDistance} от вас
                  </div>
                )}
              </div>
            </div>

            {/* 5. ПОДВАЛ */}
            <div className="space-y-6 pt-6 border-t border-slate-50">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">

                <div className="flex items-center gap-6 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-slate-900 relative overflow-hidden border-2 border-white ring-1 ring-slate-100 shadow-md shrink-0">
                      {order.client?.image ? (
                        <Image
                          src={order.client.image}
                          alt="User"
                          fill
                          sizes="44px"
                          className="object-cover"
                          priority={false}
                        />
                      ) : (
                        <div className="flex items-center justify-center w-full h-full text-white font-black text-[10px]">
                           {order.client?.name?.charAt(0).toUpperCase() || "З"}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-[8px] font-black text-slate-300 uppercase leading-none mb-1 tracking-widest">Заказчик</div>
                      <div className="text-[13px] font-black text-slate-900 tracking-tight leading-none">{order.client?.name || "Частное лицо"}</div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 flex-1">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Clock className="w-4 h-4 text-slate-200" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{timeAgo}</span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-400">
                    <MessageSquare className="w-4 h-4 text-slate-200" />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      Откликов: <span className={cn(order.offersCount > 0 ? "text-blue-600" : "text-slate-400")}>{order.offersCount || 0}</span>
                    </span>
                  </div>
                </div>

                <div className="px-10 py-4 bg-slate-100 text-slate-400 border border-slate-200 rounded-2xl text-[11px] font-black uppercase italic tracking-widest">
                  Подробнее
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }, [isMatch, order.id, order.price, order.title, order.slug, categoriesKey, order.distance, order.offersCount, order.client?.image]);
});
