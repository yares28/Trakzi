import type { LanguageRule, LanguageRuleSet } from "./types"

const ACCOUNT_TERMS: LanguageRule[] = [
  { pattern: /\baccount\s+statement\b/, weight: 4 },
  { pattern: /\bstatement\s+period\b/, weight: 3 },
  { pattern: /\bstatement\s+date\b/, weight: 3 },
  { pattern: /\bstatement\s+ending\b/, weight: 3 },
  { pattern: /\bstatement\s+beginning\b/, weight: 3 },
  { pattern: /\baccount\s+summary\b/, weight: 3 },
  { pattern: /\baccount\s+number\b/, weight: 3 },
  { pattern: /\baccount\s+holder\b/, weight: 3 },
  { pattern: /\baccount\s+name\b/, weight: 2 },
  { pattern: /\baccount\s+type\b/, weight: 2 },
  { pattern: /\bbank\s+account\b/, weight: 3 },
  { pattern: /\bchecking\s+account\b/, weight: 3 },
  { pattern: /\bsavings\s+account\b/, weight: 3 },
  { pattern: /\bcurrent\s+account\b/, weight: 3 },
  { pattern: /\bbranch\b/, weight: 1 },
  { pattern: /\bcustomer\b/, weight: 1 },
  { pattern: /\biban\b/, weight: 2 },
  { pattern: /\bbic\b/, weight: 2 },
  { pattern: /\bswift\b/, weight: 2 },
  { pattern: /\brouting\s+number\b/, weight: 4 },
  { pattern: /\bsort\s+code\b/, weight: 4 },
  { pattern: /\baccount\b/, weight: 2 },
  { pattern: /\bstatement\b/, weight: 3 },
]

const BALANCE_TERMS: LanguageRule[] = [
  { pattern: /\bopening\s+balance\b/, weight: 3 },
  { pattern: /\bclosing\s+balance\b/, weight: 3 },
  { pattern: /\bending\s+balance\b/, weight: 3 },
  { pattern: /\bbeginning\s+balance\b/, weight: 3 },
  { pattern: /\bcurrent\s+balance\b/, weight: 3 },
  { pattern: /\bavailable\s+balance\b/, weight: 3 },
  { pattern: /\bledger\s+balance\b/, weight: 3 },
  { pattern: /\bbalance\s+forward\b/, weight: 2 },
  { pattern: /\bbrought\s+forward\b/, weight: 2 },
  { pattern: /\bcarried\s+forward\b/, weight: 2 },
  { pattern: /\bavailable\s+funds\b/, weight: 2 },
  { pattern: /\bavailable\s+credit\b/, weight: 2 },
  { pattern: /\bcredit\s+limit\b/, weight: 2 },
  { pattern: /\boverdraft\b/, weight: 2 },
  { pattern: /\bbalance\b/, weight: 1 },
]

const HEADER_TERMS: LanguageRule[] = [
  { pattern: /\btransaction\s+date\b/, weight: 3 },
  { pattern: /\bposting\s+date\b/, weight: 3 },
  { pattern: /\bvalue\s+date\b/, weight: 3 },
  { pattern: /\btransaction\s+type\b/, weight: 2 },
  { pattern: /\btransaction\b/, weight: 2 },
  { pattern: /\btransactions\b/, weight: 2 },
  { pattern: /\bdescription\b/, weight: 2 },
  { pattern: /\bdetails\b/, weight: 2 },
  { pattern: /\bmemo\b/, weight: 2 },
  { pattern: /\breference\b/, weight: 2 },
  { pattern: /\bmerchant\b/, weight: 2 },
  { pattern: /\bpayee\b/, weight: 2 },
  { pattern: /\bcategory\b/, weight: 2 },
  { pattern: /\bamount\b/, weight: 2 },
  { pattern: /\bdebit\b/, weight: 2 },
  { pattern: /\bcredit\b/, weight: 2 },
  { pattern: /\bbalance\b/, weight: 1 },
]

