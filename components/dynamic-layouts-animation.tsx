"use client"

import { memo, useEffect, useState } from "react"
import { m, AnimatePresence } from "framer-motion"
import { Globe2, Car, Home } from "lucide-react"
import { cn } from "@/lib/utils"

type Coords = [number, number][]

// ── Country coordinate data (mainland polygons from world-countries GeoJSON) ──

const FRANCE_COORDS: Coords = [[3.588184,50.378992],[4.286023,49.907497],[4.799222,49.985373],[5.674052,49.529484],[5.897759,49.442667],[6.18632,49.463803],[6.65823,49.201958],[8.099279,49.017784],[7.593676,48.333019],[7.466759,47.620582],[7.192202,47.449766],[6.736571,47.541801],[6.768714,47.287708],[6.037389,46.725779],[6.022609,46.27299],[6.5001,46.429673],[6.843593,45.991147],[6.802355,45.70858],[7.096652,45.333099],[6.749955,45.028518],[7.007562,44.254767],[7.549596,44.127901],[7.435185,43.693845],[6.529245,43.128892],[4.556963,43.399651],[3.100411,43.075201],[2.985999,42.473015],[1.826793,42.343385],[0.701591,42.795734],[0.338047,42.579546],[-1.502771,43.034014],[-1.901351,43.422802],[-1.384225,44.02261],[-1.193798,46.014918],[-2.225724,47.064363],[-2.963276,47.570327],[-4.491555,47.954954],[-4.59235,48.68416],[-3.295814,48.901692],[-1.616511,48.644421],[-1.933494,49.776342],[-0.989469,49.347376],[1.338761,50.127173],[1.639001,50.946606],[2.513573,51.148506],[2.658422,50.796848],[3.123252,50.780363],[3.588184,50.378992]]

const JAPAN_COORDS: Coords = [[140.976388,37.142074],[140.59977,36.343983],[140.774074,35.842877],[140.253279,35.138114],[138.975528,34.6676],[137.217599,34.606286],[135.792983,33.464805],[135.120983,33.849071],[135.079435,34.596545],[133.340316,34.375938],[132.156771,33.904933],[130.986145,33.885761],[132.000036,33.149992],[131.33279,31.450355],[130.686318,31.029579],[130.20242,31.418238],[130.447676,32.319475],[129.814692,32.61031],[129.408463,33.296056],[130.353935,33.604151],[130.878451,34.232743],[131.884229,34.749714],[132.617673,35.433393],[134.608301,35.731618],[135.677538,35.527134],[136.723831,37.304984],[137.390612,36.827391],[138.857602,37.827485],[139.426405,38.215962],[140.05479,39.438807],[139.883379,40.563312],[140.305783,41.195005],[141.368973,41.37856],[141.914263,39.991616],[141.884601,39.180865],[140.959489,38.174001],[140.976388,37.142074]]

const ITALY_COORDS: Coords = [[12.376485,46.767559],[13.806475,46.509306],[13.69811,46.016778],[13.93763,45.591016],[13.141606,45.736692],[12.328581,45.381778],[12.383875,44.885374],[12.261453,44.600482],[12.589237,44.091366],[13.526906,43.587727],[14.029821,42.761008],[15.14257,41.95514],[15.926191,41.961315],[16.169897,41.740295],[15.889346,41.541082],[16.785002,41.179606],[17.519169,40.877143],[18.376687,40.355625],[18.480247,40.168866],[18.293385,39.810774],[17.73838,40.277671],[16.869596,40.442235],[16.448743,39.795401],[17.17149,39.4247],[17.052841,38.902871],[16.635088,38.843572],[16.100961,37.985899],[15.684087,37.908849],[15.687963,38.214593],[15.891981,38.750942],[16.109332,38.964547],[15.718814,39.544072],[15.413613,40.048357],[14.998496,40.172949],[14.703268,40.60455],[14.060672,40.786348],[13.627985,41.188287],[12.888082,41.25309],[12.106683,41.704535],[11.191906,42.355425],[10.511948,42.931463],[10.200029,43.920007],[9.702488,44.036279],[8.888946,44.366336],[8.428561,44.231228],[7.850767,43.767148],[7.435185,43.693845],[7.549596,44.127901],[7.007562,44.254767],[6.749955,45.028518],[7.096652,45.333099],[6.802355,45.70858],[6.843593,45.991147],[7.273851,45.776948],[7.755992,45.82449],[8.31663,46.163642],[8.489952,46.005151],[8.966306,46.036932],[9.182882,46.440215],[9.922837,46.314899],[10.363378,46.483571],[10.442701,46.893546],[11.048556,46.751359],[11.164828,46.941579],[12.153088,47.115393],[12.376485,46.767559]]

