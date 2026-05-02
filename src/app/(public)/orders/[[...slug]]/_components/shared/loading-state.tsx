import { Loader2 } from "lucide-react";

export function LoadingState() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
            <div className="w-20 h-20 bg-slate-900 rounded-[2.5rem] flex items-center justify-center rotate-3 shadow-2xl animate-pulse">
                <Loader2 className="animate-spin text-blue-600 w-10 h-10 stroke-[3]" />
            </div>
            <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">ZWORK / ENGINE</p>
                <p className="text-xl font-black text-slate-900 italic uppercase tracking-tighter">Загрузка ленты...</p>
            </div>
        </div>
    )
}
