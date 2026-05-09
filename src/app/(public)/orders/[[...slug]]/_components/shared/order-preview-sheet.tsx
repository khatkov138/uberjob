"use client"

import * as React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { handleAction } from "@/lib/utils"
import { 
  Loader2, 
  MapPin, 
  Wallet, 
  ArrowUpRight, 
  Activity, 
  ShieldCheck,
  X,
  Clock
} from "lucide-react"
import { getOrderByIdOrSlug } from "@/actions/order/get"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import * as VisuallyHidden from "@radix-ui/react-visually-hidden"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { ru } from "date-fns/locale"

export function OrderPreviewSheet() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const orderIdentifier = searchParams.get("viewOrder")

    const close = () => {
        const params = new URLSearchParams(window.location.search);
        params.delete("viewOrder");
        router.replace(`?${params.toString()}`, { scroll: false });
    };

    const { data: result, isLoading } = useQuery({
        queryKey: ["order-preview", orderIdentifier],
        queryFn: () => handleAction(getOrderByIdOrSlug(orderIdentifier!)),
        enabled: !!orderIdentifier,
    })

    const orderData = result?.order;
    const hasOffer = result?.existingOffer;

    return (
        <Sheet open={!!orderIdentifier} onOpenChange={close}>
            <SheetContent 
                side="right" 
                className="w-full sm:max-w-md border-l border-slate-100 p-0 overflow-y-auto bg-white shadow-2xl ring-0 focus:ring-0"
            >
                <VisuallyHidden.Root>
                    <SheetTitle>Заказ {orderIdentifier}</SheetTitle>
                </VisuallyHidden.Root>

                {isLoading ? (
                    <div className="flex flex-col h-full items-center justify-center gap-4">
                        <Loader2 className="w-10 h-10 animate-spin text-blue-600" strokeWidth={1.5} />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic">ZWORK / Syncing...</p>
                    </div>
                ) : orderData && (
                    <div className="flex flex-col min-h-screen">
                        
                        {/* HEADER: CLEAN TECH */}
                        <div className="p-8 space-y-6">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">
                                            {orderData.isOwner ? "Internal / My Order" : "Global / Live Task"}
                                        </span>
                                        <div className="w-1 h-1 bg-blue-600 rounded-full animate-pulse" />
                                    </div>
                                    <h2 className="text-4xl font-black uppercase italic tracking-tighter leading-none text-slate-900">
                                        {orderData.title}
                                    </h2>
                                </div>
                                <button 
                                    onClick={close}
                                    className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-all"
                                >
                                    <X size={18} strokeWidth={3} />
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {orderData.categories?.map((c: any) => (
                                    <span key={c.category.slug} className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[9px] font-black uppercase italic text-slate-500">
                                        {c.category.name}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* CONTENT: DASHBOARD STYLE GRID */}
                        <div className="flex-1 px-8 space-y-6">
                            
                            {/* PRICE CARD: EMERALD HUB */}
                            <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-[2rem] flex flex-col justify-between min-h-[140px] relative overflow-hidden">
                                <div className="flex justify-between items-start relative z-10">
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest italic">Предлагаемый бюджет</p>
                                    <Wallet className="w-5 h-5 text-emerald-500" />
                                </div>
                                <div className="relative z-10">
                                    <p className="text-5xl font-black italic text-slate-900 tracking-tighter leading-none">
                                        {orderData.price > 0 ? orderData.price.toLocaleString() : "Договорная"}{" "}
                                        {orderData.price > 0 && <span className="text-2xl ml-1 text-emerald-600">₽</span>}
                                    </p>
                                </div>
                            </div>

                            {/* DESCRIPTION SECTION */}
                            <div className="space-y-4 pt-2">
                                <div className="flex items-center gap-2 px-2 border-l-4 border-blue-600">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900 italic">Описание задачи</h3>
                                </div>
                                <p className="text-sm font-bold italic tracking-tight text-slate-600 leading-relaxed bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100">
                                    {orderData.description}
                                </p>
                            </div>

                            {/* STATS TILES */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 border border-slate-100 p-6 rounded-[2rem] space-y-4 transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 group">
                                    <div className="w-10 h-10 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
                                        <MapPin size={20} strokeWidth={2} />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">Локация</p>
                                        <p className="font-black italic text-[11px] uppercase tracking-tighter text-slate-900 truncate">
                                            {orderData.location?.name}
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-slate-50 border border-slate-100 p-6 rounded-[2rem] space-y-4 transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 group">
                                    <div className="w-10 h-10 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
                                        <Clock size={20} strokeWidth={2} />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">Опубликован</p>
                                        <p className="font-black italic text-[11px] uppercase tracking-tighter text-slate-900">
                                            {formatDistanceToNow(new Date(orderData.createdAt), { addSuffix: true, locale: ru })}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* ALERT: ALREADY OFFERED */}
                            {hasOffer && (
                                <div className="bg-blue-600 rounded-[2rem] p-6 text-white flex items-center gap-4 shadow-xl shadow-blue-200 animate-in slide-in-from-bottom-2">
                                    <div className="p-3 bg-white/10 rounded-2xl">
                                        <ShieldCheck className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest italic leading-tight">
                                            Статус: Отклик отправлен
                                        </p>
                                        <p className="text-[9px] opacity-60 font-bold uppercase tracking-tighter mt-0.5">Ожидайте ответа заказчика</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* STICKY ACTION: BLACK HUB STYLE */}
                        <div className="p-8 mt-auto sticky bottom-0 bg-white/80 backdrop-blur-md">
                            <Link
                                href={`/order/${orderData.slug}`}
                                className="group block"
                            >
                                <div className="bg-slate-900 rounded-[2rem] p-6 text-white transition-all hover:bg-blue-600 flex items-center justify-between shadow-xl active:scale-[0.98]">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-white/10 rounded-2xl transition-colors group-hover:bg-white/20">
                                            <Activity className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black uppercase italic tracking-tighter leading-none">Детальный обзор</h3>
                                            <p className="text-[9px] font-bold uppercase tracking-widest opacity-60 italic mt-1">Полный протокол задачи</p>
                                        </div>
                                    </div>
                                    <ArrowUpRight className="w-6 h-6 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                                </div>
                            </Link>
                        </div>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    )
}
