"use client";

import React from "react";

export function InspectionCardSkeleton() {
    return (
        <div className="w-full bg-[#1A1F2E] border border-[#1E2A3B] rounded-2xl p-6 flex items-center gap-6 animate-pulse">
            {/* Icon placeholder */}
            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex-shrink-0" />
            
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                    <div className="h-4 w-40 bg-white/10 rounded" />
                    <div className="h-5 w-16 bg-white/5 rounded-full" />
                </div>
                <div className="h-3 w-64 bg-white/5 rounded" />
            </div>
            
            <div className="flex items-center gap-3 flex-shrink-0">
                <div className="h-8 w-14 bg-white/10 rounded-lg" />
                <div className="w-4 h-4 bg-white/5 rounded" />
            </div>
        </div>
    );
}

export function InspectionListSkeleton() {
    return (
        <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
                <InspectionCardSkeleton key={i} />
            ))}
        </div>
    );
}
