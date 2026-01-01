import type { LanguageRule, LanguageRuleSet } from "./types"

const ACCOUNT_TERMS: LanguageRule[] = [
  { pattern: /\bextracte\b/, weight: 3 },
  { pattern: /\bextracte\s+bancari\b/, weight: 4 },
  { pattern: /\bestat\s+de\s+compte\b/, weight: 4 },
  { pattern: /\bcompte\b/, weight: 2 },
  { pattern: /\bnumero\s+de\s+compte\b/, weight: 3 },
  { pattern: /\bcompte\s+corrent\b/, weight: 3 },
  { pattern: /\bcompte\s+estalvi\b/, weight: 3 },
  { pattern: /\bcompte\s+d\s+estalvi\b/, weight: 3 },
  { pattern: /\bcompte\s+conjunt\b/, weight: 3 },
  { pattern: /\bcompte\s+a\s+termini\b/, weight: 3 },
  { pattern: /\btitular\b/, weight: 2 },
  { pattern: /\btitularitat\b/, weight: 2 },
  { pattern: /\boficina\b/, weight: 2 },
  { pattern: /\bsucursal\b/, weight: 2 },
  { pattern: /\bentitat\b/, weight: 2 },
  { pattern: /\bbanc\b/, weight: 2 },
  { pattern: /\bbanca\b/, weight: 2 },
  { pattern: /\biban\b/, weight: 2 },
  { pattern: /\bbic\b/, weight: 2 },
  { pattern: /\bswift\b/, weight: 2 },
  { pattern: /\bcodi\s+banc\b/, weight: 2 },
  { pattern: /\bcodi\s+oficina\b/, weight: 2 },
  { pattern: /\bclient\b/, weight: 1 },
  { pattern: /\bidentificador\b/, weight: 1 },
]

const BALANCE_TERMS: LanguageRule[] = [
  { pattern: /\bsaldo\s+inicial\b/, weight: 3 },
  { pattern: /\bsaldo\s+final\b/, weight: 3 },
  { pattern: /\bsaldo\s+disponible\b/, weight: 3 },
  { pattern: /\bsaldo\s+actual\b/, weight: 3 },
  { pattern: /\bsaldo\s+anterior\b/, weight: 3 },
  { pattern: /\bsaldo\s+comptable\b/, weight: 3 },
  { pattern: /\bsaldo\s+creditor\b/, weight: 3 },
  { pattern: /\bsaldo\s+deutor\b/, weight: 3 },
  { pattern: /\bsaldo\s+pendent\b/, weight: 2 },
  { pattern: /\bsaldo\b/, weight: 1 },
  { pattern: /\bdescobert\b/, weight: 2 },
  { pattern: /\bdescobert\s+autoritzat\b/, weight: 3 },
  { pattern: /\blimit\s+de\s+credit\b/, weight: 2 },
  { pattern: /\bcredit\s+disponible\b/, weight: 2 },
  { pattern: /\bsaldo\s+a\s+favor\b/, weight: 2 },
]

const HEADER_TERMS: LanguageRule[] = [
  { pattern: /\bmoviment\b/, weight: 2 },
  { pattern: /\bmoviments\b/, weight: 2 },
  { pattern: /\boperacio\b/, weight: 2 },
  { pattern: /\boperacions\b/, weight: 2 },
  { pattern: /\bdata\s+valor\b/, weight: 3 },
  { pattern: /\bdata\s+operacio\b/, weight: 3 },
  { pattern: /\bdata\s+de\s+carrec\b/, weight: 3 },
  { pattern: /\bdata\s+de\s+abonament\b/, weight: 3 },
  { pattern: /\bconcepte\b/, weight: 2 },
  { pattern: /\bdescripcio\b/, weight: 2 },
  { pattern: /\bdetall\b/, weight: 2 },
  { pattern: /\breferencia\b/, weight: 2 },
  { pattern: /\bimport\b/, weight: 2 },
  { pattern: /\bmoneda\b/, weight: 2 },
  { pattern: /\bcomerc\b/, weight: 2 },
  { pattern: /\bbeneficiari\b/, weight: 2 },
  { pattern: /\bordenant\b/, weight: 2 },
  { pattern: /\btipus\b/, weight: 1 },
  { pattern: /\bcategoria\b/, weight: 1 },
  { pattern: /\bdata\b/, weight: 1 },
  { pattern: /\bsaldo\b/, weight: 1 },
]

