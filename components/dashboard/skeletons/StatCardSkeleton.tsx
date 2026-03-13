"use client";

import React from "react";

export function StatCardSkeleton() {
    return (
        <div className="bg-[#1A1F2E] border border-[#1E2A3B] rounded-2xl p-6 animate-pulse">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <div className="h-3 w-20 bg-white/10 rounded mb-2" />
                    <div className="h-3 w-24 bg-white/5 rounded" />
                </div>
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10" />
            </div>
            <div className="flex items-end gap-3 mb-4">
                <div className="h-8 w-16 bg-white/10 rounded" />
                <div className="h-5 w-12 bg-white/10 rounded-full px-2 py-0.5" />
            </div>
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-white/10 rounded-full w-1/2" />
            </div>
        </div>
    );
}
