
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import TanstackProvider from "@/providers/TanstackProvider";

import { Toaster } from "@/components/ui/sonner";
import { Footer } from "@/components/footer";
import { LivePulseMarquee } from "@/components/shared/live-pulse-marquee";
import { RoleAutoswitcher } from "@/components/shared/role-autoswitcher";
import { Heartbeat } from "@/components/shared/heartbeat";
import Navbar from "@/components/navbar/navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Metadata остается как была
export const metadata: Metadata = {
  title: {
    // Если на странице есть свой заголовок, будет: "Ремонт крана - ZWORK"
    template: "%s | ZWORK",
    // Если на странице заголовка нет (например, главная):
    default: "ZWORK — Платформа для поиска мастеров и заказов"
  },
  description: "ZWORK ENGINE: Современный сервис поиска исполнителей. Заказы в вашем городе, удобная карта и быстрые отклики.",
  icons: {
    icon: "/favicon.ico", // файл должен лежать в public/favicon.ico
    shortcut: "/favicon.ico",
    // apple: "/apple-touch-icon.png", // файл в public/
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  console.log("ROOOTLAYOUT")

  return (
    <html lang="ru" className="h-full">
      <body className={`${geistSans.className} antialiased h-screen flex flex-col overflow-hidden bg-white`}>

        <TanstackProvider>
          <Heartbeat />
          {/* HEADER: Занимает ровно столько, сколько нужно контенту */}
          <header className="flex-none z-50">
            <Navbar />
            <LivePulseMarquee />
          </header>

          {/* 
            MAIN: flex-1 забирает всё пространство от Header до низа экрана.
            overflow-hidden здесь критичен, чтобы скролл работал только внутри.
          */}
          <main className="flex-1 flex flex-col min-h-0 bg-slate-50 relative overflow-hidden">

            {/* 
               SCROLL-AREA: Этот блок обеспечивает скролл для обычных страниц (Дашборд, Лента).
               Для чата он просто отдаст всю высоту, так как у чата внутри будет h-full.
            */}
            <div className="flex-1 overflow-y-auto flex flex-col chat-scrollbar">
              <div className="flex-1">
                {children}
              </div>

              {/* FOOTER: Теперь он всегда будет в конце контента и не перекроет плитки */}
              <Footer />
            </div>

          </main>

          <RoleAutoswitcher />
          <Toaster richColors closeButton />

        </TanstackProvider>

      </body>
    </html>
  );
}
