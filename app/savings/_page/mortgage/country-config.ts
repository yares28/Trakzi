import type { CountryConfig, TaxBreakdown } from "./types"

/**
 * Spain country configuration for mortgage calculations.
 *
 * New properties: IVA 10% + AJD ~1.5% + notary/registry ~1.5% = ~13%
 * Second-hand: ITP varies by autonomous community (4-10%) + notary/registry ~1.5%
 * Annual property tax (IBI): ~0.3% of purchase price (varies by municipality;
 *   applied to cadastral value which is typically 30-50% of market value)
 */
const SPAIN_CONFIG: CountryConfig = {
  code: "ES",
  name: "Spain",
  flag: "\uD83C\uDDEA\uD83C\uDDF8",
  currency: "EUR",
  defaultRegion: "madrid",
  defaults: {
    price: 250000,
    deposit: 50000,
    termYears: 25,
    interestRate: 3.0,
    annualTaxRate: 0.3,
  },
  regions: {
    andalucia: { name: "Andaluc\u00EDa", itpRate: 7 },
    aragon: { name: "Arag\u00F3n", itpRate: 8 },
    asturias: { name: "Asturias", itpRate: 8 },
    baleares: { name: "Islas Baleares", itpRate: 8 },
    canarias: { name: "Islas Canarias", itpRate: 6.5 },
    cantabria: { name: "Cantabria", itpRate: 10 },
    castilla_la_mancha: { name: "Castilla-La Mancha", itpRate: 9 },
    castilla_y_leon: { name: "Castilla y Le\u00F3n", itpRate: 8 },
    cataluna: { name: "Catalu\u00F1a", itpRate: 10 },
    ceuta: { name: "Ceuta", itpRate: 6 },
    extremadura: { name: "Extremadura", itpRate: 8 },
    galicia: { name: "Galicia", itpRate: 9 },
    madrid: { name: "Madrid", itpRate: 6 },
    melilla: { name: "Melilla", itpRate: 6 },
    murcia: { name: "Murcia", itpRate: 8 },
    navarra: { name: "Navarra", itpRate: 6 },
    pais_vasco: { name: "Pa\u00EDs Vasco", itpRate: 4 },
    rioja: { name: "La Rioja", itpRate: 7 },
    valencia: { name: "Comunidad Valenciana", itpRate: 10 },
  },
  newPropertyTaxes: [
    { label: "IVA (VAT)", rate: 10 },
    { label: "AJD (Stamp Duty)", rate: 1.5 },
    { label: "Notary & Registry", rate: 1.5 },
  ],
  secondHandTaxes: (regionKey: string): TaxBreakdown[] => {
    const region = SPAIN_CONFIG.regions[regionKey]
    const itpRate = region?.itpRate ?? 6
    return [
      { label: "ITP (Transfer Tax)", rate: itpRate },
      { label: "Notary & Registry", rate: 1.5 },
    ]
  },
}

/** All supported country configurations, keyed by country code */
export const COUNTRY_CONFIGS: Record<string, CountryConfig> = {
  ES: SPAIN_CONFIG,
}

/** Returns the config for a given country code, defaulting to Spain */
export function getCountryConfig(code: string): CountryConfig {
  return COUNTRY_CONFIGS[code] ?? SPAIN_CONFIG
}
