/**
 * Pixel operations for the photo editor.
 *
 * Every function is pure: it takes a bitmap and returns a new one, never
 * changing its input. That makes undo trivial (keep the old bitmap) and lets
 * the functions be tested without a browser canvas.
 */

/** The same shape as the browser's ImageData: RGBA bytes, row by row. */
export interface Bitmap {
  width: number;
  height: number;
  data: Uint8ClampedArray<ArrayBuffer>;
}

/** Multiply every colour channel; 1.15 is 15% brighter, 0.85 is 15% darker. */
export function adjustBrightness(image: Bitmap, factor: number): Bitmap {
  const data = new Uint8ClampedArray(image.data.length);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = image.data[i] * factor;
    data[i + 1] = image.data[i + 1] * factor;
    data[i + 2] = image.data[i + 2] * factor;
    data[i + 3] = image.data[i + 3];
  }
  return { width: image.width, height: image.height, data };
}

/** Replace colours with their perceived brightness (ITU-R BT.601 weights). */
export function grayscale(image: Bitmap): Bitmap {
  const data = new Uint8ClampedArray(image.data.length);
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * image.data[i] + 0.587 * image.data[i + 1] + 0.114 * image.data[i + 2];
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
    data[i + 3] = image.data[i + 3];
  }
  return { width: image.width, height: image.height, data };
}

/** Turn the picture 90° clockwise: width and height swap places. */
export function rotateClockwise(image: Bitmap): Bitmap {
  const { width, height } = image;
  const data = new Uint8ClampedArray(image.data.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Pixel (x, y) moves to column (height - 1 - y), row x of the new picture.
      const from = (y * width + x) * 4;
      const to = (x * height + (height - 1 - y)) * 4;
      data[to] = image.data[from];
      data[to + 1] = image.data[from + 1];
      data[to + 2] = image.data[from + 2];
      data[to + 3] = image.data[from + 3];
    }
  }
  return { width: height, height: width, data };
}
