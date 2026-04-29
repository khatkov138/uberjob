import { Inbox } from "lucide-react";

export function EmptyState() {
    return (
        <div className="w-full py-24 md:py-32 text-center bg-white rounded-[4rem] border-2 border-slate-100 px-6 relative overflow-hidden group">
            <div className="relative z-10 flex flex-col items-center gap-8">
                {/* Иконка в черном боксе */}
                <div className="w-24 h-24 bg-slate-900 rounded-[2.5rem] flex items-center justify-center rotate-2 shadow-xl shadow-slate-200">
                    <Inbox className="w-10 h-10 text-blue-500" />
                </div>

                <div className="space-y-4">
                    <h3 className="font-black text-5xl md:text-6xl italic text-slate-900 uppercase tracking-tighter leading-none">
                        Заказов <span className="text-blue-600 text-6xl md:text-7xl">нет</span>
                    </h3>

                    <div className="space-y-2">
                        <p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em]">
                            Пока никто ничего не ищет
                        </p>
                        <p className="text-[11px] font-bold text-slate-300 uppercase tracking-widest leading-relaxed max-w-sm mx-auto">
                            Попробуйте изменить город или <br />
                            увеличить радиус поиска в меню выше
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}