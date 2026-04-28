import { Zap } from "lucide-react"

export default function RootLoading() {
  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center overflow-hidden">
      {/* ФОНОВЫЙ ДЕКОР */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <Zap className="absolute top-1/4 -left-20 w-96 h-96 -rotate-12" />
        <Zap className="absolute bottom-1/4 -right-20 w-96 h-96 rotate-12" />
      </div>

      <div className="relative flex flex-col items-center gap-8">
        {/* ЛОГО-ЛОАДЕР */}
        <div className="relative">
          <div className="w-24 h-24 bg-slate-900 rounded-[2.5rem] flex items-center justify-center rotate-3 animate-bounce shadow-2xl shadow-blue-500/20 border-4 border-slate-50">
            <Zap className="w-12 h-12 text-blue-600 fill-current" />
          </div>
          {/* Пульсирующий круг вокруг */}
          <div className="absolute inset-0 bg-blue-600/30 rounded-[2.5rem] animate-ping -z-10" />
        </div>

        {/* ТЕКСТ В СТИЛЕ ZWORK */}
        <div className="text-center space-y-4">
          <h2 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">
            ZWORK<span className="text-blue-600 animate-pulse">.</span>LOADING
          </h2>
          
          {/* ПРОГРЕСС-БАР ИЗ ТРЕХ ПОЛОСОК (Tailwind-only animation) */}
          <div className="flex items-center justify-center gap-2">
            <div className="w-10 h-1.5 bg-slate-100 rounded-full overflow-hidden relative">
                <div className="absolute inset-0 bg-blue-600 animate-[shimmer_1.5s_infinite] -translate-x-full" 
                     style={{ animation: 'shimmer 1.5s infinite' }} />
            </div>
            <div className="w-10 h-1.5 bg-slate-100 rounded-full overflow-hidden relative">
                <div className="absolute inset-0 bg-blue-600 animate-[shimmer_1.5s_infinite_0.2s] -translate-x-full" 
                     style={{ animation: 'shimmer 1.5s infinite 0.2s' }} />
            </div>
            <div className="w-10 h-1.5 bg-slate-100 rounded-full overflow-hidden relative">
                <div className="absolute inset-0 bg-blue-600 animate-[shimmer_1.5s_infinite_0.4s] -translate-x-full" 
                     style={{ animation: 'shimmer 1.5s infinite 0.4s' }} />
            </div>
          </div>
        </div>
      </div>

      {/* 
         Если в tailwind.config.js нет анимации shimmer, 
         просто добавь её в глобальный globals.css один раз:
         @keyframes shimmer {
           100% { transform: translateX(100%); }
         }
      */}
    </div>
  )
}
