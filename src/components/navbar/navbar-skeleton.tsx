export function NavbarSkeleton() {
    return (
        <header className="sticky top-0 z-50 w-full h-20 bg-white border-b border-slate-100">
            <div className="max-w-5xl mx-auto h-full px-4 md:px-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-8 shrink-0">
                    <div className="w-24 h-6 bg-slate-50 rounded-lg animate-pulse" />
                </div>
                <div className="flex-1 max-w-sm">
                    <div className="w-full h-12 bg-slate-50 rounded-2xl animate-pulse" />
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <div className="w-24 h-10 bg-slate-50 rounded-xl animate-pulse" />
                    <div className="w-10 h-10 rounded-full bg-slate-50 animate-pulse" />
                </div>
            </div>
        </header>
    )
}
