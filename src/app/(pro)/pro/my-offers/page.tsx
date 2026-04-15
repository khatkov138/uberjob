import * as React from "react"
import { getMyOffers } from "./actions"

import { Zap } from "lucide-react"
import { MyOffersList } from "./my-offers-list"

export default async function MyOffersPage() {
  const result = await getMyOffers()
  const offers = result.success ? result.data : []

  return (
    <main className="min-h-screen bg-slate-50/50 pb-32">
      <div className="max-w-5xl mx-auto p-6 md:p-12 space-y-10">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">ZWORK / PRO</span>
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
            </div>
            <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">
              Мои <span className="text-blue-600">Отклики</span>
            </h1>
          </div>
          
          <div className="bg-white px-6 py-4 rounded-2xl border-2 border-slate-100 shadow-sm">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Всего предложений</p>
             <p className="text-3xl font-black italic text-slate-900 leading-none">{offers?.length || 0}</p>
          </div>
        </header>

        {/* LIST */}
        <MyOffersList initialOffers={offers} />
      </div>
    </main>
  )
}
