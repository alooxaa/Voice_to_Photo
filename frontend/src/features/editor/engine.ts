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

function blank(width: number, height: number): Bitmap {
  return { width, height, data: new Uint8ClampedArray(width * height * 4) };
}

/** Apply `change` to the colour of every pixel; alpha stays as it was. */
function mapColours(image: Bitmap, change: (r: number, g: number, b: number) => number[]): Bitmap {
  const result = blank(image.width, image.height);
  const from = image.data;
  const to = result.data;
  for (let i = 0; i < from.length; i += 4) {
    const [r, g, b] = change(from[i], from[i + 1], from[i + 2]);
    to[i] = r;
    to[i + 1] = g;
    to[i + 2] = b;
    to[i + 3] = from[i + 3];
  }
  return result;
}

/** Perceived brightness of a colour (ITU-R BT.601 weights). */
function luma(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

// ---------------------------------------------------------------- light

/** Multiply every colour channel; 1.15 is 15% brighter, 0.85 is 15% darker. */
export function adjustBrightness(image: Bitmap, factor: number): Bitmap {
  return mapColours(image, (r, g, b) => [r * factor, g * factor, b * factor]);
}

/** Push colours away from (factor > 1) or towards (factor < 1) middle grey. */
export function adjustContrast(image: Bitmap, factor: number): Bitmap {
  const stretch = (value: number) => (value - 128) * factor + 128;
  return mapColours(image, (r, g, b) => [stretch(r), stretch(g), stretch(b)]);
}

// ---------------------------------------------------------------- colour

/** 0 is grey, 1 leaves the picture as it is, above 1 makes colours stronger. */
export function adjustSaturation(image: Bitmap, factor: number): Bitmap {
  return mapColours(image, (r, g, b) => {
    const gray = luma(r, g, b);
    return [gray + (r - gray) * factor, gray + (g - gray) * factor, gray + (b - gray) * factor];
  });
}

/** Replace colours with their perceived brightness. */
export function grayscale(image: Bitmap): Bitmap {
  return mapColours(image, (r, g, b) => {
    const gray = luma(r, g, b);
    return [gray, gray, gray];
  });
}

/** The brown tint of old photographs (the classic sepia matrix). */
export function sepia(image: Bitmap): Bitmap {
  return mapColours(image, (r, g, b) => [
    0.393 * r + 0.769 * g + 0.189 * b,
    0.349 * r + 0.686 * g + 0.168 * b,
    0.272 * r + 0.534 * g + 0.131 * b,
  ]);
}

/** Positive `shift` adds red and removes blue (warmer); negative does the opposite. */
export function adjustTemperature(image: Bitmap, shift: number): Bitmap {
  return mapColours(image, (r, g, b) => [r + shift, g, b - shift]);
}

/** Every colour becomes its opposite, like a film negative. */
export function invert(image: Bitmap): Bitmap {
  return mapColours(image, (r, g, b) => [255 - r, 255 - g, 255 - b]);
}

// ---------------------------------------------------------------- shape

/** Copy the pixel at (fromX, fromY) of `image` to (toX, toY) of `result`. */
function copyPixel(
  image: Bitmap,
  fromX: number,
  fromY: number,
  result: Bitmap,
  toX: number,
  toY: number,
) {
  const from = (fromY * image.width + fromX) * 4;
  const to = (toY * result.width + toX) * 4;
  result.data[to] = image.data[from];
  result.data[to + 1] = image.data[from + 1];
  result.data[to + 2] = image.data[from + 2];
  result.data[to + 3] = image.data[from + 3];
}

/** Turn the picture 90° clockwise: width and height swap places. */
export function rotateClockwise(image: Bitmap): Bitmap {
  const result = blank(image.height, image.width);
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      // Pixel (x, y) moves to column (height - 1 - y), row x of the new picture.
      copyPixel(image, x, y, result, image.height - 1 - y, x);
    }
  }
  return result;
}

/** Turn the picture 90° counter-clockwise. */
export function rotateCounterClockwise(image: Bitmap): Bitmap {
  const result = blank(image.height, image.width);
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      copyPixel(image, x, y, result, y, image.width - 1 - x);
    }
  }
  return result;
}

/** Mirror left and right. */
export function flipHorizontal(image: Bitmap): Bitmap {
  const result = blank(image.width, image.height);
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      copyPixel(image, x, y, result, image.width - 1 - x, y);
    }
  }
  return result;
}

/** Turn upside down (top and bottom swap). */
export function flipVertical(image: Bitmap): Bitmap {
  const result = blank(image.width, image.height);
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      copyPixel(image, x, y, result, x, image.height - 1 - y);
    }
  }
  return result;
}

/** Cut out a rectangle of the picture. */
export function crop(image: Bitmap, left: number, top: number, width: number, height: number) {
  const result = blank(width, height);
  for (let y = 0; y < height; y++) {
    const start = ((top + y) * image.width + left) * 4;
    result.data.set(image.data.subarray(start, start + width * 4), y * width * 4);
  }
  return result;
}

/** The largest square from the centre of the picture. */
export function cropSquare(image: Bitmap): Bitmap {
  const side = Math.min(image.width, image.height);
  const left = Math.floor((image.width - side) / 2);
  const top = Math.floor((image.height - side) / 2);
  return crop(image, left, top, side, side);
}

