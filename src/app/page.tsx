
import { Button } from "@/components/ui/button";
import { getServerSession } from "@/lib/get-session";
import { Search, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Role } from "../../prisma/generated";
import { cookies } from "next/headers";

export default async function HomePage() {
   const session = await getServerSession()
  
  // Если пользователь залогинен, проверяем, какой режим был последним
  if (session?.user) {
    const cookieStore = await cookies()
    const lastMode = cookieStore.get('zwork-mode')?.value

    if (lastMode === 'PRO') {
      redirect('/pro/dashboard')
    } else {
      redirect('/client/dashboard')
    }
  }

    return (
        <div className="flex flex-col min-h-screen">
            {/* Hero Section */}
            <main className="flex-1 flex flex-col items-center justify-center px-4 py-20 text-center bg-gradient-to-b from-background to-secondary/20">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 text-sm font-medium mb-6">
                    <Zap className="w-4 h-4 fill-current" />
                    <span>Запуск в 2026: Сервис нового поколения</span>
                </div>

                <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6 max-w-4xl">
                    Любая задача будет решена <br />
                    <span className="text-blue-600 italic">профессионалом</span>
                </h1>

                <p className="text-lg text-muted-foreground mb-10 max-w-2xl">
                    Маркетплейс услуг с AI-подбором исполнителей. Течет кран или нужен дизайн?
                    Просто напишите, что случилось — остальное сделаем мы.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                    <Button size="lg" className="flex-1 h-14 text-lg font-bold shadow-lg shadow-blue-500/20" asChild>
                        <Link href="/client/new-order">Найти мастера</Link>
                    </Button>
                    <Button size="lg" variant="outline" className="flex-1 h-14 text-lg font-bold" asChild>
                        <Link href="/sign-up">Стать мастером</Link>
                    </Button>
                </div>

                {/* Траст-факторы */}
                <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 opacity-60">
                    <div className="flex items-center gap-2 justify-center">
                        <ShieldCheck className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-medium">Безопасная сделка</span>
                    </div>
                    <div className="flex items-center gap-2 justify-center">
                        <Search className="w-5 h-5 text-blue-600" />
                        <span className="text-sm font-medium">Проверка профилей</span>
                    </div>
                    {/* Добавь еще пару штук по вкусу */}
                </div>
            </main>
        </div>
    );
}