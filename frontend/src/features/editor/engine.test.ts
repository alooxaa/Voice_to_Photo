import { describe, expect, it } from 'vitest';

import {
  adjustBrightness,
  adjustContrast,
  adjustSaturation,
  adjustTemperature,
  autoEnhance,
  blur,
  cropSquare,
  flipHorizontal,
  flipVertical,
  grayscale,
  invert,
  pixelate,
  rotateClockwise,
  rotateCounterClockwise,
  sepia,
  sharpen,
  vignette,
  zoomIn,
  type Bitmap,
} from './engine';
import { History } from './history';

/** Build a bitmap from a list of [r, g, b, a] pixels. */
function bitmap(width: number, height: number, pixels: number[][]): Bitmap {
  return { width, height, data: new Uint8ClampedArray(pixels.flat()) };
}

/** Only the red channel of every pixel, which is enough to follow pixels around. */
function reds(image: Bitmap): number[] {
  return Array.from(image.data).filter((_, index) => index % 4 === 0);
}

describe('adjustBrightness', () => {
  it('scales colour channels and keeps alpha', () => {
    const result = adjustBrightness(bitmap(1, 1, [[100, 200, 0, 128]]), 1.15);
    expect(Array.from(result.data)).toEqual([115, 230, 0, 128]);
  });

  it('clamps at 255 instead of overflowing', () => {
    const result = adjustBrightness(bitmap(1, 1, [[250, 250, 250, 255]]), 1.15);
    expect(Array.from(result.data)).toEqual([255, 255, 255, 255]);
  });

  it('does not change the input bitmap', () => {
    const input = bitmap(1, 1, [[100, 100, 100, 255]]);
    adjustBrightness(input, 0.85);
    expect(Array.from(input.data)).toEqual([100, 100, 100, 255]);
  });
});

describe('colour operations', () => {
  const red = () => bitmap(1, 1, [[200, 50, 50, 255]]);

  it('grayscale makes all three channels equal', () => {
    const [r, g, b, a] = grayscale(bitmap(1, 1, [[255, 0, 0, 255]])).data;
    expect([r, g, b, a]).toEqual([76, 76, 76, 255]);
  });

  it('contrast pushes channels away from middle grey', () => {
    expect(Array.from(adjustContrast(red(), 2).data)).toEqual([255, 0, 0, 255]);
  });

  it('saturation 0 is grey and 1 changes nothing', () => {
    const [r, g, b] = adjustSaturation(red(), 0).data;
    expect(r).toBe(g);
    expect(g).toBe(b);
    expect(Array.from(adjustSaturation(red(), 1).data)).toEqual([200, 50, 50, 255]);
  });

  it('sepia gives a warm brown', () => {
    const [r, g, b] = sepia(bitmap(1, 1, [[100, 100, 100, 255]])).data;
    expect(r).toBeGreaterThan(g);
    expect(g).toBeGreaterThan(b);
  });

  it('warmer adds red and removes blue', () => {
    expect(Array.from(adjustTemperature(red(), 10).data)).toEqual([210, 50, 40, 255]);
  });

  it('invert flips every colour and keeps alpha', () => {
    const result = invert(bitmap(1, 1, [[0, 100, 255, 128]]));
    expect(Array.from(result.data)).toEqual([255, 155, 0, 128]);
  });
});