const TRANSFER_TERMS: LanguageRule[] = [
  { pattern: /\btransferencia\b/, weight: 2 },
  { pattern: /\btraspas\b/, weight: 2 },
  { pattern: /\bordre\s+de\s+pagament\b/, weight: 3 },
  { pattern: /\bordre\s+permanent\b/, weight: 3 },
  { pattern: /\bdomiciliacio\b/, weight: 2 },
  { pattern: /\bdomiciliat\b/, weight: 2 },
  { pattern: /\bsepa\b/, weight: 2 },
  { pattern: /\bbizum\b/, weight: 2 },
  { pattern: /\bgir\b/, weight: 1 },
]

const PAYMENT_TERMS: LanguageRule[] = [
  { pattern: /\bdebit\b/, weight: 2 },
  { pattern: /\bcredit\b/, weight: 2 },
  { pattern: /\babonament\b/, weight: 2 },
  { pattern: /\bcarrec\b/, weight: 2 },
  { pattern: /\bingres\b/, weight: 2 },
  { pattern: /\bingressos\b/, weight: 2 },
  { pattern: /\bretirada\b/, weight: 2 },
  { pattern: /\breintegrament\b/, weight: 2 },
  { pattern: /\bpagament\b/, weight: 2 },
  { pattern: /\bcompra\b/, weight: 2 },
  { pattern: /\bdevolucio\b/, weight: 2 },
  { pattern: /\breemborsament\b/, weight: 2 },
  { pattern: /\bcomissio\b/, weight: 2 },
  { pattern: /\binteres\b/, weight: 2 },
  { pattern: /\bquota\b/, weight: 2 },
  { pattern: /\bmanteniment\b/, weight: 2 },
  { pattern: /\bdomiciliacio\b/, weight: 2 },
  { pattern: /\brebut\b/, weight: 2 },
  { pattern: /\btargeta\b/, weight: 2 },
  { pattern: /\befectiu\b/, weight: 2 },
  { pattern: /\bcaixer\b/, weight: 2 },
  { pattern: /\bcontactless\b/, weight: 1 },
  { pattern: /\bpos\b/, weight: 1 },
  { pattern: /\bpagament\s+amb\s+targeta\b/, weight: 3 },
  { pattern: /\bautoritzacio\b/, weight: 2 },
  { pattern: /\bfactura\b/, weight: 2 },
]

const CARD_TERMS: LanguageRule[] = [
  { pattern: /\btargeta\s+de\s+credit\b/, weight: 2 },
  { pattern: /\btargeta\s+de\s+debit\b/, weight: 2 },
  { pattern: /\bnumero\s+de\s+targeta\b/, weight: 2 },
  { pattern: /\btitular\s+targeta\b/, weight: 2 },
  { pattern: /\bcaducitat\b/, weight: 1 },
  { pattern: /\btargeta\b/, weight: 1 },
]

const FEE_TERMS: LanguageRule[] = [
  { pattern: /\bcomissio\b/, weight: 2 },
  { pattern: /\bcomissions\b/, weight: 2 },
  { pattern: /\bquota\b/, weight: 2 },
  { pattern: /\btaxa\b/, weight: 2 },
  { pattern: /\bdespeses\b/, weight: 2 },
  { pattern: /\bdespeses\s+bancaries\b/, weight: 3 },
  { pattern: /\bmanteniment\b/, weight: 2 },
  { pattern: /\bpenalitzacio\b/, weight: 2 },
  { pattern: /\brecarrec\b/, weight: 2 },
  { pattern: /\brecuperacio\b/, weight: 1 },
]

const INCOME_TERMS: LanguageRule[] = [
  { pattern: /\bnomina\b/, weight: 3 },
  { pattern: /\bsou\b/, weight: 2 },
  { pattern: /\bsalari\b/, weight: 2 },
  { pattern: /\bpensio\b/, weight: 2 },
  { pattern: /\bprestacio\b/, weight: 2 },
  { pattern: /\bsubsidis\b/, weight: 2 },
  { pattern: /\bajut\b/, weight: 2 },
  { pattern: /\bajuda\b/, weight: 2 },
  { pattern: /\bdividend\b/, weight: 2 },
  { pattern: /\binteres\b/, weight: 1 },
  { pattern: /\bingres\b/, weight: 2 },
  { pattern: /\bbeca\b/, weight: 2 },
]

