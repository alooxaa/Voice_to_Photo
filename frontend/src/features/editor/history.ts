/**
 * Undo and redo: earlier states (newest last) and states that were undone.
 * The size is capped so a long session does not fill the memory with bitmaps.
 */
export class History<T> {
  private readonly past: T[] = [];
  private readonly future: T[] = [];
  private readonly limit: number;

  constructor(limit = 20) {
    this.limit = limit;
  }

  /** Remember `state` before a new change replaces it. A new change clears redo. */
  push(state: T): void {
    this.past.push(state);
    if (this.past.length > this.limit) this.past.shift();
    this.future.length = 0;
  }

  /** Go one step back from `current`; undefined when there is nothing to undo. */
  undo(current: T): T | undefined {
    const previous = this.past.pop();
    if (previous !== undefined) this.future.push(current);
    return previous;
  }

  /** Go one step forward again; undefined when nothing was undone. */
  redo(current: T): T | undefined {
    const next = this.future.pop();
    if (next !== undefined) this.past.push(current);
    return next;
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }
}