const TRANSFER_TERMS: LanguageRule[] = [
  { pattern: /\bbank\s+transfer\b/, weight: 3 },
  { pattern: /\bwire\s+transfer\b/, weight: 3 },
  { pattern: /\bonline\s+transfer\b/, weight: 3 },
  { pattern: /\binstant\s+transfer\b/, weight: 3 },
  { pattern: /\btransfer\b/, weight: 2 },
  { pattern: /\bach\b/, weight: 2 },
  { pattern: /\bsepa\b/, weight: 2 },
  { pattern: /\bbacs\b/, weight: 2 },
  { pattern: /\bchaps\b/, weight: 2 },
  { pattern: /\bfaster\s+payments\b/, weight: 2 },
  { pattern: /\bfps\b/, weight: 1 },
  { pattern: /\bdirect\s+deposit\b/, weight: 3 },
  { pattern: /\bstanding\s+order\b/, weight: 3 },
]

const PAYMENT_TERMS: LanguageRule[] = [
  { pattern: /\bcard\s+payment\b/, weight: 3 },
  { pattern: /\bcard\s+purchase\b/, weight: 3 },
  { pattern: /\bpoint\s+of\s+sale\b/, weight: 3 },
  { pattern: /\bpos\b/, weight: 2 },
  { pattern: /\bcontactless\b/, weight: 2 },
  { pattern: /\btap\s+to\s+pay\b/, weight: 2 },
  { pattern: /\bonline\s+payment\b/, weight: 3 },
  { pattern: /\bbill\s+payment\b/, weight: 3 },
  { pattern: /\bpayment\b/, weight: 2 },
  { pattern: /\bpurchase\b/, weight: 2 },
  { pattern: /\bwithdrawal\b/, weight: 2 },
  { pattern: /\bcash\s+withdrawal\b/, weight: 3 },
  { pattern: /\batm\b/, weight: 2 },
  { pattern: /\bcash\s+deposit\b/, weight: 3 },
  { pattern: /\bdeposit\b/, weight: 2 },
  { pattern: /\brefund\b/, weight: 2 },
  { pattern: /\bchargeback\b/, weight: 3 },
  { pattern: /\breversal\b/, weight: 2 },
  { pattern: /\bdispute\b/, weight: 2 },
  { pattern: /\binstallment\b/, weight: 2 },
  { pattern: /\binvoice\b/, weight: 2 },
  { pattern: /\bsubscription\b/, weight: 2 },
  { pattern: /\brecurring\b/, weight: 2 },
  { pattern: /\bauthorization\b/, weight: 2 },
  { pattern: /\bpending\b/, weight: 1 },
]

const CARD_TERMS: LanguageRule[] = [
  { pattern: /\bcredit\s+card\b/, weight: 2 },
  { pattern: /\bdebit\s+card\b/, weight: 2 },
  { pattern: /\bcardholder\b/, weight: 2 },
  { pattern: /\bcard\s+number\b/, weight: 2 },
  { pattern: /\bcard\s+ending\b/, weight: 2 },
  { pattern: /\bcard\b/, weight: 1 },
  { pattern: /\bcash\b/, weight: 1 },
]

const FEE_TERMS: LanguageRule[] = [
  { pattern: /\bservice\s+fee\b/, weight: 3 },
  { pattern: /\bmonthly\s+fee\b/, weight: 2 },
  { pattern: /\bmaintenance\s+fee\b/, weight: 3 },
  { pattern: /\boverdraft\s+fee\b/, weight: 3 },
  { pattern: /\blate\s+fee\b/, weight: 2 },
  { pattern: /\bfee\b/, weight: 2 },
  { pattern: /\bfees\b/, weight: 2 },
  { pattern: /\bcommission\b/, weight: 2 },
  { pattern: /\bcharge\b/, weight: 2 },
  { pattern: /\bcharges\b/, weight: 2 },
]