const LOAN_TERMS: LanguageRule[] = [
  { pattern: /\bprestec\b/, weight: 2 },
  { pattern: /\bhipoteca\b/, weight: 2 },
  { pattern: /\bcredit\b/, weight: 2 },
  { pattern: /\bquota\b/, weight: 1 },
  { pattern: /\bamortitzacio\b/, weight: 2 },
  { pattern: /\binteres\b/, weight: 1 },
  { pattern: /\bcapital\b/, weight: 1 },
  { pattern: /\btermini\b/, weight: 1 },
]

const REFUND_TERMS: LanguageRule[] = [
  { pattern: /\bdevolucio\b/, weight: 2 },
  { pattern: /\breemborsament\b/, weight: 2 },
  { pattern: /\breintegrament\b/, weight: 2 },
  { pattern: /\babonament\b/, weight: 2 },
  { pattern: /\bretorn\b/, weight: 1 },
  { pattern: /\banulacio\b/, weight: 2 },
]

const SAVINGS_TERMS: LanguageRule[] = [
  { pattern: /\bestalvi\b/, weight: 2 },
  { pattern: /\bdiposit\b/, weight: 1 },
  { pattern: /\bcompte\s+estalvi\b/, weight: 3 },
  { pattern: /\bpla\s+estalvi\b/, weight: 3 },
  { pattern: /\bllibreta\b/, weight: 2 },
  { pattern: /\btermini\s+fix\b/, weight: 2 },
]

const INVESTMENT_TERMS: LanguageRule[] = [
  { pattern: /\binversio\b/, weight: 2 },
  { pattern: /\binvertir\b/, weight: 2 },
  { pattern: /\baccions\b/, weight: 2 },
  { pattern: /\bborsa\b/, weight: 2 },
  { pattern: /\bfons\b/, weight: 1 },
  { pattern: /\bcartera\b/, weight: 2 },
  { pattern: /\bdividend\b/, weight: 2 },
  { pattern: /\betf\b/, weight: 2 },
  { pattern: /\bcrypto\b/, weight: 1 },
]

const INSURANCE_TERMS: LanguageRule[] = [
  { pattern: /\basseguranca\b/, weight: 2 },
  { pattern: /\bpolissa\b/, weight: 2 },
  { pattern: /\bprima\b/, weight: 2 },
  { pattern: /\bmutua\b/, weight: 2 },
  { pattern: /\bcobertura\b/, weight: 2 },
  { pattern: /\bsinistre\b/, weight: 2 },
  { pattern: /\bfranquicia\b/, weight: 2 },
]

const TAX_TERMS: LanguageRule[] = [
  { pattern: /\bimpost\b/, weight: 2 },
  { pattern: /\bimpostos\b/, weight: 2 },
  { pattern: /\biva\b/, weight: 2 },
  { pattern: /\btaxa\b/, weight: 1 },
  { pattern: /\bmulta\b/, weight: 1 },
  { pattern: /\bsancio\b/, weight: 1 },
  { pattern: /\btribut\b/, weight: 2 },
  { pattern: /\bhisenda\b/, weight: 2 },
]

const GROCERY_TERMS: LanguageRule[] = [
  { pattern: /\bsupermercat\b/, weight: 2 },
  { pattern: /\bhipermercat\b/, weight: 2 },
  { pattern: /\balimentacio\b/, weight: 2 },
  { pattern: /\bmercat\b/, weight: 1 },
  { pattern: /\bfruteria\b/, weight: 1 },
  { pattern: /\bcarnisseria\b/, weight: 1 },
  { pattern: /\bpeixateria\b/, weight: 1 },
  { pattern: /\bfleca\b/, weight: 2 },
  { pattern: /\bforn\b/, weight: 1 },
  { pattern: /\bpastisseria\b/, weight: 2 },
  { pattern: /\bqueviures\b/, weight: 2 },
]

