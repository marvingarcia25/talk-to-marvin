import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'

export interface Region {
  x: number
  y: number
  width: number
  height: number
}

export interface FaceRegions {
  leftEye: Region
  rightEye: Region
  mouth: Region
}

export function fallbackRegions(w: number, h: number): FaceRegions {
  return {
    leftEye: { x: w * 0.30, y: h * 0.36, width: w * 0.16, height: h * 0.08 },
    rightEye: { x: w * 0.54, y: h * 0.36, width: w * 0.16, height: h * 0.08 },
    mouth: { x: w * 0.36, y: h * 0.62, width: w * 0.28, height: h * 0.10 },
  }
}

// Landmark index sets (MediaPipe FaceLandmarker, 468 pts).
const MOUTH = [61, 291, 0, 17, 13, 14]
const LEFT_EYE = [33, 133, 159, 145]
const RIGHT_EYE = [362, 263, 386, 374]

function boxFrom(
  points: Array<{ x: number; y: number }>,
  ids: number[],
  w: number,
  h: number,
  padX: number,
  padY: number,
): Region {
  const xs = ids.map((i) => points[i].x * w)
  const ys = ids.map((i) => points[i].y * h)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  return {
    x: minX - padX,
    y: minY - padY,
    width: maxX - minX + padX * 2,
    height: maxY - minY + padY * 2,
  }
}

export async function detectRegions(image: HTMLImageElement): Promise<FaceRegions> {
  const w = image.naturalWidth || image.width
  const h = image.naturalHeight || image.height
  try {
    const files = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm',
    )
    const landmarker = await FaceLandmarker.createFromOptions(files, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
      },
      runningMode: 'IMAGE',
      numFaces: 1,
    })
    const result = landmarker.detect(image)
    const pts = result.faceLandmarks?.[0]
    if (!pts) return fallbackRegions(w, h)
    return {
      leftEye: boxFrom(pts, LEFT_EYE, w, h, w * 0.02, h * 0.02),
      rightEye: boxFrom(pts, RIGHT_EYE, w, h, w * 0.02, h * 0.02),
      mouth: boxFrom(pts, MOUTH, w, h, w * 0.03, h * 0.03),
    }
  } catch (err) {
    console.warn('landmark detection failed, using fallback', err)
    return fallbackRegions(w, h)
  }
}
