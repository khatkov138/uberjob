import * as React from "react"
import { getMyOffers } from "./actions"
import { MyOffersList } from "./my-offers-list"
import { Container } from "@/components/shared/container"

export default async function MyOffersPage() {
  const result = await getMyOffers()
  const offers = result.success ? result.data : []

  return (
    <Container>
      {/* HEADER: Используем mb-10 для зазора перед списком */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">ZWORK / PRO</span>
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
          </div>
          <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">
            Мои <span className="text-blue-600">Отклики</span>
          </h1>
        </div>
        
        {/* Статистика в стиле ZWORK */}
        <div className="bg-white px-6 py-4 rounded-xl border border-slate-200">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Всего предложений</p>
           <p className="text-3xl font-black italic text-slate-900 leading-none">{offers?.length || 0}</p>
        </div>
      </header>

      {/* LIST: Сам список откликов */}
      <MyOffersList initialOffers={offers} />
    </Container>
  )
}
