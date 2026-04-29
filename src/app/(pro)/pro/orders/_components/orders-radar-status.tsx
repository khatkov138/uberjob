"use client"

import { Loader2 } from "lucide-react"

export function OrdersRadarStatus({ isVisible }: { isVisible: boolean }) {
    if (!isVisible) return null

    return (
        <div className="absolute inset-x-0 -top-4 z-40 flex justify-center pointer-events-none">
            <div className="bg-slate-900 text-white px-6 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 border border-white/10">
                <Loader2 className="w-4 h-4 animate-spin text-blue-500 stroke-[3]" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] italic">
                    Сканирую эфир...
                </span>
            </div>
        </div>
    )
}
