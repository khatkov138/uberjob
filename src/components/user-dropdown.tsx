"use client"

import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { useRoleModeStore } from "@/store/use-role-store"
import { authClient } from "@/lib/auth-client"
import { Settings, LogOut, User, Shield, ExternalLink } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export function UserDropdown({ user }: { user: any }) {
  const { mode } = useRoleModeStore()
  const router = useRouter()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="outline-none">
        {/* АВАТАР В НАВБАРЕ */}
        <div className="flex items-center gap-3 p-1 pr-4 bg-slate-900 rounded-full hover:bg-blue-600 transition-all cursor-pointer group shadow-xl active:scale-95">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-900 font-black italic text-lg shadow-inner">
            {user.name?.charAt(0).toUpperCase()}
          </div>
          <div className="hidden md:block text-left leading-none">
            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Аккаунт</p>
            <p className="text-[11px] font-black text-white uppercase italic tracking-tighter">
              {user.name?.split(' ')[0]}
            </p>
          </div>
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72 p-4 bg-white rounded-[2rem] border-2 border-slate-100 shadow-2xl mt-4">
        {/* ХЕДЕР ДРОПДАУНА */}
        <div className="p-4 bg-slate-50 rounded-[1.5rem] mb-4">
          <div className="flex items-center gap-3 mb-4">
             <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black italic text-xl">
                {user.name?.charAt(0).toUpperCase()}
             </div>
             <div>
                <p className="text-sm font-black uppercase italic text-slate-900 leading-none mb-1">{user.name}</p>
                <div className="flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                     РЕЖИМ {mode === 'PRO' ? 'МАСТЕРА' : 'КЛИЕНТА'}
                   </p>
                </div>
             </div>
          </div>

          {/* КНОПКА ПЕРЕХОДА В ПУБЛИЧНЫЙ ПРОФИЛЬ */}
          <Link 
            href={`/profile/${user.id}`} 
            className="flex items-center justify-center gap-2 w-full bg-white border-2 border-slate-100 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-blue-600 hover:text-blue-600 transition-all group"
          >
             <ExternalLink size={12} className="group-hover:scale-110 transition-transform" />
             Посмотреть мой профиль
          </Link>
        </div>

        {/* ПУНКТЫ МЕНЮ */}
        <div className="space-y-1">
          <DropdownMenuItem asChild className="focus:bg-slate-50 rounded-xl p-3 cursor-pointer group outline-none border-none">
            <Link href="/settings" className="flex items-center gap-3">
               <div className="p-2 bg-slate-100 rounded-lg group-focus:bg-white transition-colors">
                  <Settings className="w-4 h-4 text-slate-600" />
               </div>
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Настройки аккаунта</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild className="focus:bg-slate-50 rounded-xl p-3 cursor-pointer group outline-none border-none">
            <Link href="/help" className="flex items-center gap-3">
               <div className="p-2 bg-slate-100 rounded-lg group-focus:bg-white transition-colors">
                  <Shield className="w-4 h-4 text-slate-600" />
               </div>
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Поддержка</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-slate-100 my-2" />

          <DropdownMenuItem 
            onClick={async () => {
                await authClient.signOut();
                router.push("/");
            }}
            className="focus:bg-red-50 rounded-xl p-3 cursor-pointer group outline-none border-none"
          >
            <div className="flex items-center gap-3 text-red-600">
               <div className="p-2 bg-red-100/50 rounded-lg group-focus:bg-white transition-colors">
                  <LogOut className="w-4 h-4" />
               </div>
               <span className="text-[10px] font-black uppercase tracking-widest">Выйти из системы</span>
            </div>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
