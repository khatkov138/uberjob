"use client";

import { LoadingButton } from "@/components/loading-button";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { LogOut } from "lucide-react";

export function LogoutEverywhereButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogoutEverywhere() {
    setLoading(true);
    const { error } = await authClient.revokeOtherSessions();
    setLoading(false);

    if (error) {
      toast.error(error.message || "Не удалось завершить сессии");
    } else {
      toast.success("Вы успешно вышли на других устройствах");
      // router.push("/sign-in")
    }
  }

  return (
    <div className="space-y-3">
      {/* СЛУЖЕБНАЯ ПОДПИСЬ ПО СТАНДАРТУ ТВОЕГО ДАШБОРДА */}
      <div className="flex items-center gap-1.5 ml-1">
        <span className="text-[8px] font-black uppercase tracking-[0.2.5em] text-slate-400">
          Управление сессиями • Security Lock
        </span>
      </div>

      <LoadingButton
        type="button"
        onClick={handleLogoutEverywhere}
        loading={loading}
        className="h-14 w-full border border-slate-200 bg-slate-50/50 hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-slate-600 font-black uppercase text-xs tracking-widest rounded-2xl transition-all active:scale-[0.99] flex items-center justify-center gap-2 group shadow-sm"
      >
        {!loading && (
          <LogOut className="w-4 h-4 text-slate-400 group-hover:text-red-500 transition-colors" />
        )}
        <span>Выйти на других устройствах</span>
      </LoadingButton>
      
      <p className="text-[9px] text-slate-400 font-medium text-center italic tracking-wide">
        Все активные сессии, кроме текущей в этом браузере, будут мгновенно аннулированы в целях безопасности.
      </p>
    </div>
  );
}
