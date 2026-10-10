/**
 * Undo history: a list of earlier states, newest last.
 * The size is capped so a long session does not fill the memory with bitmaps.
 */
export class History<T> {
  private readonly past: T[] = [];
  private readonly limit: number;

  constructor(limit = 20) {
    this.limit = limit;
  }

  /** Remember `state` before it is replaced by a new one. */
  push(state: T): void {
    this.past.push(state);
    if (this.past.length > this.limit) this.past.shift();
  }

  /** The state to go back to, or undefined when there is nothing to undo. */
  pop(): T | undefined {
    return this.past.pop();
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }
}
