import type { LanguageRule, LanguageRuleSet } from "./types"

const ACCOUNT_TERMS: LanguageRule[] = [
  { pattern: /\bextracto\b/, weight: 3 },
  { pattern: /\bestado\s+de\s+cuenta\b/, weight: 4 },
  { pattern: /\bcuenta\b/, weight: 2 },
  { pattern: /\bnumero\s+de\s+cuenta\b/, weight: 3 },
  { pattern: /\bcuenta\s+corriente\b/, weight: 3 },
  { pattern: /\bcuenta\s+ahorro\b/, weight: 3 },
  { pattern: /\btitular\b/, weight: 2 },
  { pattern: /\btitularidad\b/, weight: 2 },
  { pattern: /\bsucursal\b/, weight: 2 },
  { pattern: /\boficina\b/, weight: 2 },
  { pattern: /\bentidad\b/, weight: 2 },
  { pattern: /\bbanco\b/, weight: 2 },
  { pattern: /\bsaldo\s+inicial\b/, weight: 3 },
  { pattern: /\bsaldo\s+final\b/, weight: 3 },
  { pattern: /\bsaldo\s+disponible\b/, weight: 3 },
  { pattern: /\bsaldo\s+anterior\b/, weight: 3 },
  { pattern: /\bsaldo\s+actual\b/, weight: 3 },
  { pattern: /\bsaldo\s+contable\b/, weight: 3 },
  { pattern: /\bsaldo\b/, weight: 2 },
  { pattern: /\biban\b/, weight: 2 },
  { pattern: /\bbic\b/, weight: 2 },
  { pattern: /\bswift\b/, weight: 2 },
  { pattern: /\bsepa\b/, weight: 2 },
  { pattern: /\bnif\b/, weight: 2 },
  { pattern: /\bcif\b/, weight: 2 },
]

const HEADER_TERMS: LanguageRule[] = [
  { pattern: /\bmovimiento(?:s)?\b/, weight: 2 },
  { pattern: /\boperacion(?:es)?\b/, weight: 2 },
  { pattern: /\bfecha\s+valor\b/, weight: 3 },
  { pattern: /\bfecha\s+operacion\b/, weight: 3 },
  { pattern: /\bfecha\s+de\s+operacion\b/, weight: 3 },
  { pattern: /\bfecha\s+de\s+cargo\b/, weight: 3 },
  { pattern: /\bfecha\s+de\s+abono\b/, weight: 3 },
  { pattern: /\bconcepto\b/, weight: 2 },
  { pattern: /\bdescripcion\b/, weight: 2 },
  { pattern: /\bdetalle(?:s)?\b/, weight: 2 },
  { pattern: /\breferencia\b/, weight: 2 },
  { pattern: /\bimporte\b/, weight: 2 },
  { pattern: /\bmoneda\b/, weight: 2 },
  { pattern: /\bcomercio\b/, weight: 2 },
  { pattern: /\bbeneficiario\b/, weight: 2 },
  { pattern: /\bordenante\b/, weight: 2 },
  { pattern: /\btipo\b/, weight: 1 },
  { pattern: /\bcategoria\b/, weight: 1 },
  { pattern: /\bfecha\b/, weight: 1 },
]

const TRANSFER_TERMS: LanguageRule[] = [
  { pattern: /\btransferencia\b/, weight: 2 },
  { pattern: /\btraspaso\b/, weight: 2 },
  { pattern: /\borden\s+de\s+pago\b/, weight: 3 },
  { pattern: /\borden\s+permanente\b/, weight: 3 },
  { pattern: /\bsepa\b/, weight: 2 },
  { pattern: /\bbizum\b/, weight: 2 },
]

const PAYMENT_TERMS: LanguageRule[] = [
  { pattern: /\bdebito\b/, weight: 2 },
  { pattern: /\bcredito\b/, weight: 2 },
  { pattern: /\babono\b/, weight: 2 },
  { pattern: /\bcargo\b/, weight: 2 },
  { pattern: /\bingreso\b/, weight: 2 },
  { pattern: /\bretiro\b/, weight: 2 },
  { pattern: /\bretirada\b/, weight: 2 },
  { pattern: /\breintegro\b/, weight: 2 },
  { pattern: /\bpago\b/, weight: 2 },
  { pattern: /\bcompra\b/, weight: 2 },
  { pattern: /\bdevolucion\b/, weight: 2 },
  { pattern: /\breembolso\b/, weight: 2 },
  { pattern: /\bcomision(?:es)?\b/, weight: 2 },
  { pattern: /\binteres(?:es)?\b/, weight: 2 },
  { pattern: /\bcuota\b/, weight: 2 },
  { pattern: /\bmantenimiento\b/, weight: 2 },
  { pattern: /\bdomiciliacion\b/, weight: 2 },
  { pattern: /\bdomiciliado\b/, weight: 2 },
  { pattern: /\brecibo\b/, weight: 2 },
  { pattern: /\btarjeta\b/, weight: 2 },
  { pattern: /\befectivo\b/, weight: 2 },
  { pattern: /\bcajero\b/, weight: 2 },
  { pattern: /\bcontactless\b/, weight: 1 },
  { pattern: /\bpos\b/, weight: 1 },
]

