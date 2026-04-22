"use client"

import * as React from "react"
import { Lock, ArrowRight, UserPlus } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Container } from "@/components/shared/container"

export default function UnauthorizedPage() {
  const pathname = usePathname()

  return (
    <Container className="bg-transparent border-none shadow-none">
      <div className="w-full max-w-2xl mx-auto">

        <div className="bg-slate-900 rounded-[3rem] p-8 md:p-16 text-white relative overflow-hidden shadow-2xl">
          <Lock className="absolute top-0 right-0 w-80 h-80 -mr-20 -mt-20 opacity-5 rotate-12 pointer-events-none" />

          <div className="relative z-10 space-y-10">

            <div className="space-y-4">
              <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">
                ZWORK / AUTH
              </span>
              <h1 className="text-4xl sm:text-6xl md:text-[5.5rem] font-black italic uppercase tracking-tight leading-[0.9] break-words">
                НУЖНА <br />
                <span className="text-blue-600 block sm:inline">АВТОРИЗАЦИЯ</span>
              </h1>

            </div>

            <div className="space-y-8">
              <p className="text-xl md:text-2xl text-slate-400 font-medium italic leading-tight">
                Для продолжения работы в системе необходимо войти в свой аккаунт или зарегистрироваться.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link
                  href={`/sign-in?callbackUrl=${pathname}`}
                  className="flex-1 flex items-center justify-center gap-4 bg-blue-600 hover:bg-blue-700 text-white h-20 rounded-2xl font-black uppercase italic tracking-widest transition-all hover:-translate-y-1 active:scale-95 shadow-xl shadow-blue-600/20"
                >
                  Войти
                  <ArrowRight className="w-6 h-6" />
                </Link>

                <Link
                  href="/sign-up"
                  className="flex-1 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 text-white h-20 rounded-2xl font-black uppercase italic tracking-widest transition-all"
                >
                  Регистрация
                </Link>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-10 text-center text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">
          ZWORK SYSTEM SECURITY
        </p>

      </div>
    </Container>
  )
}
