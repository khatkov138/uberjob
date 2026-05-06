'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';


export const OrdersSidebarHeader = memo(() => {
    return (
        <header className="px-2 space-y-2 select-none">
            <h1 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900 leading-[0.8]">
                Поиск <br />
                <span className="text-blue-600">заказов</span>
            </h1>

            <div className="flex items-center gap-2 opacity-40">
                {/* Индикатор статуса */}
                <div className="relative flex h-2 w-2">

                    <span className={cn(
                        "relative inline-flex rounded-full h-2 w-2",
                        "bg-slate-400 animate-pulse"
                    )}></span>
                </div>

                <span className="text-[8px] font-black uppercase tracking-[0.3em]">
                    Live Feed
                </span>
            </div>
        </header>
    );
});

// Задаем имя для отладки в DevTools
OrdersSidebarHeader.displayName = 'OrdersSidebarHeader';