const INCOME_TERMS: LanguageRule[] = [
  { pattern: /\bsalary\b/, weight: 3 },
  { pattern: /\bpayroll\b/, weight: 3 },
  { pattern: /\bwage\b/, weight: 2 },
  { pattern: /\bwages\b/, weight: 2 },
  { pattern: /\bbonus\b/, weight: 2 },
  { pattern: /\bpension\b/, weight: 2 },
  { pattern: /\bdividend\b/, weight: 2 },
  { pattern: /\binterest\b/, weight: 2 },
  { pattern: /\breimbursement\b/, weight: 2 },
  { pattern: /\bincome\b/, weight: 2 },
  { pattern: /\bbenefit\b/, weight: 2 },
]

const LOAN_TERMS: LanguageRule[] = [
  { pattern: /\bloan\b/, weight: 2 },
  { pattern: /\bmortgage\b/, weight: 2 },
  { pattern: /\binstallment\b/, weight: 2 },
  { pattern: /\brepayment\b/, weight: 2 },
  { pattern: /\bprincipal\b/, weight: 2 },
  { pattern: /\bamortization\b/, weight: 2 },
  { pattern: /\binterest\s+rate\b/, weight: 2 },
  { pattern: /\bcredit\s+line\b/, weight: 2 },
  { pattern: /\bcredit\s+limit\b/, weight: 2 },
]

const REFUND_TERMS: LanguageRule[] = [
  { pattern: /\brefund\b/, weight: 2 },
  { pattern: /\breimbursement\b/, weight: 2 },
  { pattern: /\bchargeback\b/, weight: 2 },
  { pattern: /\breversal\b/, weight: 2 },
]

const SAVINGS_TERMS: LanguageRule[] = [
  { pattern: /\bsavings\b/, weight: 2 },
  { pattern: /\bsaving\b/, weight: 2 },
  { pattern: /\bdeposit\b/, weight: 1 },
]

const INVESTMENT_TERMS: LanguageRule[] = [
  { pattern: /\binvestment\b/, weight: 2 },
  { pattern: /\binvest\b/, weight: 2 },
  { pattern: /\bbroker\b/, weight: 2 },
  { pattern: /\bbrokerage\b/, weight: 2 },
  { pattern: /\bstock\b/, weight: 1 },
  { pattern: /\bshares\b/, weight: 1 },
  { pattern: /\bfund\b/, weight: 1 },
  { pattern: /\bportfolio\b/, weight: 1 },
]

const INSURANCE_TERMS: LanguageRule[] = [
  { pattern: /\binsurance\b/, weight: 2 },
  { pattern: /\bpremium\b/, weight: 2 },
  { pattern: /\bpolicy\b/, weight: 2 },
]

const TAX_TERMS: LanguageRule[] = [
  { pattern: /\btax\b/, weight: 2 },
  { pattern: /\btaxes\b/, weight: 2 },
  { pattern: /\bvat\b/, weight: 2 },
  { pattern: /\bduty\b/, weight: 1 },
]

const GROCERY_TERMS: LanguageRule[] = [
  { pattern: /\bsupermarket\b/, weight: 2 },
  { pattern: /\bgrocery\b/, weight: 2 },
  { pattern: /\bgroceries\b/, weight: 2 },
  { pattern: /\bmarket\b/, weight: 1 },
  { pattern: /\bproduce\b/, weight: 1 },
  { pattern: /\bbutcher\b/, weight: 1 },
  { pattern: /\bbakery\b/, weight: 1 },
  { pattern: /\bdeli\b/, weight: 1 },
  { pattern: /\bfishmonger\b/, weight: 1 },
  { pattern: /\bconvenience\s+store\b/, weight: 1 },
]

const DINING_TERMS: LanguageRule[] = [
  { pattern: /\brestaurant\b/, weight: 1 },
  { pattern: /\bdiner\b/, weight: 1 },
  { pattern: /\bbistro\b/, weight: 1 },
  { pattern: /\bgrill\b/, weight: 1 },
  { pattern: /\bsteakhouse\b/, weight: 1 },
  { pattern: /\bpizzeria\b/, weight: 1 },
  { pattern: /\bsushi\b/, weight: 1 },
  { pattern: /\bkebab\b/, weight: 1 },
  { pattern: /\bburger\b/, weight: 1 },
]

