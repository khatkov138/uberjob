import { getServerSession } from "@/lib/get-session";
import { Search, ShieldCheck, Zap, ArrowUpRight, Hammer, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Container } from "@/components/shared/container";

export default async function HomePage() {
    const session = await getServerSession();

    if (session?.user) {
        const cookieStore = await cookies();
        const lastMode = cookieStore.get('zwork-mode')?.value;
        if (lastMode === 'PRO') redirect('/pro/dashboard');
        else redirect('/client/dashboard');
    }

    return (

        <Container >
            <section className="w-full pt-8 pb-10 md:pt-12 md:pb-16">
                <div className="flex flex-col items-center text-center space-y-6">

                    {/* Бадж с акцентом на масштаб */}
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/10">
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em]">Поиск услуг по всей России</span>
                    </div>

                    {/* Заголовок: Масштаб + Результат */}
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-black italic uppercase tracking-tighter text-slate-900 leading-[0.85] max-w-5xl">
                        Сервис <span className="text-blue-600">реальных</span> <br />
                        дел в твоем городе
                    </h1>

                    {/* Сабтитл: Объясняем, что мы везде и про всё офлайн */}
                    <p className="max-w-2xl text-base md:text-xl font-bold text-slate-400 uppercase italic tracking-tight leading-tight">
                        Найди специалиста за 5 минут: от Владивостока до Калининграда. <br className="hidden md:block" />
                        Сотни категорий услуг там, где ты находишься прямо сейчас.
                    </p>

                    {/* Кнопки-карточки */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl pt-4">
                        <Link href="/client/new" className="group">
                            <div className="bg-slate-900 h-20 rounded-[1.5rem] flex items-center justify-between px-6 text-white transition-all hover:scale-[1.02] active:scale-95 shadow-2xl shadow-slate-200">
                                <div className="text-left">
                                    <span className="block text-[9px] font-black uppercase tracking-widest opacity-50">Нужна помощь</span>
                                    <span className="text-xl font-black uppercase italic tracking-tighter">Найти услугу</span>
                                </div>
                                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform shadow-lg shadow-blue-500/20">
                                    <Search className="w-5 h-5 text-white" />
                                </div>
                            </div>
                        </Link>

                        <Link href="/orders" className="group">
                            <div className="bg-white border-2 border-slate-200 h-20 rounded-[1.5rem] flex items-center justify-between px-6 text-slate-900 transition-all hover:border-blue-600 hover:scale-[1.02] active:scale-95 shadow-sm">
                                <div className="text-left">
                                    <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400">Ищу заказы</span>
                                    <span className="text-xl font-black uppercase italic tracking-tighter">Взять работу</span>
                                </div>
                                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center group-hover:text-blue-600 transition-colors">
                                    <ArrowUpRight className="w-6 h-6 text-slate-300" />
                                </div>
                            </div>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Траст-факторы: Масштаб, Локальность, Доверие */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-12">
                {[
                    {
                        icon: Search,
                        color: 'blue',
                        title: 'Локальный поиск',
                        desc: 'Находит мастеров в радиусе от 500 метров'
                    },
                    {
                        icon: Zap,
                        color: 'amber',
                        title: 'В любом городе',
                        desc: 'Работает везде, где есть интернет и люди'
                    },
                    {
                        icon: ShieldCheck,
                        color: 'emerald',
                        title: 'Прямая связь',
                        desc: 'Без посредников и скрытых комиссий'
                    }
                ].map((item, i) => (
                    <div key={i} className="bg-white p-6 rounded-[1.5rem] border border-slate-100 flex items-center gap-4 transition-all hover:translate-y-[-2px] hover:shadow-md">
                        <div className={`w-12 h-12 bg-${item.color}-50 rounded-2xl flex items-center justify-center text-${item.color}-600 flex-none`}>
                            <item.icon className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase italic tracking-tighter text-slate-900">{item.title}</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">{item.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        </Container>


    );
}
