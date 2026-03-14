import React from "react";

export function NotificationCardSkeleton() {
    return (
        <div className="w-full rounded-xl p-3 bg-[#1A1F2E] border border-[#1E2A3B] animate-pulse">
            <div className="flex items-start justify-between gap-2 mb-2.5">
                <div className="h-4 bg-[#0F1219] rounded w-32" />
                <div className="h-5 bg-[#0F1219] rounded-full w-20" />
            </div>
            <div className="h-3 bg-[#0F1219] rounded w-24 mb-3" />
            <div className="flex items-center gap-2 mt-2">
                <div className="h-5 bg-[#0F1219] rounded-full w-16" />
            </div>
        </div>
    );
}

export function NotificationListSkeleton({ count = 4 }: { count?: number }) {
    return (
        <div className="space-y-2 p-2">
            {Array.from({ length: count }).map((_, i) => (
                <NotificationCardSkeleton key={i} />
            ))}
        </div>
    );
}
