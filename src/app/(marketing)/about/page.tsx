import { 
  Rocket, 
  Zap, 
  ShieldCheck, 
  Target, 
  Users, 
  MapPin, 
  BrainCircuit,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="flex flex-col gap-20 py-10">
      
      {/* 1. HERO SECTION: Главная идея */}
      <section className="max-w-4xl mx-auto text-center px-4 space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 text-blue-600 text-sm font-bold uppercase tracking-widest animate-in fade-in slide-in-from-bottom-3">
          <Rocket className="w-4 h-4" /> Будущее локальных услуг
        </div>
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none">
          UberJob: Решаем задачи <span className="text-blue-600">мгновенно.</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto italic">
          Мы объединили искусственный интеллект и Uber-механику, чтобы избавить вас от бесконечного поиска мастеров.
        </p>
      </section>

      {/* 2. УТП: Три главных столпа */}
      <section className="bg-slate-50 py-20 border-y">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-12">
          <FeatureCard 
            icon={<BrainCircuit className="w-10 h-10 text-blue-600" />}
            title="AI-Классификация"
            description="Просто опишите задачу. Наш ИИ сам поймет категорию и найдет нужного специалиста. Без лишних кликов."
          />
          <FeatureCard 
            icon={<MapPin className="w-10 h-10 text-emerald-600" />}
            title="Uber-механика"
            description="Мастер видит заказы поблизости в реальном времени. Скорость отклика — от 5 минут."
          />
          <FeatureCard 
            icon={<ShieldCheck className="w-10 h-10 text-purple-600" />}
            title="Безопасная сделка"
            description="Чат, отзывы и система подтверждения заказа гарантируют, что работа будет сделана качественно."
          />
        </div>
      </section>

      {/* 3. КАК ЭТО РАБОТАЕТ (ДЛЯ ОБЕИХ РОЛЕЙ) */}
      <section className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-16">
        {/* Для Клиента */}
        <div className="space-y-8 p-8 rounded-[2.5rem] bg-white border-2 border-slate-100 shadow-sm">
          <h2 className="text-3xl font-black italic underline decoration-blue-500 decoration-4 underline-offset-8">Для клиентов</h2>
          <ul className="space-y-6">
            <StepItem number="01" text="Опубликуйте задачу за 30 секунд. ИИ сам определит категорию." />
            <StepItem number="02" text="Получите отклик от ближайшего свободного мастера." />
            <StepItem number="03" text="Следите за статусом в реальном времени и принимайте работу." />
          </ul>
          <Button className="w-full h-14 rounded-2xl font-bold text-lg" asChild>
            <Link href="/client/new-order">Попробовать сейчас</Link>
          </Button>
        </div>

        {/* Для Мастера */}
        <div className="space-y-8 p-8 rounded-[2.5rem] bg-slate-900 text-white shadow-2xl">
          <h2 className="text-3xl font-black italic underline decoration-blue-400 decoration-4 underline-offset-8">Для мастеров</h2>
          <ul className="space-y-6">
            <StepItem number="01" dark text="Получайте уведомления о заказах в вашем районе." />
            <StepItem number="02" dark text="Выбирайте только те задачи, которые подходят вашим навыкам." />
            <StepItem number="03" dark text="Стройте маршрут до клиента в один клик и зарабатывайте." />
          </ul>
          <Button variant="secondary" className="w-full h-14 rounded-2xl font-bold text-lg" asChild>
            <Link href="/pro/feed">Найти работу</Link>
          </Button>
        </div>
      </section>

      {/* 4. ЦИФРЫ / ФУТЕР */}
      <section className="max-w-4xl mx-auto text-center px-4 py-20 border-t">
        <h2 className="text-2xl font-bold mb-8 flex items-center justify-center gap-2">
          Присоединяйтесь к <span className="text-blue-600 font-black">UberJob</span> сегодня
        </h2>
        <div className="flex flex-wrap justify-center gap-4">
          <div className="px-6 py-4 bg-muted/30 rounded-2xl">
            <p className="text-3xl font-black">100%</p>
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Автоматизация</p>
          </div>
          <div className="px-6 py-4 bg-muted/30 rounded-2xl">
            <p className="text-3xl font-black">AI</p>
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Подбор мастеров</p>
          </div>
          <div className="px-6 py-4 bg-muted/30 rounded-2xl">
            <p className="text-3xl font-black">LIVE</p>
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Отслеживание</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-3xl w-fit shadow-sm border border-slate-100">{icon}</div>
      <h3 className="text-xl font-black italic">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function StepItem({ number, text, dark }: { number: string, text: string, dark?: boolean }) {
  return (
    <div className="flex gap-4 items-start">
      <span className={`font-black text-2xl ${dark ? 'text-blue-400' : 'text-blue-600'}`}>{number}</span>
      <p className={`font-medium ${dark ? 'text-slate-300' : 'text-slate-600'}`}>{text}</p>
    </div>
  );
}
