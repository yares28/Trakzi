import type { BlogPost } from "./types"

export const esAuthor = {
  name: "Equipo Trakzi",
  role: "Documentación",
  bio: "El equipo de documentación de Trakzi escribe guías para ayudarte a aprovechar al máximo el presupuesto, el seguimiento de gastos y la gestión de gastos compartidos.",
}

export const esPosts: BlogPost[] = [
  {
    slug: "como-hacer-un-presupuesto",
    title: "Cómo Hacer un Presupuesto Personal",
    description:
      "Guía paso a paso para crear un presupuesto personal. Aprende la regla 50/30/20, el presupuesto base cero y el método de sobres — y cómo elegir el adecuado para ti.",
    date: "2026-03-15",
    author: esAuthor,
    readingTime: "8 min de lectura",
    tags: ["presupuesto", "guía"],
    relatedSlugs: ["como-controlar-gastos", "consejos-ahorro-supermercado"],
    content: `
## Descripción General

Un presupuesto es un plan para tu dinero. Sin uno, los gastos ocurren por accidente. Esta guía te lleva paso a paso para crear un presupuesto que funcione.

**Lo que necesitarás:**
- Tu ingreso mensual neto (después de impuestos)
- Las transacciones bancarias del último mes (exporta como CSV desde tu banco)
- 20 minutos

## Paso 1: Conoce tus Ingresos

Usa tu **ingreso neto** — lo que realmente llega a tu cuenta bancaria. Si tus ingresos varían, usa el menor de los últimos 3 meses.

| Tipo de Ingreso | Qué Usar |
|---|---|
| Salario fijo | Cantidad neta exacta |
| Freelance / variable | Menor de los últimos 3 meses |
| Múltiples fuentes | Suma de todas las fuentes (mes más bajo) |

## Paso 2: Rastrea tu Gasto Actual

Antes de establecer límites, ve a dónde va realmente tu dinero. Exporta tus transacciones bancarias como CSV y súbelas a [Trakzi](/es). Las transacciones se categorizan automáticamente al instante.

**Por qué importa:** La mayoría de la gente subestima su gasto en un 20-30%. Los datos superan las suposiciones.

## Paso 3: Elige un Método

### Regla 50/30/20

Divide los ingresos en tres bloques:
- **50%** — Necesidades (alquiler, supermercado, suministros, seguros)
- **30%** — Deseos (restaurantes, ocio, suscripciones)
- **20%** — Ahorro y pago de deudas

Ideal para: Principiantes. Simple, flexible, sin seguimiento por categoría.

### Presupuesto Base Cero

Asigna cada euro a una categoría. Ingresos menos todas las asignaciones = cero.

Ideal para: Quienes quieren control total. Requiere seguimiento semanal.

### Método de Sobres

Asigna cantidades fijas por categoría al inicio del mes. Cuando un sobre se vacía, dejas de gastar en esa categoría.

Ideal para: Quienes gastan de más y necesitan límites estrictos.

## Paso 4: Establece Límites

Mira tu gasto rastreado (Paso 2), luego establece límites por categoría:

- Sé realista — si gastas 400 €/mes en supermercado, no presupuestes 200 €
- Añade un 5-10% de colchón para gastos inesperados
- Automatiza el ahorro — transfiere al ahorro el día de cobro, antes de presupuestar

## Paso 5: Revisión Semanal

Establece un chequeo recurrente de 10 minutos:

1. ¿Cuánto se ha gastado este mes?
2. ¿Alguna categoría sobre el presupuesto?
3. Ajusta si es necesario

Un presupuesto es un documento vivo, no una configuración única.

## Errores Comunes

- **Demasiado estricto.** Deja espacio para disfrutar o lo abandonarás.
- **Ignorar costes irregulares.** Divide gastos anuales (seguros, suscripciones) por 12 y presupuesta mensualmente.
- **Sin seguimiento.** Un presupuesto sin seguimiento es solo una lista de deseos.
- **Rendirse.** Los meses malos ocurren. Reinicia y continúa.

## Próximos Pasos

- [Controla tus gastos →](/es/docs/como-controlar-gastos)
- [Reduce el gasto en supermercado →](/es/docs/consejos-ahorro-supermercado)
- [Crear una cuenta gratuita en Trakzi →](/sign-up)
    `,
  },
  {
    slug: "como-controlar-gastos",
    title: "Cómo Controlar Gastos",
    description:
      "Siete métodos probados para controlar gastos — desde papel y lápiz hasta escaneo de tickets con IA. Encuentra el método adecuado para tu flujo de trabajo.",
    date: "2026-03-10",
    author: esAuthor,
    readingTime: "6 min de lectura",
    tags: ["control de gastos", "guía"],
    relatedSlugs: ["como-hacer-un-presupuesto", "consejos-ahorro-supermercado"],
    content: `
## Descripción General

El control de gastos es la base de cualquier plan financiero. Sin saber a dónde va el dinero, el presupuesto es una suposición.

Esta guía cubre 7 métodos, ordenados del más simple al más completo.

## Método 1: Cuaderno

Anota cada compra en un cuaderno cuando ocurre.

- **Tiempo de configuración:** 0 minutos
- **Esfuerzo continuo:** Alto (hay que recordar escribir)
- **Calidad de datos:** Baja (sin totales, sin gráficos)
- **Ideal para:** Probar el seguimiento por primera vez

## Método 2: Sistema de Sobres

Retira efectivo por categoría al inicio del mes. Pon en sobres etiquetados. Cuando se vacía, dejas de gastar.

- **Tiempo de configuración:** 30 minutos
- **Esfuerzo continuo:** Medio
- **Calidad de datos:** Baja (solo físico)
- **Ideal para:** Quienes gastan de más y necesitan límites estrictos

## Método 3: Hoja de Cálculo

Crea un archivo en Google Sheets o Excel. Registra fecha, cantidad y categoría de cada compra.

- **Tiempo de configuración:** 15 minutos
- **Esfuerzo continuo:** Alto (entrada manual)
- **Calidad de datos:** Media (totales funcionan, gráficos requieren trabajo)
- **Ideal para:** Entusiastas de las hojas de cálculo

## Método 4: Importar CSV Bancario

Exporta transacciones de tu banco como CSV. Súbelo a una herramienta como [Trakzi](/es) que auto-categoriza y genera gráficos.

- **Tiempo de configuración:** 5 minutos
- **Esfuerzo continuo:** Bajo (exportar CSV mensualmente)
- **Calidad de datos:** Alta (auto-categorizado, más de 20 tipos de gráficos)
- **Ideal para:** La mayoría de la gente. Mejor equilibrio entre esfuerzo e información.

## Método 5: Escáner de Tickets

Fotografía los tickets. La IA extrae tienda, fecha, total y artículos automáticamente.

- **Tiempo de configuración:** 2 minutos
- **Esfuerzo continuo:** Bajo (hacer foto tras cada compra)
- **Calidad de datos:** Alta (captura compras en efectivo)
- **Ideal para:** Quienes pagan en efectivo regularmente

## Método 6: Conexión Bancaria

Conecta tu cuenta bancaria a una app. Las transacciones se sincronizan automáticamente.

- **Tiempo de configuración:** 10 minutos
- **Esfuerzo continuo:** Ninguno
- **Calidad de datos:** Alta
- **Ideal para:** Quienes se sienten cómodos compartiendo credenciales bancarias (soporte limitado fuera de EE.UU.)

## Método 7: Híbrido (Recomendado)

Combina importación de CSV (transacciones con tarjeta) + escaneo de tickets (compras en efectivo) en una sola herramienta.

- **Tiempo de configuración:** 5 minutos
- **Esfuerzo continuo:** Bajo
- **Calidad de datos:** La más alta (captura todo)
- **Ideal para:** Seguimiento completo y preciso

## Comparación

| Método | Configuración | Esfuerzo | Calidad | ¿Captura Efectivo? |
|---|---|---|---|---|
| Cuaderno | Ninguno | Alto | Baja | Sí |
| Sobres | 30 min | Medio | Baja | Sí |
| Hoja de cálculo | 15 min | Alto | Media | Manual |
| CSV Bancario | 5 min | Bajo | Alta | No |
| Escáner de Tickets | 2 min | Bajo | Alta | Sí |
| Conexión Bancaria | 10 min | Ninguno | Alta | No |
| Híbrido | 5 min | Bajo | La más alta | Sí |

## Primeros Pasos

1. Exporta tu último mes de transacciones bancarias
2. Sube a [Trakzi](/sign-up) — la auto-categorización empieza al instante
3. Escanea los tickets en efectivo que tengas
4. Revisa los gráficos generados

## Próximos Pasos

- [Crear un presupuesto →](/es/docs/como-hacer-un-presupuesto)
- [Controlar gastos de supermercado →](/es/docs/consejos-ahorro-supermercado)
- [Probar Trakzi gratis →](/sign-up)
    `,
  },
  {
    slug: "como-dividir-gastos-piso",
    title: "Cómo Dividir Gastos en un Piso Compartido",
    description:
      "Guía práctica para dividir gastos compartidos de forma justa. Cubre métodos, herramientas, reglas y situaciones comunes con compañeros de piso o pareja.",
    date: "2026-03-05",
    author: esAuthor,
    readingTime: "5 min de lectura",
    tags: ["gastos compartidos", "guía"],
    relatedSlugs: ["como-hacer-un-presupuesto", "como-controlar-gastos"],
    content: `
## Descripción General

Vivir en común significa gastos compartidos. Sin un sistema, rastrear quién pagó qué se convierte en fuente de conflicto. Esta guía cubre las reglas, métodos y herramientas que lo hacen justo.

## Las 3 Reglas

### 1. Decidir Antes de Gastar

Acuerda cómo dividir **antes** de que alguien pague. No asumas — confirma.

### 2. Registrar al Momento

Añade el gasto en el momento en que ocurre. La memoria desaparece en horas.

### 3. Saldar Regularmente

No dejes que los saldos crezcan durante meses. Saldar semanal o quincenalmente.

## Métodos de División

### División Igualitaria

Todos pagan la misma cantidad. El enfoque más simple.

**Ideal para:** Compañeros de piso con uso e ingresos similares.

### División por Uso

Divide según el consumo. Habitación más grande = más alquiler. Más duchas = más agua.

**Ideal para:** Grupos donde el consumo varía significativamente.

### División por Ingresos

Quien gana más paga proporcionalmente más.

**Ideal para:** Parejas con diferencias de ingresos.

### División Detallada

Cada persona paga exactamente lo que compró.

**Ideal para:** Compra de supermercado con necesidades dietéticas diferentes.

## Qué Dividir

**Dividir esto:**
- Alquiler
- Suministros (electricidad, agua, gas, internet)
- Supermercado compartido
- Productos del hogar
- Suscripciones compartidas
- Comidas compartidas

**No dividir:**
- Supermercado personal
- Suscripciones personales
- Ropa, artículos personales
- Comidas en solitario

## Configurar en Trakzi

1. Ve a la sección Habitaciones en [Trakzi](/sign-up)
2. Crea una nueva habitación y nómbrala (ej. "Piso")
3. Invita a compañeros de piso por enlace o código
4. Añade gastos cuando ocurran — elige cómo dividir cada uno
5. Ve saldos en tiempo real

Cada gasto actualiza el balance del grupo al instante. Todos ven quién debe qué.

## Situaciones Comunes

**Alguien se mudó a mitad de mes:** Prorratea alquiller y costes fijos por días ocupados.

**Una persona compra todo el supermercado:** Añade como gasto compartido, divide equitativamente o por consumo.

**Suscripción de streaming compartida:** Divide equitativamente — todos se benefician igual.

**Un invitado se queda una semana:** El anfitrión cubre o el invitado contribuye — decide de antemano.

## Cómo Tener "La Conversación del Dinero"

1. Elige un momento tranquilo — no durante una discusión
2. Sé específico: "Acordemos cómo dividimos supermercado y suministros"
3. Escribe el acuerdo
4. Usa una herramienta para rastrear (elimina el error humano)
5. Revisa mensualmente

## Próximos Pasos

- [Crear una habitación compartida →](/sign-up)
- [Controlar gastos personales →](/es/docs/como-controlar-gastos)
- [Hacer un presupuesto →](/es/docs/como-hacer-un-presupuesto)
    `,
  },
  {
    slug: "consejos-ahorro-supermercado",
    title: "Cómo Reducir tu Presupuesto de Supermercado",
    description:
      "Consejos prácticos para reducir el gasto en supermercado un 25-35% sin comer peor. Planificación de menús, comparación de tiendas, compras de temporada y reducción de desperdicio.",
    date: "2026-02-28",
    author: esAuthor,
    readingTime: "7 min de lectura",
    tags: ["presupuesto supermercado", "ahorro", "guía"],
    relatedSlugs: ["como-hacer-un-presupuesto", "como-controlar-gastos"],
    content: `
## Descripción General

El supermercado consume típicamente el 10-15% de los ingresos del hogar. Reducir eso un 30% ahorra 90-135 €/mes para un hogar con ingresos de 3.000 € — más de 1.000 €/año.

Estos consejos están ordenados por impacto.

## Paso 1: Rastrea Primero

Antes de optimizar, mide. Escanea tickets de supermercado durante un mes para ver:
- Total gastado por tienda
- Gasto por categoría (frescos, lácteos, carne, snacks)
- Frecuencia de compra

Usa [Trakzi](/es) para escanear tickets — extrae tienda, total y fecha automáticamente.

## Consejo 1: Planifica Menús Semanalmente

Planifica 5 cenas antes de ir al supermercado. Revisa lo que tienes. Compra solo lo que necesitas.

**Impacto:** Reduce el desperdicio de comida un 25-30% y elimina compras impulsivas.

## Consejo 2: Compra con Lista

Escribe la lista antes de salir. Organízala por secciones de la tienda. No te desvíes.

**Impacto:** Reduce el gasto un 10-20% vs. comprar sin lista.

## Consejo 3: Compara Tiendas

Rastrea gastos en 2-3 tiendas durante un mes. Hallazgos comunes:

| Tipo de Tienda | Diferencia de Precio |
|---|---|
| Descuento (Aldi, Lidl, Mercadona) | 20-40% más barato en básicos |
| Supermercados premium | A veces más barato en productos específicos |
| Tiendas online a granel | Mejor para productos no perecederos |

## Consejo 4: Compra de Temporada

Los productos fuera de temporada cuestan 2-3 veces más. Guía de temporada:

- **Primavera:** Espárragos, fresas, guisantes
- **Verano:** Tomates, pimientos, melocotones
- **Otoño:** Calabaza, manzanas, tubérculos
- **Invierno:** Cítricos, col, coles de Bruselas

## Consejo 5: Reduce el Desperdicio

El hogar promedio tira el 20-30% de la comida comprada. Soluciones:

- Revisa la nevera antes de ir al supermercado
- FIFO: Primero en Entrar, Primero en Salir
- Congela sobras antes de que se estropeen
- Compra cantidades más pequeñas más a menudo

## Consejo 6: Cocina a Granel

Cocinar en grandes cantidades reduce el coste por comida significativamente:

| Plato | Coste | Raciones | Coste por Comida |
|---|---|---|---|
| Sopa | 8 € | 6 | 1,33 € |
| Salsa de pasta | 6 € | 5 | 1,20 € |
| Arroz con ingredientes | 7 € | 4 | 1,75 € |

## Consejo 7: Corta Snacks y Bebidas

Los snacks y bebidas tienen el mayor margen. Sustituciones:

- Refresco → agua con limón
- Fruta cortada → fruta entera
- Barritas energéticas → mezcla de frutos secos casera
- Ensaladas preparadas → ingredientes frescos

## Consejo 8: Compra Una Vez por Semana

Cada visita a la tienda es una oportunidad de compra impulsiva. Planifica un viaje, cúmplelo.

**Impacto:** Quienes compran 3 veces/semana gastan un 30% más que quienes compran 1 vez/semana.

## Consejo 9: Usa Programas de Fidelización

- **Mercadona:** Precios bajos diarios (sin tarjeta necesaria)
- **Carrefour:** Tarjeta de fidelización con descuentos personalizados
- **Lidl:** App con cupones digitales semanales

Regístrate en cada tienda que uses regularmente.

## Resumen de Ahorros

| Consejo | Ahorro Potencial |
|---|---|
| Planificación de menús | 15-25% |
| Compra con lista | 10-20% |
| Comparar tiendas | 10-30% |
| Compra de temporada | 10-20% |
| Reducir desperdicio | 10-20% |
| Cocina a granel | 15-25% |
| Cortar snacks/bebidas | 5-15% |

**Ahorro realista combinado: 25-35%** del gasto actual en supermercado.

## Próximos Pasos

- [Empezar a rastrear supermercado →](/sign-up)
- [Crear un presupuesto →](/es/docs/como-hacer-un-presupuesto)
- [Controlar todos los gastos →](/es/docs/como-controlar-gastos)
    `,
  },
]

export function getEsPostBySlug(slug: string): BlogPost | undefined {
  return esPosts.find((p) => p.slug === slug)
}

export function getAllEsSlugs(): string[] {
  return esPosts.map((p) => p.slug)
}

export function getEsRelatedPosts(currentSlug: string): BlogPost[] {
  const current = getEsPostBySlug(currentSlug)
  if (!current?.relatedSlugs) return []
  return current.relatedSlugs
    .map((s) => getEsPostBySlug(s))
    .filter((p): p is BlogPost => p !== undefined)
}
