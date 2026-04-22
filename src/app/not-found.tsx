// app/not-found.tsx
import { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/shared/container";
import { SearchX, ArrowLeft, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "404 | Страница не найдена",
};

export default function NotFound() {
  return (
    <Container className="flex items-center justify-center min-h-[calc(100vh-160px)]">
      <div className="w-full max-w-2xl mx-auto">
        
        {/* ГЛАВНЫЙ БЛОК: SYSTEM ERROR */}
        <div className="bg-slate-900 rounded-[3rem] p-10 md:p-16 text-white relative overflow-hidden shadow-2xl">
          {/* ФОНОВЫЙ ХАД-ЭЛЕМЕНТ */}
          <SearchX className="absolute top-0 right-0 w-80 h-80 -mr-20 -mt-20 opacity-5 rotate-12 pointer-events-none" />
          
          <div className="relative z-10 space-y-12">
            
            {/* СТАТУС-БАР */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">
                    System / Error_404
                  </span>
                </div>
                <div className="h-px flex-1 bg-gradient-to-r from-blue-500/20 to-transparent" />
              </div>
              
              <h1 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter leading-[0.8]">
                ПУСТО <br /> <span className="text-blue-600">ЗДЕСЬ</span>
              </h1>
            </div>

            {/* КОНТЕНТ */}
            <div className="space-y-6">
              <p className="text-xl md:text-2xl text-slate-400 font-medium italic leading-tight max-w-md">
                Запрашиваемый ресурс <span className="text-white">не обнаружен</span>. Вероятно, ссылка устарела или страница была перенесена.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link 
                  href="/" 
                  className="flex-[2] flex items-center justify-center gap-4 bg-blue-600 hover:bg-blue-700 text-white h-20 rounded-2xl font-black uppercase italic tracking-widest transition-all hover:-translate-y-1 active:scale-95 shadow-xl shadow-blue-600/20 group"
                >
                  <ArrowLeft className="w-6 h-6 transition-transform group-hover:-translate-x-1" />
                  Вернуться в хаб
                </Link>
                
                <div className="flex-1 hidden sm:flex items-center justify-center bg-white/5 border border-white/10 text-slate-500 h-20 rounded-2xl">
                    <Zap className="w-6 h-6 opacity-20" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* НИЖНИЙ ТЕКСТ */}
        <p className="mt-10 text-center text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">
          ZWORK / recovery_protocol_active
        </p>

      </div>
    </Container>
  );
}