const COFFEE_TERMS: LanguageRule[] = [
  { pattern: /\bcoffee\b/, weight: 1 },
  { pattern: /\bcafe\b/, weight: 1 },
  { pattern: /\bespresso\b/, weight: 1 },
  { pattern: /\blatte\b/, weight: 1 },
  { pattern: /\bcappuccino\b/, weight: 1 },
  { pattern: /\bbarista\b/, weight: 1 },
  { pattern: /\broastery\b/, weight: 1 },
]

const BAR_TERMS: LanguageRule[] = [
  { pattern: /\bbar\b/, weight: 1 },
  { pattern: /\bpub\b/, weight: 1 },
  { pattern: /\btavern\b/, weight: 1 },
  { pattern: /\blounge\b/, weight: 1 },
  { pattern: /\bnightclub\b/, weight: 1 },
  { pattern: /\bcocktail\b/, weight: 1 },
  { pattern: /\bbrewery\b/, weight: 1 },
  { pattern: /\bbeer\b/, weight: 1 },
]

const DELIVERY_TERMS: LanguageRule[] = [
  { pattern: /\bdelivery\b/, weight: 1 },
  { pattern: /\btakeaway\b/, weight: 1 },
  { pattern: /\btakeout\b/, weight: 1 },
  { pattern: /\bto\s+go\b/, weight: 1 },
  { pattern: /\bfood\s+delivery\b/, weight: 1 },
]

const HOUSING_TERMS: LanguageRule[] = [
  { pattern: /\brent\b/, weight: 2 },
  { pattern: /\brental\b/, weight: 2 },
  { pattern: /\blease\b/, weight: 2 },
  { pattern: /\blandlord\b/, weight: 2 },
  { pattern: /\btenancy\b/, weight: 2 },
  { pattern: /\bmortgage\b/, weight: 2 },
  { pattern: /\bhome\s+loan\b/, weight: 2 },
]

const HOME_MAINTENANCE_TERMS: LanguageRule[] = [
  { pattern: /\bmaintenance\b/, weight: 1 },
  { pattern: /\brepair\b/, weight: 1 },
  { pattern: /\bplumber\b/, weight: 1 },
  { pattern: /\belectrician\b/, weight: 1 },
  { pattern: /\bcontractor\b/, weight: 1 },
  { pattern: /\bhandyman\b/, weight: 1 },
  { pattern: /\broofing\b/, weight: 1 },
  { pattern: /\bpainting\b/, weight: 1 },
  { pattern: /\brenovation\b/, weight: 1 },
]

const HOME_SUPPLIES_TERMS: LanguageRule[] = [
  { pattern: /\bhardware\b/, weight: 1 },
  { pattern: /\bhome\s+improvement\b/, weight: 1 },
  { pattern: /\bdiy\b/, weight: 1 },
  { pattern: /\btools\b/, weight: 1 },
  { pattern: /\blumber\b/, weight: 1 },
  { pattern: /\bbuilding\s+supplies\b/, weight: 1 },
]

const UTILITY_TERMS: LanguageRule[] = [
  { pattern: /\belectricity\b/, weight: 2 },
  { pattern: /\bpower\b/, weight: 1 },
  { pattern: /\butility\b/, weight: 2 },
  { pattern: /\butilities\b/, weight: 2 },
  { pattern: /\bgas\b/, weight: 1 },
  { pattern: /\bwater\b/, weight: 2 },
  { pattern: /\bsewer\b/, weight: 1 },
  { pattern: /\btrash\b/, weight: 1 },
  { pattern: /\bwaste\b/, weight: 1 },
  { pattern: /\binternet\b/, weight: 2 },
  { pattern: /\bbroadband\b/, weight: 2 },
  { pattern: /\bwifi\b/, weight: 2 },
  { pattern: /\bmobile\b/, weight: 2 },
  { pattern: /\bphone\b/, weight: 1 },
  { pattern: /\btelecom\b/, weight: 2 },
  { pattern: /\bcable\b/, weight: 1 },
  { pattern: /\btv\b/, weight: 1 },
]