/** Zoom in by keeping the centre `keep` part (0.9 = cut 10% away). */
export function zoomIn(image: Bitmap, keep = 0.9): Bitmap {
  const width = Math.max(1, Math.round(image.width * keep));
  const height = Math.max(1, Math.round(image.height * keep));
  const left = Math.floor((image.width - width) / 2);
  const top = Math.floor((image.height - height) / 2);
  return crop(image, left, top, width, height);
}

// ---------------------------------------------------------------- effects

/**
 * Box blur in two passes (rows, then columns), each a running average over
 * `radius` pixels on both sides. Two cheap passes look almost like a
 * Gaussian blur and stay fast on large photos. Edges repeat their last pixel.
 */
export function blur(image: Bitmap, radius: number): Bitmap {
  const r = Math.max(1, Math.round(radius));
  return blurPass(blurPass(image, r, true), r, false);
}

function blurPass(image: Bitmap, radius: number, horizontal: boolean): Bitmap {
  const { width, height } = image;
  const result = blank(width, height);
  const lines = horizontal ? height : width;
  const length = horizontal ? width : height;
  const window = radius * 2 + 1;
  const index = (line: number, position: number) =>
    (horizontal ? line * width + position : position * width + line) * 4;
  const clamp = (position: number) => Math.min(length - 1, Math.max(0, position));

  for (let line = 0; line < lines; line++) {
    for (let channel = 0; channel < 4; channel++) {
      let sum = 0;
      for (let k = -radius; k <= radius; k++) sum += image.data[index(line, clamp(k)) + channel];
      for (let position = 0; position < length; position++) {
        result.data[index(line, position) + channel] = sum / window;
        sum += image.data[index(line, clamp(position + radius + 1)) + channel];
        sum -= image.data[index(line, clamp(position - radius)) + channel];
      }
    }
  }
  return result;
}

/** Unsharp mask: add back the difference between the picture and a blurred copy. */
export function sharpen(image: Bitmap, amount: number): Bitmap {
  const soft = blur(image, 1);
  const result = blank(image.width, image.height);
  for (let i = 0; i < image.data.length; i += 4) {
    for (let channel = 0; channel < 3; channel++) {
      const value = image.data[i + channel];
      result.data[i + channel] = value + amount * (value - soft.data[i + channel]);
    }
    result.data[i + 3] = image.data[i + 3];
  }
  return result;
}

/** Darken the edges, more towards the corners; `strength` 0.5 is a soft vignette. */
export function vignette(image: Bitmap, strength: number): Bitmap {
  const { width, height } = image;
  const result = blank(width, height);
  const centreX = (width - 1) / 2;
  const centreY = (height - 1) / 2;
  const farthest = Math.hypot(centreX, centreY) || 1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const distance = Math.hypot(x - centreX, y - centreY) / farthest;
      // No change in the middle, then a smooth fall towards the corners.
      const t = Math.min(1, Math.max(0, (distance - 0.45) / 0.55));
      const factor = 1 - strength * t * t * (3 - 2 * t);
      const i = (y * width + x) * 4;
      result.data[i] = image.data[i] * factor;
      result.data[i + 1] = image.data[i + 1] * factor;
      result.data[i + 2] = image.data[i + 2] * factor;
      result.data[i + 3] = image.data[i + 3];
    }
  }
  return result;
}

/** Big square blocks of one colour each, like an old video game. */
export function pixelate(image: Bitmap, blockSize: number): Bitmap {
  const size = Math.max(2, Math.round(blockSize));
  const { width, height } = image;
  const result = blank(width, height);
  for (let top = 0; top < height; top += size) {
    for (let left = 0; left < width; left += size) {
      const bottom = Math.min(height, top + size);
      const right = Math.min(width, left + size);
      const sums = [0, 0, 0, 0];
      for (let y = top; y < bottom; y++) {
        for (let x = left; x < right; x++) {
          const i = (y * width + x) * 4;
          for (let channel = 0; channel < 4; channel++) sums[channel] += image.data[i + channel];
        }
      }
      const count = (bottom - top) * (right - left);
      for (let y = top; y < bottom; y++) {
        for (let x = left; x < right; x++) {
          const i = (y * width + x) * 4;
          for (let channel = 0; channel < 4; channel++)
            result.data[i + channel] = sums[channel] / count;
        }
      }
    }
  }
  return result;
}

// ---------------------------------------------------------------- smart

/**
 * Automatic improvement: stretch the brightness range so the darkest 0.5% of
 * pixels become black and the brightest 0.5% white (auto-levels), then add a
 * little contrast and colour. Pictures that already use the full range only
 * get the small contrast and colour boost.
 */
export function autoEnhance(image: Bitmap): Bitmap {
  const histogram = new Array<number>(256).fill(0);
  for (let i = 0; i < image.data.length; i += 4) {
    histogram[Math.round(luma(image.data[i], image.data[i + 1], image.data[i + 2]))]++;
  }
  const pixels = image.data.length / 4;
  const percentile = (share: number) => {
    let seen = 0;
    for (let level = 0; level < 256; level++) {
      seen += histogram[level];
      if (seen >= pixels * share) return level;
    }
    return 255;
  };
  const low = percentile(0.005);
  const high = percentile(0.995);

  const levelled =
    high - low > 10
      ? mapColours(image, (r, g, b) => {
          const stretch = (value: number) => ((value - low) * 255) / (high - low);
          return [stretch(r), stretch(g), stretch(b)];
        })
      : image;
  return adjustSaturation(adjustContrast(levelled, 1.08), 1.15);
}
