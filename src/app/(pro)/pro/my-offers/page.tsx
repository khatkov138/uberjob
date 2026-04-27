import * as React from "react"
import { MyOffersList } from "./my-offers-list"
import { Container } from "@/components/shared/container"
import { getMyOffers } from "@/actions/offer/offers"

export default async function MyOffersPage() {

  const { data: offers } = await getMyOffers()

  return (
    <Container className="py-10">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">ZWORK / PRO</span>
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
          </div>
          <h1 className="text-5xl md:text-8xl font-black italic uppercase tracking-tighter text-slate-900 leading-[0.8]">
            Мои <br />
            <span className="text-blue-600">Отклики</span>
          </h1>
        </div>

        {/* СТАТИСТИКА */}
        <div className="bg-slate-50 px-8 py-6 rounded-[2rem] border border-slate-100 flex flex-col justify-end min-w-[200px]">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">Активность</p>
          <div className="flex items-baseline gap-2">
            <p className="text-5xl font-black italic text-slate-900 leading-none">{offers.length}</p>
            <p className="text-xs font-black uppercase text-blue-600 italic">Всего</p>
          </div>
        </div>
      </header>

      {/* LIST */}
      <main>
        <MyOffersList initialOffers={offers} />
      </main>
    </Container>
  )
}
