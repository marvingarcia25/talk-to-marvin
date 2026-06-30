import type { FaceRegions, Region } from './landmarks.ts'
import type { Mood } from '../mood/sentiment.ts'

export interface Frame {
  mouthOpen: number // 0..1
  blink: number // 0..1
  swayX: number // px
  swayY: number // px
  tilt: number // radians
  mood: Mood
}

const MOOD_TINT: Record<Mood, string | null> = {
  neutral: null,
  happy: 'rgba(255, 210, 120, 0.10)',
  excited: 'rgba(255, 140, 90, 0.12)',
  sad: 'rgba(90, 130, 200, 0.12)',
}

// Pure helper: where to sample the lower-mouth slice and how far it can drop.
export function mouthSliceRect(mouth: Region): { src: Region; lift: number } {
  const src: Region = {
    x: mouth.x,
    y: mouth.y + mouth.height * 0.5,
    width: mouth.width,
    height: mouth.height * 0.5,
  }
  return { src, lift: mouth.height * 0.6 }
}

function drawEyelid(ctx: CanvasRenderingContext2D, img: CanvasImageSource, eye: Region, blink: number): void {
  if (blink <= 0) return
  // Copy a skin slice just above the eye and stretch it down over the eye.
  const drop = eye.height * blink
  ctx.drawImage(
    img,
    eye.x, eye.y - eye.height, eye.width, eye.height, // source: brow/skin above eye
    eye.x, eye.y - eye.height, eye.width, eye.height + drop, // dest: stretched down
  )
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  regions: FaceRegions,
  frame: Frame,
  size: { w: number; h: number },
): void {
  const { w, h } = size
  ctx.clearRect(0, 0, w, h)
  ctx.save()
  // Sway + tilt around the center.
  ctx.translate(w / 2 + frame.swayX, h / 2 + frame.swayY)
  ctx.rotate(frame.tilt)
  ctx.translate(-w / 2, -h / 2)

  // Base portrait (cover-fit into the square).
  ctx.drawImage(img, 0, 0, w, h)

  // Mouth open: drop the lower-mouth slice and reveal a dark inner-mouth gap.
  if (frame.mouthOpen > 0) {
    const { src, lift } = mouthSliceRect(regions.mouth)
    const drop = lift * frame.mouthOpen
    ctx.fillStyle = 'rgba(40, 10, 15, 0.85)'
    ctx.fillRect(src.x, src.y, src.width, drop)
    ctx.drawImage(
      img,
      src.x, src.y, src.width, src.height,
      src.x, src.y + drop, src.width, src.height,
    )
  }

  // Blink.
  drawEyelid(ctx, img, regions.leftEye, frame.blink)
  drawEyelid(ctx, img, regions.rightEye, frame.blink)

  ctx.restore()

  // Mood tint as a full-canvas overlay (outside the transform).
  const tint = MOOD_TINT[frame.mood]
  if (tint) {
    ctx.fillStyle = tint
    ctx.fillRect(0, 0, w, h)
  }
}
