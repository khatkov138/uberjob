import React from "react";

interface MessengerLayoutProps {
    sidebar: React.ReactNode;
    children: React.ReactNode;
}

export function MessengerLayout({ sidebar, children }: MessengerLayoutProps) {
    return (
        <div className="flex-1 h-full w-full flex flex-col overflow-hidden p-4 md:p-10 bg-slate-50/30">
            <div className="flex-1 w-full max-w-7xl mx-auto bg-white flex flex-row overflow-hidden border-2 border-slate-100 rounded-[3rem] shadow-2xl">

                {/* ЛЕВАЯ ПАНЕЛЬ (ДИАЛОГИ) */}
                <aside className="w-80 md:w-96 border-r border-slate-100 flex flex-col h-full bg-slate-50/50 shrink-0">
                    <div className="p-8 border-b border-slate-100 bg-white shrink-0">
                        <h1 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900">
                            Чаты
                        </h1>
                    </div>
                    <div className="flex-1 overflow-y-auto no-scrollbar">
                        {sidebar}
                    </div>
                </aside>

                {/* ПРАВАЯ ПАНЕЛЬ (ЧАТ) */}
                <main className="flex-1 flex flex-col bg-white h-full overflow-hidden relative min-w-0">
                    {children}
                </main>
            </div>
        </div>
    );
}
