export const ORDER_STEP = 1024;

/**
 * FLOAT order strategy: the new order sits strictly between its neighbours (R15.3),
 * so a move updates one row. The result is positive whenever `next` is positive.
 */
export function computeOrder(prev: number | null, next: number | null): number {
  if (prev === null && next === null) return ORDER_STEP;
  if (prev === null) return next! / 2;
  if (next === null) return prev + ORDER_STEP;
  return (prev + next) / 2;
}

/** Order for inserting at `index` into a list already sorted by order (the moved item excluded). */
export function orderAtIndex(sortedOrders: number[], index: number): number {
  const i = Math.max(0, Math.min(index, sortedOrders.length));
  return computeOrder(i > 0 ? sortedOrders[i - 1] : null, i < sortedOrders.length ? sortedOrders[i] : null);
}