const FEE_TERMS: LanguageRule[] = [
  { pattern: /\bcomision\b/, weight: 2 },
  { pattern: /\bcomisiones\b/, weight: 2 },
  { pattern: /\bcuota\b/, weight: 2 },
  { pattern: /\btasa\b/, weight: 2 },
  { pattern: /\bgastos\b/, weight: 2 },
  { pattern: /\bgastos\s+bancarios\b/, weight: 3 },
  { pattern: /\bmantenimiento\b/, weight: 2 },
]

const INCOME_TERMS: LanguageRule[] = [
  { pattern: /\bnomina\b/, weight: 3 },
  { pattern: /\bingreso\s+nomina\b/, weight: 3 },
  { pattern: /\bsueldo\b/, weight: 2 },
  { pattern: /\bsalario\b/, weight: 2 },
  { pattern: /\bpension\b/, weight: 2 },
  { pattern: /\bsubsidio\b/, weight: 2 },
  { pattern: /\bayuda\b/, weight: 2 },
  { pattern: /\bdividendo(?:s)?\b/, weight: 2 },
  { pattern: /\binteres(?:es)?\b/, weight: 2 },
]

const LOAN_TERMS: LanguageRule[] = [
  { pattern: /\bprestamo\b/, weight: 2 },
  { pattern: /\bhipoteca\b/, weight: 2 },
  { pattern: /\bcuota\b/, weight: 1 },
  { pattern: /\bamortizacion\b/, weight: 2 },
  { pattern: /\binteres\b/, weight: 1 },
]

const REFUND_TERMS: LanguageRule[] = [
  { pattern: /\bdevolucion\b/, weight: 2 },
  { pattern: /\breembolso\b/, weight: 2 },
  { pattern: /\breintegro\b/, weight: 2 },
]

const SAVINGS_TERMS: LanguageRule[] = [
  { pattern: /\bahorro\b/, weight: 2 },
  { pattern: /\bdeposito\b/, weight: 1 },
]

const INVESTMENT_TERMS: LanguageRule[] = [
  { pattern: /\binversion\b/, weight: 2 },
  { pattern: /\binvertir\b/, weight: 2 },
  { pattern: /\bacciones\b/, weight: 2 },
  { pattern: /\bbolsa\b/, weight: 2 },
  { pattern: /\bfondo\b/, weight: 1 },
  { pattern: /\bcrypto\b/, weight: 1 },
]

const INSURANCE_TERMS: LanguageRule[] = [
  { pattern: /\bseguro\b/, weight: 2 },
  { pattern: /\bpoliza\b/, weight: 2 },
  { pattern: /\bprima\b/, weight: 2 },
]

const TAX_TERMS: LanguageRule[] = [
  { pattern: /\bimpuesto\b/, weight: 2 },
  { pattern: /\bimpuestos\b/, weight: 2 },
  { pattern: /\biva\b/, weight: 2 },
  { pattern: /\btasa\b/, weight: 1 },
  { pattern: /\bmulta\b/, weight: 1 },
]

const GROCERY_TERMS: LanguageRule[] = [
  { pattern: /\bsupermercado\b/, weight: 2 },
  { pattern: /\bhipermercado\b/, weight: 2 },
  { pattern: /\balimentacion\b/, weight: 2 },
  { pattern: /\bmercado\b/, weight: 1 },
  { pattern: /\bfruteria\b/, weight: 1 },
  { pattern: /\bcarniceria\b/, weight: 1 },
  { pattern: /\bpescaderia\b/, weight: 1 },
  { pattern: /\bpanaderia\b/, weight: 1 },
  { pattern: /\bcharcuteria\b/, weight: 1 },
]

