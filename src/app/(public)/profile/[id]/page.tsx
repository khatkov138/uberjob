import { notFound } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { ru } from "date-fns/locale"
import { Star, ShieldCheck, MapPin, MessageSquare, Zap } from "lucide-react"


import { Container } from "@/components/shared/container"
import { cn, unwrap } from "@/lib/utils"
import { getProfileData, PublicProfile } from "@/actions/profile/get"

export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {

    const { id } = await params

    // Сначала вызываем экшен
    const result = await getProfileData(id)

    const data = unwrap<PublicProfile | null>(result, null)

    if (!data) return notFound()

    const { user, profile, isOnline, lastSeenDate } = data

    return (
        <Container className="bg-white">
            <div className="max-w-4xl mx-auto py-10 space-y-12">

                {/* HEADER: AVATAR & IDENTITY */}
                <div className="flex flex-col md:flex-row items-center md:items-end gap-10">
                    <div className="relative">
                        <div className="w-44 h-44 rounded-[3.5rem] bg-slate-900 flex items-center justify-center text-white text-7xl font-black italic shadow-2xl overflow-hidden">
                            {user.image ? (
                                <img src={user.image} className="w-full h-full object-cover" alt={user.name} />
                            ) : (
                                user.name?.charAt(0).toUpperCase()
                            )}
                        </div>

                        <div className={cn(
                            "absolute -bottom-2 -right-2 px-5 py-2.5 rounded-2xl border-4 border-white font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 shadow-xl",
                            isOnline ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
                        )}>
                            <div className={cn("w-2 h-2 rounded-full bg-white", isOnline && "animate-pulse")} />
                            {isOnline ? "В СЕТИ" : "ОФЛАЙН"}
                        </div>
                    </div>

                    <div className="flex-1 text-center md:text-left space-y-6">
                        <div className="space-y-2">
                            <div className="flex items-center justify-center md:justify-start gap-3 text-blue-600">
                                <ShieldCheck size={16} />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em]">ZWORK VERIFIED</span>
                            </div>

                            <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">
                                {user.name}
                            </h1>

                            {!isOnline && (
                                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">
                                    Был {formatDistanceToNow(lastSeenDate, { addSuffix: true, locale: ru })}
                                </p>
                            )}
                        </div>

                        <div className="flex flex-wrap justify-center md:justify-start gap-4">
                            <div className="bg-slate-50 border border-slate-100 px-5 py-3 rounded-2xl flex items-center gap-3">
                                <Star className="text-amber-500 fill-current" size={18} />
                                <span className="text-xl font-black italic text-slate-900">{profile.rating.toFixed(1)}</span>
                            </div>
                            <div className="bg-slate-50 border border-slate-100 px-5 py-3 rounded-2xl flex items-center gap-3">
                                <MapPin className="text-blue-500" size={18} />
                                <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                                    {profile.city || "ЗЕМЛЯ"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* MAIN CONTENT */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                    <div className="md:col-span-8 space-y-10">
                        <section className="space-y-4">
                            <h3 className="text-2xl font-black uppercase italic tracking-tight text-slate-900 flex items-center gap-3">
                                <div className="w-8 h-1 bg-blue-600 rounded-full" />
                                Биография
                            </h3>
                            <p className="text-xl text-slate-500 font-medium italic leading-relaxed">
                                {profile.bio || "Специалист еще не заполнил информацию о себе."}
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h3 className="text-2xl font-black uppercase italic tracking-tight text-slate-900">Специализации</h3>
                            <div className="flex flex-wrap gap-2">
                                {profile.skills.length > 0 ? profile.skills.map((skill: any) => (
                                    <span key={skill.categoryId} className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest italic hover:bg-blue-600 transition-all active:scale-95">
                                        #{skill.category.name}
                                    </span>
                                )) : (
                                    <span className="text-slate-300 italic font-black uppercase text-[10px]">Ниши не выбраны</span>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* SIDEBAR: STATS & CTA */}
                    <div className="md:col-span-4 space-y-6">
                        <button className="w-full h-24 bg-blue-600 hover:bg-slate-900 text-white rounded-[2.5rem] flex flex-col items-center justify-center gap-1 transition-all duration-500 shadow-2xl shadow-blue-500/20 active:scale-95 group">
                            <MessageSquare className="group-hover:scale-110 transition-transform" />
                            <span className="font-black uppercase italic text-[11px] tracking-widest">Открыть чат</span>
                        </button>

                        <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white space-y-6 relative overflow-hidden">
                            <Zap className="absolute -right-4 -bottom-4 w-24 h-24 opacity-10 rotate-12" />
                            <div className="relative z-10">
                                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 mb-2">Выполнено</p>
                                <div className="flex items-end gap-2">
                                    <span className="text-5xl font-black italic leading-none">{profile.completedCount}</span>
                                    <span className="text-[10px] font-bold uppercase text-blue-400 mb-1">заказов</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Container>
    )
}