const DINING_TERMS: LanguageRule[] = [
  { pattern: /\brestaurant\b/, weight: 2 },
  { pattern: /\bbraseria\b/, weight: 2 },
  { pattern: /\btaverna\b/, weight: 2 },
  { pattern: /\bmenjador\b/, weight: 2 },
  { pattern: /\bmenjar\b/, weight: 1 },
  { pattern: /\bcuina\b/, weight: 1 },
  { pattern: /\bpizzeria\b/, weight: 1 },
  { pattern: /\bhamburgueseria\b/, weight: 1 },
]

const COFFEE_TERMS: LanguageRule[] = [
  { pattern: /\bcafe\b/, weight: 1 },
  { pattern: /\bcafeteria\b/, weight: 2 },
  { pattern: /\bxocolateria\b/, weight: 2 },
]

const BAR_TERMS: LanguageRule[] = [
  { pattern: /\bbar\b/, weight: 1 },
  { pattern: /\bpub\b/, weight: 1 },
  { pattern: /\bcocteleria\b/, weight: 2 },
  { pattern: /\bdiscoteca\b/, weight: 2 },
]

const DELIVERY_TERMS: LanguageRule[] = [
  { pattern: /\blliurament\b/, weight: 2 },
  { pattern: /\brepartiment\b/, weight: 2 },
  { pattern: /\ba\s+domicili\b/, weight: 2 },
  { pattern: /\ba\s+emportar\b/, weight: 2 },
  { pattern: /\bmenjar\s+a\s+domicili\b/, weight: 2 },
]

const HOUSING_TERMS: LanguageRule[] = [
  { pattern: /\blloguer\b/, weight: 2 },
  { pattern: /\bhabitatge\b/, weight: 2 },
  { pattern: /\bllar\b/, weight: 1 },
  { pattern: /\bimmobiliaria\b/, weight: 2 },
  { pattern: /\bcomunitat\b/, weight: 1 },
  { pattern: /\bcomunitat\s+propietaris\b/, weight: 2 },
  { pattern: /\bhipoteca\b/, weight: 2 },
  { pattern: /\bllogater\b/, weight: 2 },
  { pattern: /\bcontracte\s+lloguer\b/, weight: 2 },
  { pattern: /\bfinca\b/, weight: 1 },
]

const MAINTENANCE_TERMS: LanguageRule[] = [
  { pattern: /\bmanteniment\b/, weight: 2 },
  { pattern: /\breparacio\b/, weight: 2 },
  { pattern: /\breparacions\b/, weight: 2 },
  { pattern: /\breforma\b/, weight: 2 },
  { pattern: /\bobres\b/, weight: 2 },
  { pattern: /\bbricolatge\b/, weight: 2 },
  { pattern: /\bjardineria\b/, weight: 2 },
  { pattern: /\bneteja\b/, weight: 2 },
  { pattern: /\bfontaneria\b/, weight: 2 },
  { pattern: /\belectricista\b/, weight: 2 },
  { pattern: /\bfusteria\b/, weight: 2 },
  { pattern: /\bpintura\b/, weight: 2 },
]

const UTILITIES_TERMS: LanguageRule[] = [
  { pattern: /\belectricitat\b/, weight: 2 },
  { pattern: /\baigua\b/, weight: 2 },
  { pattern: /\bgas\b/, weight: 2 },
  { pattern: /\bcalefaccio\b/, weight: 2 },
  { pattern: /\benergia\b/, weight: 2 },
  { pattern: /\binternet\b/, weight: 2 },
  { pattern: /\bfibra\b/, weight: 2 },
  { pattern: /\btelefon\b/, weight: 2 },
  { pattern: /\bmobil\b/, weight: 2 },
  { pattern: /\bfactura\b/, weight: 1 },
  { pattern: /\bsubministrament\b/, weight: 2 },
  { pattern: /\btelecom\b/, weight: 2 },
]

const TRANSPORT_TERMS: LanguageRule[] = [
  { pattern: /\btransport\b/, weight: 1 },
  { pattern: /\bmetro\b/, weight: 1 },
  { pattern: /\btramvia\b/, weight: 1 },
  { pattern: /\bautobus\b/, weight: 1 },
  { pattern: /\btren\b/, weight: 1 },
  { pattern: /\bferrocarril\b/, weight: 2 },
  { pattern: /\brodalies\b/, weight: 2 },
  { pattern: /\btaxi\b/, weight: 2 },
  { pattern: /\bpeatge\b/, weight: 2 },
  { pattern: /\baparcament\b/, weight: 2 },
  { pattern: /\bestacionament\b/, weight: 2 },
  { pattern: /\bparking\b/, weight: 1 },
  { pattern: /\bcotxe\b/, weight: 1 },
  { pattern: /\bvehicle\b/, weight: 1 },
  { pattern: /\blloguer\s+cotxe\b/, weight: 2 },
  { pattern: /\bbicicleta\b/, weight: 1 },
]