const TRANSPORT_TERMS: LanguageRule[] = [
  { pattern: /\btransport\b/, weight: 1 },
  { pattern: /\btransit\b/, weight: 1 },
  { pattern: /\bbus\b/, weight: 1 },
  { pattern: /\btrain\b/, weight: 1 },
  { pattern: /\bsubway\b/, weight: 1 },
  { pattern: /\bmetro\b/, weight: 1 },
  { pattern: /\btram\b/, weight: 1 },
  { pattern: /\btaxi\b/, weight: 1 },
  { pattern: /\bcab\b/, weight: 1 },
  { pattern: /\brideshare\b/, weight: 1 },
  { pattern: /\bparking\b/, weight: 1 },
  { pattern: /\btoll\b/, weight: 1 },
  { pattern: /\bcar\s+park\b/, weight: 1 },
  { pattern: /\bvehicle\b/, weight: 1 },
  { pattern: /\bauto\b/, weight: 1 },
  { pattern: /\bcar\s+wash\b/, weight: 1 },
  { pattern: /\bauto\s+repair\b/, weight: 1 },
  { pattern: /\bmechanic\b/, weight: 1 },
  { pattern: /\btire\b/, weight: 1 },
  { pattern: /\boil\s+change\b/, weight: 1 },
]

const FUEL_TERMS: LanguageRule[] = [
  { pattern: /\bfuel\b/, weight: 2 },
  { pattern: /\bpetrol\b/, weight: 2 },
  { pattern: /\bgasoline\b/, weight: 2 },
  { pattern: /\bdiesel\b/, weight: 2 },
  { pattern: /\bgas\s+station\b/, weight: 2 },
]

const HEALTH_TERMS: LanguageRule[] = [
  { pattern: /\bpharmacy\b/, weight: 2 },
  { pattern: /\bdrugstore\b/, weight: 2 },
  { pattern: /\bclinic\b/, weight: 2 },
  { pattern: /\bhospital\b/, weight: 2 },
  { pattern: /\bdoctor\b/, weight: 2 },
  { pattern: /\bdentist\b/, weight: 2 },
  { pattern: /\bmedical\b/, weight: 2 },
  { pattern: /\blab\b/, weight: 1 },
  { pattern: /\btherapy\b/, weight: 1 },
  { pattern: /\bhealth\b/, weight: 1 },
]

const FITNESS_TERMS: LanguageRule[] = [
  { pattern: /\bgym\b/, weight: 1 },
  { pattern: /\bfitness\b/, weight: 1 },
  { pattern: /\byoga\b/, weight: 1 },
  { pattern: /\bpilates\b/, weight: 1 },
  { pattern: /\bcrossfit\b/, weight: 1 },
]

const SHOPPING_TERMS: LanguageRule[] = [
  { pattern: /\bshopping\b/, weight: 1 },
  { pattern: /\bretail\b/, weight: 1 },
  { pattern: /\bstore\b/, weight: 1 },
  { pattern: /\bshop\b/, weight: 1 },
  { pattern: /\bclothing\b/, weight: 1 },
  { pattern: /\bapparel\b/, weight: 1 },
  { pattern: /\bfashion\b/, weight: 1 },
  { pattern: /\bshoes\b/, weight: 1 },
  { pattern: /\belectronics\b/, weight: 1 },
  { pattern: /\bgadgets\b/, weight: 1 },
  { pattern: /\bfurniture\b/, weight: 1 },
  { pattern: /\bhome\s+goods\b/, weight: 1 },
  { pattern: /\bgift\b/, weight: 1 },
  { pattern: /\bgifts\b/, weight: 1 },
  { pattern: /\btoys\b/, weight: 1 },
  { pattern: /\bcosmetics\b/, weight: 1 },
  { pattern: /\bbeauty\b/, weight: 1 },
]

