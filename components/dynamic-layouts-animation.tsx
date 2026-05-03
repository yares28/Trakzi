"use client"

import { memo, useEffect, useState } from "react"
import { m, AnimatePresence } from "framer-motion"
import { MapPin, Car, Building2 } from "lucide-react"

type Coords = [number, number][]

// ── Country coordinate data (mainland polygons) ──

const FRANCE_COORDS: Coords = [[3.588184,50.378992],[4.286023,49.907497],[4.799222,49.985373],[5.674052,49.529484],[5.897759,49.442667],[6.18632,49.463803],[6.65823,49.201958],[8.099279,49.017784],[7.593676,48.333019],[7.466759,47.620582],[7.192202,47.449766],[6.736571,47.541801],[6.768714,47.287708],[6.037389,46.725779],[6.022609,46.27299],[6.5001,46.429673],[6.843593,45.991147],[6.802355,45.70858],[7.096652,45.333099],[6.749955,45.028518],[7.007562,44.254767],[7.549596,44.127901],[7.435185,43.693845],[6.529245,43.128892],[4.556963,43.399651],[3.100411,43.075201],[2.985999,42.473015],[1.826793,42.343385],[0.701591,42.795734],[0.338047,42.579546],[-1.502771,43.034014],[-1.901351,43.422802],[-1.384225,44.02261],[-1.193798,46.014918],[-2.225724,47.064363],[-2.963276,47.570327],[-4.491555,47.954954],[-4.59235,48.68416],[-3.295814,48.901692],[-1.616511,48.644421],[-1.933494,49.776342],[-0.989469,49.347376],[1.338761,50.127173],[1.639001,50.946606],[2.513573,51.148506],[2.658422,50.796848],[3.123252,50.780363],[3.588184,50.378992]]

const JAPAN_COORDS: Coords = [[140.976388,37.142074],[140.59977,36.343983],[140.774074,35.842877],[140.253279,35.138114],[138.975528,34.6676],[137.217599,34.606286],[135.792983,33.464805],[135.120983,33.849071],[135.079435,34.596545],[133.340316,34.375938],[132.156771,33.904933],[130.986145,33.885761],[132.000036,33.149992],[131.33279,31.450355],[130.686318,31.029579],[130.20242,31.418238],[130.447676,32.319475],[129.814692,32.61031],[129.408463,33.296056],[130.353935,33.604151],[130.878451,34.232743],[131.884229,34.749714],[132.617673,35.433393],[134.608301,35.731618],[135.677538,35.527134],[136.723831,37.304984],[137.390612,36.827391],[138.857602,37.827485],[139.426405,38.215962],[140.05479,39.438807],[139.883379,40.563312],[140.305783,41.195005],[141.368973,41.37856],[141.914263,39.991616],[141.884601,39.180865],[140.959489,38.174001],[140.976388,37.142074]]

const ITALY_COORDS: Coords = [[12.376485,46.767559],[13.806475,46.509306],[13.69811,46.016778],[13.93763,45.591016],[13.141606,45.736692],[12.328581,45.381778],[12.383875,44.885374],[12.261453,44.600482],[12.589237,44.091366],[13.526906,43.587727],[14.029821,42.761008],[15.14257,41.95514],[15.926191,41.961315],[16.169897,41.740295],[15.889346,41.541082],[16.785002,41.179606],[17.519169,40.877143],[18.376687,40.355625],[18.480247,40.168866],[18.293385,39.810774],[17.73838,40.277671],[16.869596,40.442235],[16.448743,39.795401],[17.17149,39.4247],[17.052841,38.902871],[16.635088,38.843572],[16.100961,37.985899],[15.684087,37.908849],[15.687963,38.214593],[15.891981,38.750942],[16.109332,38.964547],[15.718814,39.544072],[15.413613,40.048357],[14.998496,40.172949],[14.703268,40.60455],[14.060672,40.786348],[13.627985,41.188287],[12.888082,41.25309],[12.106683,41.704535],[11.191906,42.355425],[10.511948,42.931463],[10.200029,43.920007],[9.702488,44.036279],[8.888946,44.366336],[8.428561,44.231228],[7.850767,43.767148],[7.435185,43.693845],[7.549596,44.127901],[7.007562,44.254767],[6.749955,45.028518],[7.096652,45.333099],[6.802355,45.70858],[6.843593,45.991147],[7.273851,45.776948],[7.755992,45.82449],[8.31663,46.163642],[8.489952,46.005151],[8.966306,46.036932],[9.182882,46.440215],[9.922837,46.314899],[10.363378,46.483571],[10.442701,46.893546],[11.048556,46.751359],[11.164828,46.941579],[12.153088,47.115393],[12.376485,46.767559]]