const FUEL_TERMS: LanguageRule[] = [
  { pattern: /\bbenzina\b/, weight: 2 },
  { pattern: /\bgasolina\b/, weight: 2 },
  { pattern: /\bcarburant\b/, weight: 2 },
  { pattern: /\bdiesel\b/, weight: 2 },
  { pattern: /\bgasoil\b/, weight: 2 },
  { pattern: /\bestacio\s+servei\b/, weight: 2 },
  { pattern: /\bgasolinera\b/, weight: 2 },
]

const HEALTH_TERMS: LanguageRule[] = [
  { pattern: /\bfarmacia\b/, weight: 2 },
  { pattern: /\bparafarmacia\b/, weight: 2 },
  { pattern: /\bhospital\b/, weight: 2 },
  { pattern: /\bclinica\b/, weight: 2 },
  { pattern: /\bmetge\b/, weight: 2 },
  { pattern: /\bdoctor\b/, weight: 2 },
  { pattern: /\bdentista\b/, weight: 2 },
  { pattern: /\boptica\b/, weight: 2 },
  { pattern: /\bulleres\b/, weight: 2 },
  { pattern: /\bsalut\b/, weight: 1 },
]

const FITNESS_TERMS: LanguageRule[] = [
  { pattern: /\bgimnas\b/, weight: 2 },
  { pattern: /\bgym\b/, weight: 1 },
  { pattern: /\bfitness\b/, weight: 2 },
  { pattern: /\besport\b/, weight: 1 },
  { pattern: /\bpiscina\b/, weight: 2 },
  { pattern: /\bioga\b/, weight: 2 },
  { pattern: /\bpilates\b/, weight: 2 },
  { pattern: /\bclub\s+esportiu\b/, weight: 2 },
]

const SHOPPING_TERMS: LanguageRule[] = [
  { pattern: /\bbotiga\b/, weight: 1 },
  { pattern: /\bcomerc\b/, weight: 1 },
  { pattern: /\broba\b/, weight: 1 },
  { pattern: /\bsabates\b/, weight: 1 },
  { pattern: /\bmoda\b/, weight: 1 },
  { pattern: /\belectronica\b/, weight: 1 },
  { pattern: /\binformatica\b/, weight: 2 },
  { pattern: /\bmobles\b/, weight: 1 },
  { pattern: /\bdecoracio\b/, weight: 1 },
  { pattern: /\bllar\b/, weight: 1 },
  { pattern: /\bjoguines\b/, weight: 1 },
  { pattern: /\bllibreria\b/, weight: 2 },
  { pattern: /\bpapereria\b/, weight: 2 },
]

const ENTERTAINMENT_TERMS: LanguageRule[] = [
  { pattern: /\bcinema\b/, weight: 2 },
  { pattern: /\bconcert\b/, weight: 2 },
  { pattern: /\bfestival\b/, weight: 2 },
  { pattern: /\bteatre\b/, weight: 2 },
  { pattern: /\bmuseu\b/, weight: 2 },
  { pattern: /\bespectacle\b/, weight: 2 },
  { pattern: /\boci\b/, weight: 1 },
  { pattern: /\bparc\b/, weight: 1 },
  { pattern: /\bvideojocs\b/, weight: 2 },
]

const EDUCATION_TERMS: LanguageRule[] = [
  { pattern: /\bescola\b/, weight: 2 },
  { pattern: /\buniversitat\b/, weight: 2 },
  { pattern: /\binstitut\b/, weight: 2 },
  { pattern: /\bcurs\b/, weight: 2 },
  { pattern: /\bformacio\b/, weight: 2 },
  { pattern: /\bmatricula\b/, weight: 2 },
  { pattern: /\bensenyament\b/, weight: 2 },
  { pattern: /\bestudi\b/, weight: 2 },
]

