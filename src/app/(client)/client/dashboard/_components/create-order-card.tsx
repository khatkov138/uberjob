import Link from "next/link"
import { Plus, Zap } from "lucide-react"

export function CreateOrderCard() {
  return (
    <Link href="/client/new" className="group block mb-8">
      <div className="bg-blue-600 rounded-[2.5rem] p-10 md:p-16 text-white relative overflow-hidden shadow-2xl shadow-blue-200 transition-all hover:scale-[1.01] active:scale-95 duration-500">
        {/* Декор на фоне */}
        <Plus className="absolute top-0 right-0 w-64 h-64 -mr-16 -mt-16 opacity-10 group-hover:rotate-12 transition-transform duration-700 pointer-events-none" />

        <div className="relative z-10 space-y-6">
          <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter leading-none">
            Опубликовать <br /> новую задачу
          </h2>
          <div className="flex items-center gap-3 bg-white/10 w-fit px-6 py-3 rounded-2xl backdrop-blur-md border border-white/20">
            <Zap className="w-5 h-5 fill-current text-yellow-300" />
            <span className="text-[10px] font-black uppercase tracking-widest">Исполнители уже в сети</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