const MOROCCO_COORDS: Coords = [[-5.193863,35.755182],[-4.591006,35.330712],[-3.640057,35.399855],[-2.604306,35.179093],[-2.169914,35.168396],[-1.792986,34.527919],[-1.733455,33.919713],[-1.388049,32.864015],[-1.124551,32.651522],[-1.307899,32.262889],[-2.616605,32.094346],[-3.06898,31.724498],[-3.647498,31.637294],[-3.690441,30.896952],[-4.859646,30.501188],[-5.242129,30.000443],[-6.060632,29.7317],[-7.059228,29.579228],[-8.674116,28.841289],[-8.66559,27.656426],[-8.817809,27.656426],[-9.413037,27.088476],[-9.735343,26.860945],[-10.189424,26.860945],[-10.551263,26.990808],[-11.392555,26.883424],[-11.71822,26.104092],[-12.030759,26.030866],[-12.500963,24.770116],[-13.89111,23.691009],[-14.221168,22.310163],[-14.630833,21.86094],[-14.750955,21.5006],[-17.002962,21.420734],[-16.973248,21.885745],[-16.589137,22.158234],[-16.261922,22.67934],[-16.326414,23.017768],[-15.982611,23.723358],[-15.426004,24.359134],[-15.089332,24.520261],[-14.824645,25.103533],[-14.800926,25.636265],[-14.43994,26.254418],[-13.773805,26.618892],[-13.139942,27.640148],[-12.618837,28.038186],[-11.688919,28.148644],[-10.900957,28.832142],[-10.399592,29.098586],[-9.564811,29.933574],[-9.814718,31.177736],[-9.434793,32.038096],[-9.300693,32.564679],[-8.657476,33.240245],[-7.654178,33.697065],[-6.912544,34.110476],[-6.244342,35.145865],[-5.929994,35.759988],[-5.193863,35.755182]]

const GREECE_COORDS: Coords = [[26.604196,41.562115],[26.294602,40.936261],[26.056942,40.824123],[25.447677,40.852545],[24.925848,40.947062],[23.714811,40.687129],[24.407999,40.124993],[23.899968,39.962006],[23.342999,39.960998],[22.813988,40.476005],[22.626299,40.256561],[22.849748,39.659311],[23.350027,39.190011],[22.973099,38.970903],[23.530016,38.510001],[24.025025,38.219993],[24.040011,37.655015],[23.115003,37.920011],[23.409972,37.409991],[22.774972,37.30501],[23.154225,36.422506],[22.490028,36.41],[21.670026,36.844986],[21.295011,37.644989],[21.120034,38.310323],[20.730032,38.769985],[20.217712,39.340235],[20.150016,39.624998],[20.615,40.110007],[20.674997,40.435],[20.99999,40.580004],[21.02004,40.842727],[21.674161,40.931275],[22.055378,41.149866],[22.597308,41.130487],[22.76177,41.3048],[22.952377,41.337994],[23.692074,41.309081],[24.492645,41.583896],[25.197201,41.234486],[26.106138,41.328899],[26.117042,41.826905],[26.604196,41.562115]]

// ── SVG path computation ──