const DINING_TERMS: LanguageRule[] = [
  { pattern: /\brestaurante\b/, weight: 1 },
  { pattern: /\bbar\b/, weight: 1 },
  { pattern: /\bcafeteria\b/, weight: 1 },
  { pattern: /\bcerveceria\b/, weight: 1 },
  { pattern: /\btapas\b/, weight: 1 },
  { pattern: /\bpizzeria\b/, weight: 1 },
  { pattern: /\bkebab\b/, weight: 1 },
  { pattern: /\bhamburgueseria\b/, weight: 1 },
]

const COFFEE_TERMS: LanguageRule[] = [
  { pattern: /\bcafe\b/, weight: 1 },
  { pattern: /\bcapuccino\b/, weight: 1 },
  { pattern: /\blatte\b/, weight: 1 },
  { pattern: /\bespresso\b/, weight: 1 },
]

const BAR_TERMS: LanguageRule[] = [
  { pattern: /\bbar\b/, weight: 1 },
  { pattern: /\bpub\b/, weight: 1 },
  { pattern: /\bdiscoteca\b/, weight: 1 },
  { pattern: /\bcopas\b/, weight: 1 },
  { pattern: /\bcoctel\b/, weight: 1 },
]

const DELIVERY_TERMS: LanguageRule[] = [
  { pattern: /\bdelivery\b/, weight: 1 },
  { pattern: /\ba\s+domicilio\b/, weight: 1 },
  { pattern: /\bpara\s+llevar\b/, weight: 1 },
  { pattern: /\bcomida\s+a\s+domicilio\b/, weight: 1 },
]

const HOUSING_TERMS: LanguageRule[] = [
  { pattern: /\balquiler\b/, weight: 2 },
  { pattern: /\brenta\b/, weight: 2 },
  { pattern: /\barrendamiento\b/, weight: 2 },
  { pattern: /\bhipoteca\b/, weight: 2 },
]

const HOME_MAINTENANCE_TERMS: LanguageRule[] = [
  { pattern: /\breparacion\b/, weight: 1 },
  { pattern: /\bmantenimiento\b/, weight: 1 },
  { pattern: /\bfontanero\b/, weight: 1 },
  { pattern: /\belectricista\b/, weight: 1 },
  { pattern: /\bpintura\b/, weight: 1 },
  { pattern: /\breforma\b/, weight: 1 },
]

const HOME_SUPPLIES_TERMS: LanguageRule[] = [
  { pattern: /\bferreteria\b/, weight: 1 },
  { pattern: /\bbricolaje\b/, weight: 1 },
  { pattern: /\bherramientas\b/, weight: 1 },
  { pattern: /\bmateriales\b/, weight: 1 },
]

const UTILITY_TERMS: LanguageRule[] = [
  { pattern: /\belectricidad\b/, weight: 2 },
  { pattern: /\bluz\b/, weight: 2 },
  { pattern: /\benergia\b/, weight: 2 },
  { pattern: /\bgas\b/, weight: 1 },
  { pattern: /\bagua\b/, weight: 2 },
  { pattern: /\binternet\b/, weight: 2 },
  { pattern: /\bfibra\b/, weight: 2 },
  { pattern: /\bmovil\b/, weight: 2 },
  { pattern: /\btelefono\b/, weight: 2 },
  { pattern: /\btelecom\b/, weight: 1 },
]

const TRANSPORT_TERMS: LanguageRule[] = [
  { pattern: /\btransporte\b/, weight: 1 },
  { pattern: /\bautobus\b/, weight: 1 },
  { pattern: /\btranvia\b/, weight: 1 },
  { pattern: /\bmetro\b/, weight: 1 },
  { pattern: /\btren\b/, weight: 1 },
  { pattern: /\btaxi\b/, weight: 1 },
  { pattern: /\bparking\b/, weight: 1 },
  { pattern: /\baparcamiento\b/, weight: 1 },
  { pattern: /\bpeaje\b/, weight: 1 },
  { pattern: /\bautopista\b/, weight: 1 },
]

const FUEL_TERMS: LanguageRule[] = [
  { pattern: /\bgasolinera\b/, weight: 2 },
  { pattern: /\bcombustible\b/, weight: 2 },
  { pattern: /\bgasoil\b/, weight: 2 },
  { pattern: /\bdiesel\b/, weight: 1 },
  { pattern: /\bgasolina\b/, weight: 2 },
]

const HEALTH_TERMS: LanguageRule[] = [
  { pattern: /\bfarmacia\b/, weight: 2 },
  { pattern: /\bclinica\b/, weight: 2 },
  { pattern: /\bhospital\b/, weight: 2 },
  { pattern: /\bmedico\b/, weight: 2 },
  { pattern: /\bdentista\b/, weight: 2 },
  { pattern: /\bsalud\b/, weight: 1 },
]

