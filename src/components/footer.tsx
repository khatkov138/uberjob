"use client"
import Link from "next/link";
import {
  Rocket,

  Mail,
  MapPin,
  ExternalLink,
  XIcon
} from "lucide-react";
import { GitHubIcon } from "./icons/GitHubIcon";
import { usePathname } from "next/navigation";

export function Footer() {
  const currentYear = new Date().getFullYear();

  const pathname = usePathname()

  // Список страниц, где футер НЕ НУЖЕН (например, в чате)
  const isChat = pathname.includes("/messages/")

  if (isChat) return null

  return (
    <footer className="w-full border-t bg-background mt-20">
      <div className="max-w-7xl mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">

          {/* 1. БРЕНД И ОПИСАНИЕ */}
          <div className="col-span-1 md:col-span-1 space-y-4">
            <Link href="/" className="transition-transform hover:scale-105 active:scale-95 inline-block">
              <span className="font-black text-2xl tracking-tighter text-blue-600">
                Uber<span className="text-foreground">Job</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed italic">
              Умный сервис заказа услуг. <br />
              ИИ-классификация и Uber-механика в одном приложении.
            </p>
            <div className="flex items-center gap-4 pt-2">
              <Link href="#" className="text-muted-foreground hover:text-blue-600 transition-colors">
                <XIcon className="w-5 h-5" />
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-blue-600 transition-colors">
                <GitHubIcon className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* 2. КЛИЕНТАМ */}
          <div className="space-y-4">
            <h4 className="font-black text-sm uppercase tracking-widest text-blue-600">Заказчикам</h4>
            <ul className="space-y-3 text-sm font-medium">
              <li><Link href="/client/new-order" className="hover:underline underline-offset-4">Создать задачу</Link></li>
              <li><Link href="/client/dashboard" className="hover:underline underline-offset-4">Мои заказы</Link></li>
              <li><Link href="/about" className="hover:underline underline-offset-4">Как это работает</Link></li>
              <li><Link href="/help" className="hover:underline underline-offset-4 text-muted-foreground">Центр поддержки</Link></li>
            </ul>
          </div>

          {/* 3. МАСТЕРАМ */}
          <div className="space-y-4">
            <h4 className="font-black text-sm uppercase tracking-widest text-blue-600">Мастерам</h4>
            <ul className="space-y-3 text-sm font-medium">
              <li><Link href="/pro/feed" className="hover:underline underline-offset-4">Поиск работы</Link></li>
              <li><Link href="/pro/dashboard" className="hover:underline underline-offset-4">Панель управления</Link></li>
              <li><Link href="/settings" className="hover:underline underline-offset-4">Настройки профиля</Link></li>
              <li><Link href="#" className="flex items-center gap-1 hover:underline underline-offset-4 text-muted-foreground">
                Стать партнером <ExternalLink className="w-3 h-3" />
              </Link></li>
            </ul>
          </div>

          {/* 4. КОНТАКТЫ */}
          <div className="space-y-4">
            <h4 className="font-black text-sm uppercase tracking-widest text-blue-600">Контакты</h4>
            <ul className="space-y-3 text-sm font-medium">
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span>support@uberjob.ru</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="italic">Иркутск, Россия</span>
              </li>
              <li className="pt-2">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center gap-2">
                  <Rocket className="w-4 h-4 text-blue-600 animate-bounce" />
                  <span className="text-[10px] font-bold text-blue-700 leading-tight">
                    Работаем на <br /> Next.js 15 + AI
                  </span>
                </div>
              </li>
            </ul>
          </div>

        </div>

        <div className="mt-16 pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          <p>© {currentYear} UberJob Inc. Все права защищены.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-blue-600 transition-colors">Политика конфиденциальности</Link>
            <Link href="/terms" className="hover:text-blue-600 transition-colors">Условия использования</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}