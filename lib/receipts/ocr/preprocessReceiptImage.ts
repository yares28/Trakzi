import sharp from "sharp"

const MAX_OUTPUT_DIMENSION = 2000
const DESKEW_ANGLES = [-2, -1, 0, 1, 2]
const DESKEW_SAMPLE_WIDTH = 600
const DESKEW_THRESHOLD = 180

type DeskewScore = {
  angle: number
  score: number
}

export type PreprocessReceiptImageResult = {
  buffer: Uint8Array
  mimeType: string
  meta: {
    deskewAngle: number
    trimmed: boolean
    width: number
    height: number
  }
}

async function scoreDeskewAngle(input: Buffer, angle: number): Promise<DeskewScore> {
  const { data, info } = await sharp(input, { failOnError: false })
    .rotate(angle, { background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .resize({ width: DESKEW_SAMPLE_WIDTH, withoutEnlargement: true })
    .grayscale()
    .normalize()
    .threshold(DESKEW_THRESHOLD)
    .raw()
    .toBuffer({ resolveWithObject: true })

  const width = info.width || 1
  const height = info.height || 1
  const channels = info.channels || 1
  const rowSums = new Array<number>(height).fill(0)

  for (let y = 0; y < height; y += 1) {
    let rowSum = 0
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * channels
      const value = data[idx] ?? 255
      if (value < 128) rowSum += 1
    }
    rowSums[y] = rowSum
  }

  const mean = rowSums.reduce((sum, value) => sum + value, 0) / height
  const variance =
    rowSums.reduce((sum, value) => sum + (value - mean) ** 2, 0) / height

  return { angle, score: variance }
}

async function estimateDeskewAngle(input: Buffer): Promise<number> {
  const scores: DeskewScore[] = []

  for (const angle of DESKEW_ANGLES) {
    try {
      const score = await scoreDeskewAngle(input, angle)
      scores.push(score)
    } catch {
      // Skip scoring errors for a specific angle.
    }
  }

  if (scores.length === 0) return 0

  scores.sort((a, b) => b.score - a.score)
  return scores[0].angle
}

export async function preprocessReceiptImage(params: {
  data: Uint8Array | Buffer
  mimeType: string
}): Promise<PreprocessReceiptImageResult> {
  const buffer = params.data instanceof Buffer ? params.data : Buffer.from(params.data)
  const deskewAngle = await estimateDeskewAngle(buffer)

  let pipeline = sharp(buffer, { failOnError: false }).rotate()

  if (deskewAngle !== 0) {
    pipeline = pipeline.rotate(deskewAngle, {
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
  }

  const trimmedPipeline = pipeline.trim({ threshold: 10 })
  const normalizedPipeline = trimmedPipeline
    .resize({ width: MAX_OUTPUT_DIMENSION, height: MAX_OUTPUT_DIMENSION, fit: "inside", withoutEnlargement: true })
    .normalize()
    .sharpen()

  const { data, info } = await normalizedPipeline.png().toBuffer({ resolveWithObject: true })

  return {
    buffer: new Uint8Array(data),
    mimeType: "image/png",
    meta: {
      deskewAngle,
      trimmed: true,
      width: info.width ?? 0,
      height: info.height ?? 0,
    },
  }
}
