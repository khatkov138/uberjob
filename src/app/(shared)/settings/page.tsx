import type { Metadata } from "next";
import { getServerSession } from "@/lib/get-session";
import { forbidden, unauthorized } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MailIcon, ShieldCheckIcon, UserCircleIcon, ArrowUpRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import prisma from "@/lib/prisma";
import { ProfileDetailsForm } from "./_components/profile-details-form";
import { EmailForm } from "./_components/email-form";
import { PasswordForm } from "./_components/password-form";
import { LogoutEverywhereButton } from "./_components/logout-everywhere-button";

export const metadata: Metadata = {
  title: "Настройки профиля",
};

export default async function SettingsPage() {
  const session = await getServerSession()
  if (!session) return unauthorized()
  
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { profile: true }
  })

  if (!user) return forbidden()

  return (
    <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-10 bg-white min-h-screen selection:bg-blue-500 selection:text-white">

      {/* ЭЛЕГАНТНЫЙ АЛЕРТ ПОДТВЕРЖДЕНИЯ В СТИЛЕ КАРТОЧКИ ДОХОДА */}
      {!user.emailVerified && <EmailVerificationAlert />}

      {/* ХЭДЕР ПО СТАНДАРТУ PRO / HUB */}
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">PRO / HUB •</span>
          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
        </div>
        <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-slate-900 leading-none">
          Настройки
        </h1>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest pt-1 italic">
          Управление данными аккаунта, почтой и безопасностью.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* ЛЕВАЯ КОЛОНКА: ОСНОВНЫЕ ДАННЫЕ ПРОФИЛЯ */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center gap-2 ml-4">
            <UserCircleIcon className="w-4 h-4 text-blue-600" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Персональный профиль</span>
          </div>
          {/* Большая белая плашка с мягким внутренним фоном формы */}
          <div className="bg-slate-50/50 border border-slate-100 rounded-[2.5rem] p-8 md:p-10 shadow-sm transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-100/50">
            <ProfileDetailsForm user={user} />
          </div>
        </div>

        {/* ПРАВАЯ КОЛОНКА: БЕЗОПАСНОСТЬ И ДОСТУП */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 ml-4">
              <ShieldCheckIcon className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Безопасность</span>
            </div>

            <div className="space-y-6">
              {/* Почта на мягком сером фоне */}
              <section className="bg-slate-50 border border-slate-100 rounded-[2rem] p-6 md:p-8 transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-100/50">
                <EmailForm currentEmail={user.email} />
              </section>

              {/* Пароль */}
              <section className="bg-slate-50 border border-slate-100 rounded-[2rem] p-6 md:p-8 transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-100/50">
                <PasswordForm />
              </section>

              <Separator className="bg-slate-100 h-[1px]" />

              {/* Сессия выхода */}
              <div className="pt-2">
                <LogoutEverywhereButton />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function EmailVerificationAlert() {
  return (
    <div className="rounded-[2.5rem] border border-blue-100 bg-blue-50/40 p-6 md:p-8 transition-all hover:bg-blue-50/70 shadow-sm group">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
          {/* Иконка в чистом синем цвете внимания */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-blue-100 shrink-0 text-blue-600">
            <MailIcon className="size-7 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 leading-none">
              Почта не подтверждена
            </h3>
            <p className="text-[10px] font-black text-blue-600/80 uppercase tracking-[0.15em] mt-1.5 italic">
              Требуется верификация для разблокировки всех функций хаба
            </p>
          </div>
        </div>
        
        {/* Контрастная кнопка действия */}
        <Button 
          size="lg" 
          className="w-full sm:w-auto h-14 bg-slate-950 hover:bg-blue-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 px-8 group/btn border-transparent"
          asChild
        >
          <Link href="/verify-email">
            <span>Подтвердить</span>
            <ArrowUpRight size={14} className="opacity-60 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

