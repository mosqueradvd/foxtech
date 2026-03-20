"use client";

export function StatCardSkeleton() {
    return (
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-6 animate-pulse shadow-md dark:shadow-[0_2px_10px_rgba(0,0,0,0.1)]">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <div className="h-4 w-20 bg-slate-300 dark:bg-white/20 rounded mb-2" />
                    <div className="h-3 w-24 bg-slate-200 dark:bg-white/10 rounded" />
                </div>
                <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-white/10 border border-[var(--border)]" />
            </div>
            <div className="flex items-end gap-3 mb-4">
                <div className="h-8 w-16 bg-slate-300 dark:bg-white/20 rounded" />
                <div className="h-5 w-12 bg-slate-200 dark:bg-white/10 rounded-full" />
            </div>
        </div>
    );
}

export default StatCardSkeleton;
