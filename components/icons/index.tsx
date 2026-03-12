/**
 * components/icons/index.tsx
 * Barrel exports for all GTC-45 hazard icons.
 * Each icon accepts a `color` prop:
 *   "red"     → tinted #EF4444 (for the #1 / crítico hazard)
 *   "neutral" → tinted #94A3B8 (for the rest)
 *
 * CSS filter values generated with https://codepen.io/sosuke/pen/Pjoqqp
 */
import React from "react";

// ── Lazy-import the raw SVG components from public/icons ──────────────────────
// We use require() here so Next.js does NOT attempt to statically analyze
// the data-URL inside the JSX files during type checking.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const RawPhysical = require("../../public/icons/physical.jsx").default;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const RawChemical = require("../../public/icons/chemical.jsx").default;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const RawBiological = require("../../public/icons/biological.jsx").default;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const RawErgonomic = require("../../public/icons/ergonomical.jsx").default;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const RawPsychosocial = require("../../public/icons/psychosocial.jsx").default;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const RawSecurity = require("../../public/icons/security.jsx").default;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const RawElectric = require("../../public/icons/electric.jsx").default;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const RawLocative = require("../../public/icons/locative.jsx").default;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const RawMechanic = require("../../public/icons/mechanic.jsx").default;

// ── CSS filter values ─────────────────────────────────────────────────────────
const FILTERS = {
    red: "brightness(0) saturate(100%) invert(27%) sepia(99%) saturate(2060%) hue-rotate(339deg) brightness(104%) contrast(97%)",
    amber: "brightness(0) saturate(100%) invert(67%) sepia(93%) saturate(1352%) hue-rotate(5deg) brightness(101%) contrast(93%)",
    neutral: "brightness(0) saturate(100%) invert(70%) sepia(10%) saturate(500%) hue-rotate(180deg) brightness(90%) contrast(80%)",
    muted: "brightness(0) saturate(100%) invert(40%) sepia(10%) saturate(500%) hue-rotate(180deg) brightness(70%) contrast(90%)",
};

export type HazardIconColor = "red" | "amber" | "neutral" | "muted";

interface HazardIconProps {
    color?: HazardIconColor;
    /** Width and height in px (square). Default 40 */
    size?: number;
    className?: string;
}

function makeIcon(RawIcon: React.ComponentType<React.SVGProps<SVGSVGElement>>) {
    return function HazardIcon({ color = "neutral", size = 40, className }: HazardIconProps) {
        return (
            <div
                className={className}
                style={{
                    width: size,
                    height: size,
                    flex: "none",
                    filter: FILTERS[color],
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <RawIcon width={size} height={size} style={{ display: "block" }} />
            </div>
        );
    };
}

export const PhysicalIcon = makeIcon(RawPhysical);
export const ChemicalIcon = makeIcon(RawChemical);
export const BiologicalIcon = makeIcon(RawBiological);
export const ErgonomicIcon = makeIcon(RawErgonomic);
export const PsychosocialIcon = makeIcon(RawPsychosocial);
export const SecurityIcon = makeIcon(RawSecurity);
export const ElectricIcon = makeIcon(RawElectric);
export const LocativeIcon = makeIcon(RawLocative);
export const MechanicIcon = makeIcon(RawMechanic);
