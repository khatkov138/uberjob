// app/cities/page.tsx

import Link from "next/link";
import { Globe, ArrowUpRight, Navigation2 } from "lucide-react";
import prisma from "@/lib/prisma";
import { Container } from "@/components/shared/container";

export const revalidate = 3600;

export default async function CitiesPage() {
    const allCities = await prisma.location.findMany({
        orderBy: { name: 'asc' },
        select: { name: true, slug: true, _count: { select: { orders: true } } }
    });

    const popularCities = [...allCities]
        .sort((a, b) => b._count.orders - a._count.orders)
        .slice(0, 3);

    const grouped = allCities.reduce((acc, city) => {
        const letter = city.name[0].toUpperCase();
        if (!acc[letter]) acc[letter] = [];
        acc[letter].push(city);
        return acc;
    }, {} as Record<string, typeof allCities>);

    return (
        <Container className="bg-white">
            <header className="space-y-2 mb-10">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">ZWORK / LOCATIONS</span>
                    <div className="w-1 h-1 bg-blue-600 rounded-full animate-pulse" />
                </div>
                <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">
                    Выбор <span className="text-blue-600">Региона</span>
                </h1>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* ЛЕВАЯ ЧАСТЬ: ТОП ЛОКАЦИИ */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="flex items-center gap-2 px-2 border-l-4 border-blue-600">
                        <Navigation2 className="w-5 h-5 text-blue-600 fill-current" />
                        <h3 className="font-black uppercase italic text-slate-900">Ближайшие заказы в:</h3>
                    </div>

                    {popularCities.map((city, idx) => (
                        <Link key={city.slug} href={`/orders/${city.slug}`} className="group block">
                            <div className={`
                p-8 rounded-[2.5rem] flex flex-col justify-between min-h-[160px] transition-all hover:scale-[1.02] active:scale-95
                ${idx === 0 ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' : 'bg-blue-600 text-white shadow-xl shadow-blue-100'}
              `}>
                                <div className="flex justify-between items-start">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">#0{idx + 1} Region</p>
                                    <ArrowUpRight className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-all" />
                                </div>
                                <div>
                                    <p className="text-4xl font-black italic tracking-tighter leading-none">{city.name}</p>
                                    <div className="mt-2 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                                        <p className="text-[10px] font-bold uppercase italic opacity-80">
                                            {city._count.orders} заказов ждут
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* ПРАВАЯ ЧАСТЬ: АЛФАВИТНЫЙ СПИСОК */}
                <div className="lg:col-span-8">
                    <div className="bg-slate-50 border border-slate-100 rounded-[3rem] p-8 md:p-12">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-16 gap-y-12">
                            {Object.keys(grouped).sort().map((letter) => (
                                <div key={letter} className="space-y-5">
                                    <div className="text-5xl font-black text-slate-200 italic leading-none select-none">
                                        {letter}
                                    </div>
                                    <ul className="space-y-3">
                                        {grouped[letter].map((city) => (
                                            <li key={city.slug}>
                                                <Link
                                                    href={`/orders/${city.slug}`}
                                                    className="flex justify-between items-center group"
                                                >
                                                    <span className="text-xl font-bold text-slate-800 group-hover:text-blue-600 transition-colors uppercase tracking-tight">
                                                        {city.name}
                                                    </span>
                                                    <div className="h-[2px] flex-grow mx-4 border-t-2 border-dotted border-slate-200 group-hover:border-blue-200 transition-colors" />
                                                    <span className="text-[11px] font-black text-slate-400 group-hover:text-blue-600">
                                                        {city._count.orders}
                                                    </span>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </Container>
    );
}