const TRAVEL_TERMS: LanguageRule[] = [
  { pattern: /\bhotel\b/, weight: 2 },
  { pattern: /\ballotjament\b/, weight: 2 },
  { pattern: /\bvol\b/, weight: 1 },
  { pattern: /\bavio\b/, weight: 1 },
  { pattern: /\baeroport\b/, weight: 2 },
  { pattern: /\bviatge\b/, weight: 1 },
  { pattern: /\breserva\b/, weight: 2 },
  { pattern: /\bbitllet\b/, weight: 1 },
  { pattern: /\bcompanyia\s+aeria\b/, weight: 2 },
  { pattern: /\blloguer\s+cotxe\b/, weight: 2 },
  { pattern: /\bagencia\s+viatges\b/, weight: 2 },
]

const SERVICES_TERMS: LanguageRule[] = [
  { pattern: /\bperruqueria\b/, weight: 2 },
  { pattern: /\bperruquer\b/, weight: 2 },
  { pattern: /\bestetica\b/, weight: 2 },
  { pattern: /\bbellesa\b/, weight: 2 },
  { pattern: /\bbugaderia\b/, weight: 2 },
  { pattern: /\btintoreria\b/, weight: 2 },
  { pattern: /\bmissatgeria\b/, weight: 2 },
  { pattern: /\bcorreus\b/, weight: 2 },
  { pattern: /\btaller\b/, weight: 2 },
  { pattern: /\bmecanic\b/, weight: 2 },
  { pattern: /\bgestoria\b/, weight: 2 },
  { pattern: /\bservei\s+tecnic\b/, weight: 2 },
]

const SUBSCRIPTION_TERMS: LanguageRule[] = [
  { pattern: /\bsubscripcio\b/, weight: 2 },
  { pattern: /\babonament\b/, weight: 2 },
  { pattern: /\bquota\s+mensual\b/, weight: 2 },
  { pattern: /\brenovacio\b/, weight: 2 },
  { pattern: /\badhesio\b/, weight: 2 },
  { pattern: /\btarifa\b/, weight: 1 },
]

const MONTH_TERMS: LanguageRule[] = [
  { pattern: /\bgener\b/, weight: 1 },
  { pattern: /\bfebrer\b/, weight: 1 },
  { pattern: /\bmarc\b/, weight: 1 },
  { pattern: /\babril\b/, weight: 1 },
  { pattern: /\bmaig\b/, weight: 1 },
  { pattern: /\bjuny\b/, weight: 1 },
  { pattern: /\bjuliol\b/, weight: 1 },
  { pattern: /\bagost\b/, weight: 1 },
  { pattern: /\bsetembre\b/, weight: 1 },
  { pattern: /\boctubre\b/, weight: 1 },
  { pattern: /\bnovembre\b/, weight: 1 },
  { pattern: /\bdesembre\b/, weight: 1 },
]

const DAY_TERMS: LanguageRule[] = [
  { pattern: /\bdilluns\b/, weight: 1 },
  { pattern: /\bdimarts\b/, weight: 1 },
  { pattern: /\bdimecres\b/, weight: 1 },
  { pattern: /\bdijous\b/, weight: 1 },
  { pattern: /\bdivendres\b/, weight: 1 },
  { pattern: /\bdissabte\b/, weight: 1 },
  { pattern: /\bdiumenge\b/, weight: 1 },
]

export const CA_RULES: LanguageRuleSet = {
  locale: "ca",
  minScore: 4,
  minMatches: 2,
  patterns: [
    ...ACCOUNT_TERMS,
    ...BALANCE_TERMS,
    ...HEADER_TERMS,
    ...TRANSFER_TERMS,
    ...PAYMENT_TERMS,
    ...CARD_TERMS,
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
    ...MAINTENANCE_TERMS,
    ...UTILITIES_TERMS,
    ...TRANSPORT_TERMS,
    ...FUEL_TERMS,
    ...HEALTH_TERMS,
    ...FITNESS_TERMS,
    ...SHOPPING_TERMS,
    ...ENTERTAINMENT_TERMS,
    ...EDUCATION_TERMS,
    ...TRAVEL_TERMS,
    ...SERVICES_TERMS,
    ...SUBSCRIPTION_TERMS,
    ...MONTH_TERMS,
    ...DAY_TERMS,
  ],
}