const ENTERTAINMENT_TERMS: LanguageRule[] = [
  { pattern: /\bentertainment\b/, weight: 1 },
  { pattern: /\bcinema\b/, weight: 1 },
  { pattern: /\bmovie\b/, weight: 1 },
  { pattern: /\btheater\b/, weight: 1 },
  { pattern: /\bconcert\b/, weight: 1 },
  { pattern: /\bfestival\b/, weight: 1 },
  { pattern: /\bticket\b/, weight: 1 },
  { pattern: /\bgaming\b/, weight: 1 },
  { pattern: /\bgame\b/, weight: 1 },
  { pattern: /\bmusic\b/, weight: 1 },
]

const EDUCATION_TERMS: LanguageRule[] = [
  { pattern: /\beducation\b/, weight: 1 },
  { pattern: /\bschool\b/, weight: 1 },
  { pattern: /\bcollege\b/, weight: 1 },
  { pattern: /\buniversity\b/, weight: 1 },
  { pattern: /\btuition\b/, weight: 1 },
  { pattern: /\bcourse\b/, weight: 1 },
  { pattern: /\bclass\b/, weight: 1 },
  { pattern: /\btraining\b/, weight: 1 },
  { pattern: /\bacademy\b/, weight: 1 },
]

const TRAVEL_TERMS: LanguageRule[] = [
  { pattern: /\btravel\b/, weight: 1 },
  { pattern: /\bhotel\b/, weight: 1 },
  { pattern: /\bhostel\b/, weight: 1 },
  { pattern: /\bflight\b/, weight: 1 },
  { pattern: /\bairline\b/, weight: 1 },
  { pattern: /\bbooking\b/, weight: 1 },
  { pattern: /\breservation\b/, weight: 1 },
  { pattern: /\btrip\b/, weight: 1 },
  { pattern: /\bvacation\b/, weight: 1 },
  { pattern: /\btourism\b/, weight: 1 },
  { pattern: /\bcar\s+rental\b/, weight: 1 },
  { pattern: /\brental\s+car\b/, weight: 1 },
]

const SERVICES_TERMS: LanguageRule[] = [
  { pattern: /\bservice\b/, weight: 1 },
  { pattern: /\bservices\b/, weight: 1 },
  { pattern: /\blaundry\b/, weight: 1 },
  { pattern: /\bcleaning\b/, weight: 1 },
  { pattern: /\bhairdresser\b/, weight: 1 },
  { pattern: /\bbarber\b/, weight: 1 },
  { pattern: /\bsalon\b/, weight: 1 },
  { pattern: /\bconsulting\b/, weight: 1 },
  { pattern: /\blawyer\b/, weight: 1 },
  { pattern: /\baccountant\b/, weight: 1 },
  { pattern: /\bnotary\b/, weight: 1 },
]

const AUTO_SERVICE_TERMS: LanguageRule[] = [
  { pattern: /\bauto\s+repair\b/, weight: 1 },
  { pattern: /\bcar\s+repair\b/, weight: 1 },
  { pattern: /\bmechanic\b/, weight: 1 },
  { pattern: /\bauto\s+service\b/, weight: 1 },
  { pattern: /\bvehicle\s+service\b/, weight: 1 },
  { pattern: /\boil\s+change\b/, weight: 1 },
  { pattern: /\bcar\s+wash\b/, weight: 1 },
  { pattern: /\btire\b/, weight: 1 },
  { pattern: /\bbody\s+shop\b/, weight: 1 },
  { pattern: /\btowing\b/, weight: 1 },
]

const PERSONAL_CARE_TERMS: LanguageRule[] = [
  { pattern: /\bspa\b/, weight: 1 },
  { pattern: /\bmassage\b/, weight: 1 },
  { pattern: /\bmanicure\b/, weight: 1 },
  { pattern: /\bpedicure\b/, weight: 1 },
  { pattern: /\bnail\s+salon\b/, weight: 1 },
  { pattern: /\bbeauty\b/, weight: 1 },
  { pattern: /\besthetic\b/, weight: 1 },
  { pattern: /\bcosmetic\b/, weight: 1 },
]

