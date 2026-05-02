"use client"

import { Inbox } from "lucide-react"

export function EmptyState() {
    return (
        <div className="w-full py-20 md:py-28 text-center bg-slate-50/50 rounded-[3rem] border border-slate-100 px-6 relative overflow-hidden group">
            <div className="relative z-10 flex flex-col items-center gap-6">
                
                {/* Иконка: уходим от агрессивного черного к стильному синему акценту */}
                <div className="w-20 h-20 bg-white border border-slate-100 rounded-[2rem] flex items-center justify-center shadow-xl shadow-slate-200/50 group-hover:scale-110 transition-transform duration-500">
                    <Inbox className="w-8 h-8 text-blue-600" />
                </div>

                <div className="space-y-4">
                    <h3 className="font-black text-4xl md:text-5xl italic text-slate-900 uppercase tracking-tighter leading-none">
                        Заказов <span className="text-blue-600">пока нет</span>
                    </h3>

                    <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                            В данном радиусе пусто
                        </p>
                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-relaxed max-w-xs mx-auto italic">
                            Попробуйте сменить локацию <br /> 
                            или расширить радиус поиска
                        </p>
                    </div>
                </div>
            </div>
            
            {/* Фоновый декор в твоем стиле */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/0 to-white/50 pointer-events-none" />
        </div>
    )
}
