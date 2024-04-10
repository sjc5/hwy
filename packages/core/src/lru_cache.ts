class Item<V> {
  key: string;
  value: V;
  neverMoveToFront: boolean;

  constructor(key: string, value: V, neverMoveToFront: boolean) {
    this.key = key;
    this.value = value;
    this.neverMoveToFront = neverMoveToFront;
  }
}

export class LRUCache<V> {
  private items: Map<string, Item<V>>;
  private maxItems: number;

  constructor(maxItems: number) {
    this.items = new Map();
    this.maxItems = maxItems;
  }

  get(key: string): V | undefined {
    const item = this.items.get(key);
    if (!item) {
      return undefined;
    }
    if (!item.neverMoveToFront) {
      this.items.delete(key);
      this.items.set(key, item);
    }
    return item.value;
  }

  set(key: string, value: V, neverMoveToFront: boolean = false): void {
    const existingItem = this.items.get(key);
    if (existingItem) {
      if (!existingItem.neverMoveToFront) {
        this.items.delete(key);
        this.items.set(key, new Item(key, value, neverMoveToFront));
      } else {
        existingItem.value = value;
      }
      return;
    }
    if (this.items.size >= this.maxItems) {
      this.evict();
    }
    this.items.set(key, new Item(key, value, neverMoveToFront));
  }

  private evict(): void {
    const oldestKey = this.items.keys().next().value;
    if (oldestKey !== undefined) {
      this.items.delete(oldestKey);
    }
  }
}