const GREECE_COORDS: Coords = [[26.604196,41.562115],[26.294602,40.936261],[26.056942,40.824123],[25.447677,40.687129],[24.407999,40.124993],[23.899968,39.962006],[23.342999,39.960998],[22.813988,40.476005],[22.626299,40.256561],[22.849748,39.659311],[23.350027,39.190011],[22.973099,38.970903],[23.530016,38.510001],[24.025025,38.219993],[24.040011,37.655015],[23.115003,37.920011],[23.409972,37.409991],[22.774972,37.30501],[23.154225,36.422506],[22.490028,36.41],[21.670026,36.844986],[21.295011,37.644989],[21.120034,38.310323],[20.730032,38.769985],[20.217712,39.340235],[20.150016,39.624998],[20.615,40.110007],[20.674997,40.435],[20.99999,40.580004],[21.02004,40.842727],[21.674161,40.931275],[22.055378,41.149866],[22.597308,41.130487],[22.76177,41.3048],[22.952377,41.337994],[23.692074,41.309081],[24.492645,41.583896],[25.197201,41.234486],[26.106138,41.328899],[26.117042,41.826905],[26.604196,41.562115]]

// ── SVG path computation ──

function toPath(
  coords: Coords,
  maxW = 200,
  maxH = 160,
  pad = 10
): { path: string; w: number; h: number } {
  const lons = coords.map((c) => c[0])
  const lats = coords.map((c) => c[1])
  const minLon = Math.min(...lons), maxLon = Math.max(...lons)
  const minLat = Math.min(...lats), maxLat = Math.max(...lats)
  const centerLat = (minLat + maxLat) / 2
  const latCorr = Math.cos((Math.abs(centerLat) * Math.PI) / 180)
  const geoW = (maxLon - minLon) * latCorr
  const geoH = maxLat - minLat
  if (!geoW || !geoH) return { path: "", w: maxW, h: maxH }
  const aspect = geoW / geoH
  let w = maxW, h = maxH
  if (aspect > maxW / maxH) { h = maxW / aspect } else { w = maxH * aspect }
  const availW = w - pad * 2
  const availH = h - pad * 2
  const scale = Math.min(availW / geoW, availH / geoH)
  const oX = pad + (availW - geoW * scale) / 2
  const oY = pad + (availH - geoH * scale) / 2
  const pts = coords.map(([lon, lat]) => {
    const x = (lon - minLon) * latCorr * scale + oX
    const y = (maxLat - lat) * scale + oY
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  return { path: `M${pts.join("L")}Z`, w, h }
}

const FRANCE_SVG = toPath(FRANCE_COORDS)
const JAPAN_SVG = toPath(JAPAN_COORDS)
const ITALY_SVG = toPath(ITALY_COORDS)
const GREECE_SVG = toPath(GREECE_COORDS)

// ── Slide definitions ──

type Slide =
  | { kind: "trip"; name: string; flag: string; detail: string; amount: string; svgData: { path: string; w: number; h: number } }
  | { kind: "car"; name: string; detail: string; amount: string; src: string; w: number; h: number }
  | { kind: "property"; name: string; detail: string; amount: string; src: string; w: number; h: number }

// Car aspect ratios: car1=1.046, car2=0.881, car3=0.818, car7=0.872
// House aspect ratios: plan1=1.835, plan2=1.635, plan3=1.0, plan4=1.307
const SLIDES: Slide[] = [
  { kind: "trip",     name: "Paris Trip",      flag: "🇫🇷", detail: "Hotels, dining & activities", amount: "€620 spent",   svgData: FRANCE_SVG },
  { kind: "car",      name: "Monthly Gas",     detail: "Fuel costs",                               amount: "$68 / mo",     src: "/topView/topviewcar1.svg",    w: 138, h: 132 },
  { kind: "property", name: "Mortgage",        detail: "Primary home",                             amount: "$1,450 / mo",  src: "/property/houseplan1.svg",    w: 240, h: 131 },
  { kind: "trip",     name: "Tokyo Vacation",  flag: "🇯🇵", detail: "Food, transit & hotels",       amount: "¥45,200 spent", svgData: JAPAN_SVG },
  { kind: "car",      name: "Car Insurance",   detail: "Comprehensive cover",                      amount: "$148 / mo",    src: "/topView/topviewcar7.svg",    w: 138, h: 158 },
  { kind: "property", name: "Rental Income",   detail: "Unit B apartment",                        amount: "$800 / mo",    src: "/property/houseplan3.svg",    w: 160, h: 160 },
  { kind: "trip",     name: "Rome Weekend",    flag: "🇮🇹", detail: "Flights & restaurants",        amount: "€380 spent",   svgData: ITALY_SVG },
  { kind: "car",      name: "Lease Payment",   detail: "Monthly car cost",                        amount: "$420 / mo",    src: "/topView/topviewcar2.svg",    w: 128, h: 145 },
  { kind: "property", name: "Maintenance",     detail: "Repairs & upkeep",                        amount: "$340 / Q",     src: "/property/houseplan4.svg",    w: 210, h: 161 },
  { kind: "trip",     name: "Athens Holiday",  flag: "🇬🇷", detail: "All travel expenses",          amount: "€290 spent",   svgData: GREECE_SVG },
  { kind: "car",      name: "Service & Parts", detail: "Annual service",                          amount: "$240 total",   src: "/topView/topviewcar3.svg",    w: 128, h: 156 },
  { kind: "property", name: "HOA Fees",        detail: "Monthly dues",                            amount: "$180 / mo",    src: "/property/houseplan2.svg",    w: 220, h: 135 },
]

const INTERVAL = 3200

const CATEGORY_META = {
  trip:     { label: "Trips",      Icon: MapPin   },
  car:      { label: "Car Costs",  Icon: Car      },
  property: { label: "Properties", Icon: Building2 },
} as const

const fillProps = {
  fill: "currentColor",
  fillOpacity: 0.08,
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinejoin: "round" as const,
  strokeOpacity: 0.8,
}

// ── Component ──

export const DynamicLayoutsAnimation = memo(function DynamicLayoutsAnimation() {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setCurrent((c) => (c + 1) % SLIDES.length), INTERVAL)
    return () => clearInterval(id)
  }, [])

  const slide = SLIDES[current]
  const meta = CATEGORY_META[slide.kind]
  const MetaIcon = meta.Icon

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center gap-3 sm:gap-4 px-2">

      {/* Ambient glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <div className="w-64 h-64 sm:w-80 sm:h-80 bg-primary/15 rounded-full blur-[80px]" />
      </div>

      {/* Category chip — changes only when category changes */}
      <AnimatePresence mode="wait">
        <m.div
          key={`chip-${slide.kind}`}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 backdrop-blur-sm z-10"
        >
          <MetaIcon className="w-3 h-3 text-primary" />
          <span className="text-xs font-semibold text-primary tracking-wide">{meta.label}</span>
        </m.div>
      </AnimatePresence>

      {/* Main slide — visual + text, all in one spring-driven block */}
      <AnimatePresence mode="wait">
        <m.div
          key={current}
          initial={{ opacity: 0, x: 28, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -28, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 26, mass: 0.9 }}
          className="relative flex flex-col items-center gap-2 z-10 w-full"
          style={{ filter: "drop-shadow(0 0 16px color-mix(in srgb, var(--primary) 28%, transparent))" }}
        >
          {/* Visual */}
          <div className="flex items-center justify-center text-primary" style={{ minHeight: 140 }}>
            {slide.kind === "trip" && (
              <svg
                viewBox={`0 0 ${slide.svgData.w.toFixed(0)} ${slide.svgData.h.toFixed(0)}`}
                width={slide.svgData.w}
                height={slide.svgData.h}
                aria-label={`Map of ${slide.name}`}
              >
                <path d={slide.svgData.path} {...fillProps} />
              </svg>
            )}
            {(slide.kind === "car" || slide.kind === "property") && (
              <div
                aria-label={slide.kind === "car" ? "Vehicle outline" : "Property floor plan"}
                style={{
                  width: slide.w,
                  height: slide.h,
                  WebkitMaskImage: `url(${slide.src})`,
                  WebkitMaskSize: "contain",
                  WebkitMaskRepeat: "no-repeat",
                  WebkitMaskPosition: "center",
                  maskImage: `url(${slide.src})`,
                  maskSize: "contain",
                  maskRepeat: "no-repeat",
                  maskPosition: "center",
                  backgroundColor: "currentColor",
                  opacity: 0.75,
                }}
              />
            )}
          </div>

          {/* Text block */}
          <div className="text-center px-2">
            <p className="text-sm font-semibold text-foreground leading-snug">
              {slide.kind === "trip" ? `${slide.flag} ${slide.name}` : slide.name}
            </p>
            <p className="text-base font-bold text-primary mt-0.5 tabular-nums">{slide.amount}</p>
            <p className="text-[11px] text-muted-foreground/55 mt-0.5">{slide.detail}</p>
          </div>
        </m.div>
      </AnimatePresence>

      {/* Auto-progress bar — resets via key each slide */}
      <div className="w-full max-w-[180px] h-[2px] bg-foreground/10 rounded-full overflow-hidden z-10">
        <m.div
          key={current}
          className="h-full w-full bg-primary rounded-full"
          style={{ transformOrigin: "left center" }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: INTERVAL / 1000, ease: "linear" }}
        />
      </div>
    </div>
  )
})

DynamicLayoutsAnimation.displayName = "DynamicLayoutsAnimation"
