/**
 * lib/constants/mintrabajo-direcciones.ts
 * Direcciones Territoriales del Ministerio del Trabajo en Colombia.
 * Fuente: Mintrabajo — Directorio de Oficinas 2024.
 * Se usa para pre-llenar el destinatario de la carta de notificación.
 */

export interface DireccionTerritorial {
    readonly departamento: string;
    readonly ciudad: string;
    readonly nombreOficina: string;
}

export const DIRECCIONES_TERRITORIALES: readonly DireccionTerritorial[] = [
    { departamento: 'Amazonas', ciudad: 'Leticia', nombreOficina: 'Dirección Territorial Amazonas' },
    { departamento: 'Antioquia', ciudad: 'Medellín', nombreOficina: 'Dirección Territorial Antioquia' },
    { departamento: 'Arauca', ciudad: 'Arauca', nombreOficina: 'Dirección Territorial Arauca' },
    { departamento: 'Atlántico', ciudad: 'Barranquilla', nombreOficina: 'Dirección Territorial Atlántico' },
    { departamento: 'Bogotá D.C.', ciudad: 'Bogotá D.C.', nombreOficina: 'Dirección Territorial Cundinamarca y Bogotá D.C.' },
    { departamento: 'Bolívar', ciudad: 'Cartagena', nombreOficina: 'Dirección Territorial Bolívar' },
    { departamento: 'Boyacá', ciudad: 'Tunja', nombreOficina: 'Dirección Territorial Boyacá' },
    { departamento: 'Caldas', ciudad: 'Manizales', nombreOficina: 'Dirección Territorial Caldas' },
    { departamento: 'Caquetá', ciudad: 'Florencia', nombreOficina: 'Dirección Territorial Caquetá' },
    { departamento: 'Casanare', ciudad: 'Yopal', nombreOficina: 'Dirección Territorial Casanare' },
    { departamento: 'Cauca', ciudad: 'Popayán', nombreOficina: 'Dirección Territorial Cauca' },
    { departamento: 'Cesar', ciudad: 'Valledupar', nombreOficina: 'Dirección Territorial Cesar' },
    { departamento: 'Chocó', ciudad: 'Quibdó', nombreOficina: 'Dirección Territorial Chocó' },
    { departamento: 'Córdoba', ciudad: 'Montería', nombreOficina: 'Dirección Territorial Córdoba' },
    { departamento: 'Cundinamarca', ciudad: 'Bogotá D.C.', nombreOficina: 'Dirección Territorial Cundinamarca y Bogotá D.C.' },
    { departamento: 'Guainía', ciudad: 'Inírida', nombreOficina: 'Dirección Territorial Guainía' },
    { departamento: 'Guaviare', ciudad: 'San José del Guaviare', nombreOficina: 'Dirección Territorial Guaviare' },
    { departamento: 'Huila', ciudad: 'Neiva', nombreOficina: 'Dirección Territorial Huila' },
    { departamento: 'La Guajira', ciudad: 'Riohacha', nombreOficina: 'Dirección Territorial La Guajira' },
    { departamento: 'Magdalena', ciudad: 'Santa Marta', nombreOficina: 'Dirección Territorial Magdalena' },
    { departamento: 'Meta', ciudad: 'Villavicencio', nombreOficina: 'Dirección Territorial Meta' },
    { departamento: 'Nariño', ciudad: 'Pasto', nombreOficina: 'Dirección Territorial Nariño' },
    { departamento: 'Norte de Santander', ciudad: 'Cúcuta', nombreOficina: 'Dirección Territorial Norte de Santander' },
    { departamento: 'Putumayo', ciudad: 'Mocoa', nombreOficina: 'Dirección Territorial Putumayo' },
    { departamento: 'Quindío', ciudad: 'Armenia', nombreOficina: 'Dirección Territorial Quindío' },
    { departamento: 'Risaralda', ciudad: 'Pereira', nombreOficina: 'Dirección Territorial Risaralda' },
    { departamento: 'San Andrés', ciudad: 'San Andrés', nombreOficina: 'Dirección Territorial San Andrés y Providencia' },
    { departamento: 'Santander', ciudad: 'Bucaramanga', nombreOficina: 'Dirección Territorial Santander' },
    { departamento: 'Sucre', ciudad: 'Sincelejo', nombreOficina: 'Dirección Territorial Sucre' },
    { departamento: 'Tolima', ciudad: 'Ibagué', nombreOficina: 'Dirección Territorial Tolima' },
    { departamento: 'Valle del Cauca', ciudad: 'Cali', nombreOficina: 'Dirección Territorial Valle del Cauca' },
    { departamento: 'Vaupés', ciudad: 'Mitú', nombreOficina: 'Dirección Territorial Vaupés' },
    { departamento: 'Vichada', ciudad: 'Puerto Carreño', nombreOficina: 'Dirección Territorial Vichada' },
] as const;

/** Get the territorial office for a given department */
export function getDireccionTerritorial(departamento: string): DireccionTerritorial | undefined {
    return DIRECCIONES_TERRITORIALES.find(
        (d) => d.departamento.toLowerCase() === departamento.toLowerCase()
    );
}