function toPath(
  coords: Coords,
  maxW = 240,
  maxH = 200,
  pad = 12
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
  if (aspect > maxW / maxH) {
    h = maxW / aspect
  } else {
    w = maxH * aspect
  }
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

// Pre-compute at module load (server + client both fine – pure math)
const FRANCE_SVG = toPath(FRANCE_COORDS)
const JAPAN_SVG = toPath(JAPAN_COORDS)
const ITALY_SVG = toPath(ITALY_COORDS)
const MOROCCO_SVG = toPath(MOROCCO_COORDS)
const GREECE_SVG = toPath(GREECE_COORDS)

// ── Slide definitions ──
// Vehicles from /topView/ and houses from /property/ — actual app assets
// Rendered via CSS mask so they inherit the primary orange colour.

type Slide =
  | { kind: "country"; name: string; flag: string; svgData: { path: string; w: number; h: number } }
  | { kind: "vehicle"; name: string; src: string; w: number; h: number }
  | { kind: "house"; name: string; src: string; w: number; h: number }

// Car aspect ratios derived from their viewBox dims (e.g. topviewcar3: 1076×1316 ≈ 0.818)
// House aspect ratios: houseplan1 600×327 ≈ 1.835 | houseplan2 600×367 ≈ 1.635
// Sizes bumped ~50% to fill more of the card and reduce empty space.
const SLIDES: Slide[] = [
  { kind: "country", name: "France", flag: "🇫🇷", svgData: FRANCE_SVG },
  { kind: "vehicle", name: "Vehicle Tracking", src: "/topView/topviewcar3.svg", w: 140, h: 170 },
  { kind: "country", name: "Japan", flag: "🇯🇵", svgData: JAPAN_SVG },
  { kind: "house", name: "Property Tracking", src: "/property/houseplan1.svg", w: 280, h: 152 },
  { kind: "country", name: "Italy", flag: "🇮🇹", svgData: ITALY_SVG },
  { kind: "vehicle", name: "Vehicle Tracking", src: "/topView/topviewcar5.svg", w: 140, h: 170 },
  { kind: "country", name: "Morocco", flag: "🇲🇦", svgData: MOROCCO_SVG },
  { kind: "house", name: "Property Tracking", src: "/property/houseplan2.svg", w: 280, h: 170 },
  { kind: "country", name: "Greece", flag: "🇬🇷", svgData: GREECE_SVG },
]

const CATEGORY_META = {
  country: { label: "Countries", Icon: Globe2 },
  vehicle: { label: "Vehicles", Icon: Car },
  house: { label: "Properties", Icon: Home },
} as const

// ── Shared SVG props ──

const fillProps = {
  fill: "currentColor",
  fillOpacity: 0.08,
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinejoin: "round" as const,
  strokeOpacity: 0.75,
}

// ── Component ──

export const DynamicLayoutsAnimation = memo(function DynamicLayoutsAnimation() {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setCurrent((c) => (c + 1) % SLIDES.length), 2600)
    return () => clearInterval(id)
  }, [])

  const slide = SLIDES[current]
  const meta = CATEGORY_META[slide.kind]
  const MetaIcon = meta.Icon

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center gap-3 sm:gap-4">
      {/* Ambient glow blob */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <div className="w-72 h-72 sm:w-80 sm:h-80 bg-primary/20 rounded-full blur-[70px]" />
      </div>

      {/* Category chip */}
      <AnimatePresence mode="wait">
        <m.div
          key={`chip-${slide.kind}`}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 backdrop-blur-sm z-10"
        >
          <MetaIcon className="w-3 h-3 text-primary" />
          <span className="text-xs font-semibold text-primary tracking-wide">{meta.label}</span>
        </m.div>
      </AnimatePresence>

      {/* Main visual */}
      <AnimatePresence mode="wait">
        <m.div
          key={current}
          initial={{ opacity: 0, scale: 0.82, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.88, y: -14 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex items-center justify-center text-primary z-10"
          style={{
            filter: "drop-shadow(0 0 12px color-mix(in srgb, var(--primary) 35%, transparent))",
          }}
        >
          {slide.kind === "country" && (
            <svg
              viewBox={`0 0 ${slide.svgData.w.toFixed(0)} ${slide.svgData.h.toFixed(0)}`}
              width={slide.svgData.w}
              height={slide.svgData.h}
              aria-label={`Map outline of ${slide.name}`}
            >
              <path d={slide.svgData.path} {...fillProps} />
            </svg>
          )}

          {(slide.kind === "vehicle" || slide.kind === "house") && (
            /* CSS mask renders the actual app SVG tinted in --primary orange */
            <div
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
                opacity: 0.72,
              }}
              aria-label={slide.kind === "vehicle" ? "Vehicle outline" : "House floor plan outline"}
            />
          )}
        </m.div>
      </AnimatePresence>

      {/* Name tag */}
      <AnimatePresence mode="wait">
        <m.p
          key={`label-${current}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="text-sm font-medium text-foreground/60 z-10 tracking-wide"
        >
          {slide.kind === "country" && `${slide.flag} ${slide.name}`}
          {slide.kind === "vehicle" && slide.name}
          {slide.kind === "house" && slide.name}
        </m.p>
      </AnimatePresence>

      {/* Progress dots */}
      <div className="flex gap-1.5 z-10">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setCurrent(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={cn(
              "h-1 rounded-full transition-all duration-300",
              i === current ? "w-4 bg-primary" : "w-1 bg-foreground/20 hover:bg-foreground/40"
            )}
          />
        ))}
      </div>
    </div>
  )
})

DynamicLayoutsAnimation.displayName = "DynamicLayoutsAnimation"
