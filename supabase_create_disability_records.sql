-- Migration file: Create disability_records table

CREATE TABLE public.disability_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid REFERENCES public.incidents(id) ON DELETE CASCADE,
    disability_date date NOT NULL,
    days_count integer NOT NULL,
    eps_id text,
    cie_version text CHECK (cie_version IN ('CIE-10', 'CIE-11')),
    cie_codes jsonb DEFAULT '[]'::jsonb,
    created_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id)
);

-- Habilitar RLS si es necesario pero la app parece usar Service Role keys o políticas previas
-- GRANT ALL ON public.disability_records TO authenticated, anon, service_role;