describe('shape operations', () => {
  // 3×2 picture: 1 2 3
  //              4 5 6
  const picture = () =>
    bitmap(
      3,
      2,
      [1, 2, 3, 4, 5, 6].map((n) => [n, 0, 0, 255]),
    );

  it('rotateClockwise swaps width and height and moves pixels clockwise', () => {
    const turned = rotateClockwise(picture());
    expect([turned.width, turned.height]).toEqual([2, 3]);
    expect(reds(turned)).toEqual([4, 1, 5, 2, 6, 3]);
  });

  it('returns to the original after four turns', () => {
    let result = picture();
    for (let turn = 0; turn < 4; turn++) result = rotateClockwise(result);
    expect(result).toEqual(picture());
  });

  it('rotates counter-clockwise, and back with a clockwise turn', () => {
    const turned = rotateCounterClockwise(picture());
    expect(reds(turned)).toEqual([3, 6, 2, 5, 1, 4]);
    expect(rotateClockwise(turned)).toEqual(picture());
  });

  it('mirrors left-right and turns upside down', () => {
    expect(reds(flipHorizontal(picture()))).toEqual([3, 2, 1, 6, 5, 4]);
    expect(reds(flipVertical(picture()))).toEqual([4, 5, 6, 1, 2, 3]);
  });

  it('crops the centre square', () => {
    const square = cropSquare(picture());
    expect([square.width, square.height]).toEqual([2, 2]);
    expect(reds(square)).toEqual([1, 2, 4, 5]);
  });

  it('zooms in by keeping the centre', () => {
    const big = bitmap(
      10,
      10,
      Array.from({ length: 100 }, (_, n) => [n, 0, 0, 255]),
    );
    const zoomed = zoomIn(big, 0.8);
    expect([zoomed.width, zoomed.height]).toEqual([8, 8]);
    expect(zoomed.data[0]).toBe(11); // pixel (1, 1) of the original
  });
});

describe('effects', () => {
  const stripes = () =>
    bitmap(4, 1, [
      [0, 0, 0, 255],
      [255, 255, 255, 255],
      [0, 0, 0, 255],
      [255, 255, 255, 255],
    ]);

  it('blur evens out neighbouring pixels', () => {
    const [first] = blur(stripes(), 1).data;
    expect(first).toBeGreaterThan(0);
    expect(first).toBeLessThan(255);
  });

  it('blur keeps a flat colour flat', () => {
    const flat = bitmap(
      3,
      3,
      Array.from({ length: 9 }, () => [90, 90, 90, 255]),
    );
    expect(blur(flat, 2)).toEqual(flat);
  });

  it('sharpen makes edges stronger', () => {
    const soft = bitmap(3, 1, [
      [100, 100, 100, 255],
      [150, 150, 150, 255],
      [200, 200, 200, 255],
    ]);
    const sharp = sharpen(soft, 1);
    expect(sharp.data[0]).toBeLessThan(100);
    expect(sharp.data[8]).toBeGreaterThan(200);
  });

  it('vignette darkens the corners, not the centre', () => {
    const light = bitmap(
      5,
      5,
      Array.from({ length: 25 }, () => [200, 200, 200, 255]),
    );
    const result = vignette(light, 0.5);
    expect(result.data[(2 * 5 + 2) * 4]).toBe(200);
    expect(result.data[0]).toBeLessThan(200);
  });

  it('pixelate fills each block with its average colour', () => {
    expect(reds(pixelate(stripes(), 2))).toEqual([128, 128, 128, 128]);
  });

  it('auto-enhance stretches a dull picture to the full range', () => {
    const dull = bitmap(2, 1, [
      [100, 100, 100, 255],
      [150, 150, 150, 255],
    ]);
    expect(reds(autoEnhance(dull))).toEqual([0, 255]);
  });
});

describe('History', () => {
  it('undoes in reverse order and respects its limit', () => {
    const history = new History<number>(2);
    history.push(1);
    history.push(2);
    history.push(3);
    expect(history.undo(4)).toBe(3);
    expect(history.undo(3)).toBe(2);
    expect(history.canUndo).toBe(false);
    expect(history.undo(2)).toBeUndefined();
  });

  it('redoes what was undone until a new change is made', () => {
    const history = new History<string>();
    history.push('a');
    expect(history.undo('b')).toBe('a');
    expect(history.redo('a')).toBe('b');
    expect(history.undo('b')).toBe('a');
    history.push('a');
    expect(history.canRedo).toBe(false);
  });
});