const FITNESS_TERMS: LanguageRule[] = [
  { pattern: /\bgimnasio\b/, weight: 1 },
  { pattern: /\bfitness\b/, weight: 1 },
  { pattern: /\byoga\b/, weight: 1 },
  { pattern: /\bpilates\b/, weight: 1 },
]

const SHOPPING_TERMS: LanguageRule[] = [
  { pattern: /\bropa\b/, weight: 1 },
  { pattern: /\bcalzado\b/, weight: 1 },
  { pattern: /\bmoda\b/, weight: 1 },
  { pattern: /\btienda\b/, weight: 1 },
  { pattern: /\bcompras\b/, weight: 1 },
  { pattern: /\belectronica\b/, weight: 1 },
  { pattern: /\belectrodomesticos\b/, weight: 1 },
  { pattern: /\bmuebles\b/, weight: 1 },
  { pattern: /\bhogar\b/, weight: 1 },
  { pattern: /\bregalo\b/, weight: 1 },
  { pattern: /\bregalos\b/, weight: 1 },
]

const ENTERTAINMENT_TERMS: LanguageRule[] = [
  { pattern: /\bocio\b/, weight: 1 },
  { pattern: /\bcine\b/, weight: 1 },
  { pattern: /\bconcierto\b/, weight: 1 },
  { pattern: /\bfestival\b/, weight: 1 },
  { pattern: /\bteatro\b/, weight: 1 },
  { pattern: /\bentretenimiento\b/, weight: 1 },
  { pattern: /\bjuego\b/, weight: 1 },
  { pattern: /\bvideojuego\b/, weight: 1 },
]

const EDUCATION_TERMS: LanguageRule[] = [
  { pattern: /\beducacion\b/, weight: 1 },
  { pattern: /\bescuela\b/, weight: 1 },
  { pattern: /\bcolegio\b/, weight: 1 },
  { pattern: /\buniversidad\b/, weight: 1 },
  { pattern: /\bcurso\b/, weight: 1 },
  { pattern: /\bclase\b/, weight: 1 },
  { pattern: /\bformacion\b/, weight: 1 },
  { pattern: /\bacademia\b/, weight: 1 },
  { pattern: /\bmatricula\b/, weight: 1 },
]

const TRAVEL_TERMS: LanguageRule[] = [
  { pattern: /\bviaje\b/, weight: 1 },
  { pattern: /\bhotel\b/, weight: 1 },
  { pattern: /\bhostal\b/, weight: 1 },
  { pattern: /\bvuelo\b/, weight: 1 },
  { pattern: /\baerolinea\b/, weight: 2 },
  { pattern: /\breserva\b/, weight: 1 },
  { pattern: /\bturismo\b/, weight: 1 },
  { pattern: /\balquiler\s+coche\b/, weight: 1 },
]

const SERVICES_TERMS: LanguageRule[] = [
  { pattern: /\bservicio\b/, weight: 1 },
  { pattern: /\bservicios\b/, weight: 1 },
  { pattern: /\blavanderia\b/, weight: 1 },
  { pattern: /\blimpieza\b/, weight: 1 },
  { pattern: /\bpeluqueria\b/, weight: 1 },
  { pattern: /\bbarberia\b/, weight: 1 },
  { pattern: /\bconsultoria\b/, weight: 1 },
  { pattern: /\bgestoria\b/, weight: 1 },
  { pattern: /\bnotaria\b/, weight: 1 },
  { pattern: /\babogado\b/, weight: 1 },
]

const AUTO_SERVICE_TERMS: LanguageRule[] = [
  { pattern: /\btaller\b/, weight: 1 },
  { pattern: /\bmecanico\b/, weight: 1 },
  { pattern: /\breparacion\s+auto\b/, weight: 1 },
  { pattern: /\breparacion\s+coche\b/, weight: 1 },
  { pattern: /\bservicio\s+auto\b/, weight: 1 },
  { pattern: /\bcambio\s+de\s+aceite\b/, weight: 1 },
  { pattern: /\blavado\b/, weight: 1 },
  { pattern: /\blavado\s+auto\b/, weight: 1 },
  { pattern: /\bneumatico\b/, weight: 1 },
  { pattern: /\bgrua\b/, weight: 1 },
]

const PERSONAL_CARE_TERMS: LanguageRule[] = [
  { pattern: /\bspa\b/, weight: 1 },
  { pattern: /\bmasaje\b/, weight: 1 },
  { pattern: /\bmanicura\b/, weight: 1 },
  { pattern: /\bpedicura\b/, weight: 1 },
  { pattern: /\bestetica\b/, weight: 1 },
  { pattern: /\bcosmetica\b/, weight: 1 },
  { pattern: /\bbelleza\b/, weight: 1 },
  { pattern: /\bcentro\s+estetico\b/, weight: 1 },
  { pattern: /\bsalon\s+de\s+belleza\b/, weight: 1 },
]

