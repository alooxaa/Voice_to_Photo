import { describe, expect, it } from 'vitest';

import { adjustBrightness, grayscale, rotateClockwise, type Bitmap } from './engine';
import { History } from './history';

/** Build a bitmap from a list of [r, g, b, a] pixels. */
function bitmap(width: number, height: number, pixels: number[][]): Bitmap {
  return { width, height, data: new Uint8ClampedArray(pixels.flat()) };
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

describe('grayscale', () => {
  it('makes all three channels equal', () => {
    const [r, g, b, a] = grayscale(bitmap(1, 1, [[255, 0, 0, 255]])).data;
    expect(r).toBe(g);
    expect(g).toBe(b);
    expect(r).toBe(76);
    expect(a).toBe(255);
  });
});

describe('rotateClockwise', () => {
  it('swaps width and height and moves pixels clockwise', () => {
    // 2×1 picture: A B  →  1×2 picture:  A
    //                                    B
    const A = [1, 1, 1, 255];
    const B = [2, 2, 2, 255];
    const result = rotateClockwise(bitmap(2, 1, [A, B]));
    expect(result.width).toBe(1);
    expect(result.height).toBe(2);
    expect(Array.from(result.data)).toEqual([...A, ...B]);
  });

  it('returns to the original after four turns', () => {
    const input = bitmap(3, 2, [
      [1, 0, 0, 255],
      [2, 0, 0, 255],
      [3, 0, 0, 255],
      [4, 0, 0, 255],
      [5, 0, 0, 255],
      [6, 0, 0, 255],
    ]);
    let result = input;
    for (let turn = 0; turn < 4; turn++) result = rotateClockwise(result);
    expect(result).toEqual(input);
  });
});

describe('History', () => {
  it('undoes in reverse order and respects its limit', () => {
    const history = new History<number>(2);
    history.push(1);
    history.push(2);
    history.push(3);
    expect(history.pop()).toBe(3);
    expect(history.pop()).toBe(2);
    expect(history.canUndo).toBe(false);
    expect(history.pop()).toBeUndefined();
  });
});