const PET_TERMS: LanguageRule[] = [
  { pattern: /\bpet\b/, weight: 1 },
  { pattern: /\bpets\b/, weight: 1 },
  { pattern: /\bvet\b/, weight: 1 },
  { pattern: /\bveterinarian\b/, weight: 1 },
  { pattern: /\bveterinary\b/, weight: 1 },
  { pattern: /\bgrooming\b/, weight: 1 },
  { pattern: /\bkennel\b/, weight: 1 },
  { pattern: /\bpet\s+store\b/, weight: 1 },
]

const CHILDCARE_TERMS: LanguageRule[] = [
  { pattern: /\bdaycare\b/, weight: 1 },
  { pattern: /\bchildcare\b/, weight: 1 },
  { pattern: /\bbabysitter\b/, weight: 1 },
  { pattern: /\bnursery\b/, weight: 1 },
]

const SUBSCRIPTION_TERMS: LanguageRule[] = [
  { pattern: /\bsubscription\b/, weight: 2 },
  { pattern: /\bsubscriptions\b/, weight: 2 },
  { pattern: /\bmembership\b/, weight: 2 },
  { pattern: /\brecurring\b/, weight: 1 },
  { pattern: /\bmonthly\b/, weight: 1 },
]

const MONTH_TERMS: LanguageRule[] = [
  { pattern: /\bjanuary\b/, weight: 1 },
  { pattern: /\bjan\b/, weight: 1 },
  { pattern: /\bfebruary\b/, weight: 1 },
  { pattern: /\bfeb\b/, weight: 1 },
  { pattern: /\bmarch\b/, weight: 1 },
  { pattern: /\bmar\b/, weight: 1 },
  { pattern: /\bapril\b/, weight: 1 },
  { pattern: /\bapr\b/, weight: 1 },
  { pattern: /\bmay\b/, weight: 1 },
  { pattern: /\bjune\b/, weight: 1 },
  { pattern: /\bjun\b/, weight: 1 },
  { pattern: /\bjuly\b/, weight: 1 },
  { pattern: /\bjul\b/, weight: 1 },
  { pattern: /\baugust\b/, weight: 1 },
  { pattern: /\baug\b/, weight: 1 },
  { pattern: /\bseptember\b/, weight: 1 },
  { pattern: /\bsep\b/, weight: 1 },
  { pattern: /\bsept\b/, weight: 1 },
  { pattern: /\boctober\b/, weight: 1 },
  { pattern: /\boct\b/, weight: 1 },
  { pattern: /\bnovember\b/, weight: 1 },
  { pattern: /\bnov\b/, weight: 1 },
  { pattern: /\bdecember\b/, weight: 1 },
  { pattern: /\bdec\b/, weight: 1 },
]

const DAY_TERMS: LanguageRule[] = [
  { pattern: /\bmonday\b/, weight: 1 },
  { pattern: /\bmon\b/, weight: 1 },
  { pattern: /\btuesday\b/, weight: 1 },
  { pattern: /\btue\b/, weight: 1 },
  { pattern: /\btues\b/, weight: 1 },
  { pattern: /\bwednesday\b/, weight: 1 },
  { pattern: /\bwed\b/, weight: 1 },
  { pattern: /\bthursday\b/, weight: 1 },
  { pattern: /\bthu\b/, weight: 1 },
  { pattern: /\bthur\b/, weight: 1 },
  { pattern: /\bthurs\b/, weight: 1 },
  { pattern: /\bfriday\b/, weight: 1 },
  { pattern: /\bfri\b/, weight: 1 },
  { pattern: /\bsaturday\b/, weight: 1 },
  { pattern: /\bsat\b/, weight: 1 },
  { pattern: /\bsunday\b/, weight: 1 },
  { pattern: /\bsun\b/, weight: 1 },
]

export const EN_RULES: LanguageRuleSet = {
  locale: "en",
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