const PET_TERMS: LanguageRule[] = [
  { pattern: /\bmascota\b/, weight: 1 },
  { pattern: /\bmascotas\b/, weight: 1 },
  { pattern: /\bveterinario\b/, weight: 1 },
  { pattern: /\bveterinaria\b/, weight: 1 },
  { pattern: /\bpeluqueria\s+canina\b/, weight: 1 },
  { pattern: /\bguarderia\s+canina\b/, weight: 1 },
  { pattern: /\btienda\s+de\s+mascotas\b/, weight: 1 },
]

const CHILDCARE_TERMS: LanguageRule[] = [
  { pattern: /\bguarderia\b/, weight: 1 },
  { pattern: /\bguarderia\s+infantil\b/, weight: 1 },
  { pattern: /\bjardin\s+de\s+infancia\b/, weight: 1 },
  { pattern: /\bninera\b/, weight: 1 },
  { pattern: /\bcuidador\b/, weight: 1 },
  { pattern: /\bcuidadora\b/, weight: 1 },
]

const SUBSCRIPTION_TERMS: LanguageRule[] = [
  { pattern: /\bsuscripcion\b/, weight: 2 },
  { pattern: /\bsubscripcion\b/, weight: 2 },
  { pattern: /\bmembresia\b/, weight: 2 },
  { pattern: /\bmensualidad\b/, weight: 1 },
]

const MONTH_TERMS: LanguageRule[] = [
  { pattern: /\benero\b/, weight: 1 },
  { pattern: /\bfebrero\b/, weight: 1 },
  { pattern: /\bmarzo\b/, weight: 1 },
  { pattern: /\babril\b/, weight: 1 },
  { pattern: /\bmayo\b/, weight: 1 },
  { pattern: /\bjunio\b/, weight: 1 },
  { pattern: /\bjulio\b/, weight: 1 },
  { pattern: /\bagosto\b/, weight: 1 },
  { pattern: /\bseptiembre\b/, weight: 1 },
  { pattern: /\boctubre\b/, weight: 1 },
  { pattern: /\bnoviembre\b/, weight: 1 },
  { pattern: /\bdiciembre\b/, weight: 1 },
]

const DAY_TERMS: LanguageRule[] = [
  { pattern: /\blunes\b/, weight: 1 },
  { pattern: /\bmartes\b/, weight: 1 },
  { pattern: /\bmiercoles\b/, weight: 1 },
  { pattern: /\bjueves\b/, weight: 1 },
  { pattern: /\bviernes\b/, weight: 1 },
  { pattern: /\bsabado\b/, weight: 1 },
  { pattern: /\bdomingo\b/, weight: 1 },
]

export const ES_RULES: LanguageRuleSet = {
  locale: "es",
  minScore: 4,
  minMatches: 2,
  patterns: [
    ...ACCOUNT_TERMS,
    ...HEADER_TERMS,
    ...TRANSFER_TERMS,
    ...PAYMENT_TERMS,
    ...FEE_TERMS,
    ...INCOME_TERMS,
    ...LOAN_TERMS,
    ...REFUND_TERMS,
    ...SAVINGS_TERMS,
    ...INVESTMENT_TERMS,
    ...INSURANCE_TERMS,
    ...TAX_TERMS,
    ...GROCERY_TERMS,
    ...DINING_TERMS,
    ...COFFEE_TERMS,
    ...BAR_TERMS,
    ...DELIVERY_TERMS,
    ...HOUSING_TERMS,
    ...HOME_MAINTENANCE_TERMS,
    ...HOME_SUPPLIES_TERMS,
    ...UTILITY_TERMS,
    ...TRANSPORT_TERMS,
    ...FUEL_TERMS,
    ...HEALTH_TERMS,
    ...FITNESS_TERMS,
    ...SHOPPING_TERMS,
    ...ENTERTAINMENT_TERMS,
    ...EDUCATION_TERMS,
    ...TRAVEL_TERMS,
    ...SERVICES_TERMS,
    ...AUTO_SERVICE_TERMS,
    ...PERSONAL_CARE_TERMS,
    ...PET_TERMS,
    ...CHILDCARE_TERMS,
    ...SUBSCRIPTION_TERMS,
    ...MONTH_TERMS,
    ...DAY_TERMS,
  ],
}

