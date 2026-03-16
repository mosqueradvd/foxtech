"use client";

import { useState, useEffect } from "react";
import { supabase, type Company } from "@/lib/supabase";

export function useActiveCompany() {
    const [activeCompany, setActiveCompany] = useState<Company | null>(null);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);

    const loadCompanies = async () => {
        setLoading(true);
        // Load all companies
        const { data, error } = await supabase
            .from("companies")
            .select("*")
            .order("razon_social", { ascending: true });

        if (!error && data) {
            setCompanies(data as Company[]);
            
            const savedId = localStorage.getItem("foxtech_active_company_id");
            if (savedId) {
                const found = data.find(c => c.id === savedId);
                if (found) {
                    setActiveCompany(found as Company);
                } else if (data.length > 0) {
                    setActiveCompany(data[0] as Company);
                    localStorage.setItem("foxtech_active_company_id", data[0].id);
                }
            } else if (data.length > 0) {
                setActiveCompany(data[0] as Company);
                localStorage.setItem("foxtech_active_company_id", data[0].id);
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        loadCompanies();

        // Listen for changes from other components (like the /companies page)
        const handleCompanyChange = () => {
            loadCompanies();
        };

        window.addEventListener("foxtech_company_changed", handleCompanyChange);
        return () => window.removeEventListener("foxtech_company_changed", handleCompanyChange);
    }, []);

    const changeActiveCompany = (id: string) => {
        const found = companies.find(c => c.id === id);
        if (found) {
            setActiveCompany(found);
            localStorage.setItem("foxtech_active_company_id", id);
            window.dispatchEvent(new Event("foxtech_company_changed"));
        }
    };

    return { activeCompany, companies, loading, changeActiveCompany };
}
