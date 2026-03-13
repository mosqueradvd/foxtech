"use client";

import React from "react";

export function TableSkeleton() {
    return (
        <>
            {[...Array(6)].map((_, i) => (
                <tr key={i} className="border-b border-[#334155] animate-pulse">
                    <td className="py-4 px-4">
                        <div className="h-4 w-32 bg-white/10 rounded mb-2" />
                        <div className="h-3 w-24 bg-white/5 rounded" />
                    </td>
                    <td className="py-4 px-4">
                        <div className="h-6 w-24 bg-white/10 rounded-full" />
                    </td>
                    <td className="py-4 px-4">
                        <div className="h-4 w-12 bg-white/5 rounded" />
                    </td>
                    <td className="py-4 px-4">
                        <div className="h-6 w-20 bg-white/10 rounded border border-white/5" />
                    </td>
                    <td className="py-4 px-4">
                        <div className="h-6 w-16 bg-white/10 rounded-full" />
                    </td>
                    <td className="py-4 px-4">
                        <div className="h-4 w-4 bg-white/5 rounded" />
                    </td>
                </tr>
            ))}
        </>
    );
}
