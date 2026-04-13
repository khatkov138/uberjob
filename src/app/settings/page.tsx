import type { Metadata } from "next";
import { EmailForm } from "./email-form";
import { LogoutEverywhereButton } from "./logout-everywhere-button";
import { PasswordForm } from "./password-form";
import { ProfileDetailsForm } from "./profile-details-form";
import { getServerSession } from "@/lib/get-session";
import { unauthorized } from "next/navigation";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MailIcon, ShieldCheckIcon, UserCircleIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "Настройки профиля",
};

export default async function SettingsPage() {
  const session = await getServerSession();
  const user = session?.user;

  if (!user) unauthorized();

  return (
    // Добавляем контейнер с максимальной шириной и отступами для чистого вида
    <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-10">
      
      {/* Секция предупреждения: теперь более "чистая" и акцентная */}
      {!user.emailVerified && <EmailVerificationAlert />}

      <header className="space-y-2">
        <h1 className="text-4xl font-black tracking-tight">Настройки</h1>
        <p className="text-muted-foreground text-lg italic">
          Управляйте данными аккаунта, почтой и безопасностью.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Левая колонка: Основные данные профиля */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center gap-2 mb-4">
             <UserCircleIcon className="w-5 h-5 text-blue-600" />
             <h2 className="text-xl font-bold uppercase tracking-widest text-sm">Профиль</h2>
          </div>
          <div className="bg-card border-2 rounded-[2rem] p-6 md:p-8 shadow-sm">
            <ProfileDetailsForm user={user} />
          </div>
        </div>

        {/* Правая колонка: Безопасность и аккаунт */}
        <div className="lg:col-span-5 space-y-8">
          
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
               <ShieldCheckIcon className="w-5 h-5 text-emerald-600" />
               <h2 className="text-xl font-bold uppercase tracking-widest text-sm">Безопасность</h2>
            </div>
            
            <div className="space-y-6">
              <section className="bg-muted/30 rounded-[2rem] p-6 border">
                <EmailForm currentEmail={user.email} />
              </section>

              <section className="bg-muted/30 rounded-[2rem] p-6 border">
                <PasswordForm />
              </section>

              <Separator className="opacity-50" />

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
    <div className="rounded-[1.5rem] border-2 border-amber-200 bg-amber-50/50 p-5 transition-all hover:bg-amber-50">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-white p-3 rounded-2xl shadow-sm">
            <MailIcon className="size-6 text-amber-600" />
          </div>
          <div className="space-y-1">
            <p className="font-bold text-amber-900 leading-none">Почта не подтверждена</p>
            <p className="text-sm text-amber-800/80">Пожалуйста, подтвердите адрес, чтобы получить доступ ко всем функциям.</p>
          </div>
        </div>
        <Button size="lg" className="rounded-xl font-bold px-8 shadow-md" asChild>
          <Link href="/verify-email text-white">Подтвердить</Link>
        </Button>
      </div>
    </div>
  );
}