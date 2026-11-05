// Match alerts are native-only, so web keeps follows in memory (no SQLite/wasm in the web bundle).
export const Storage = null as { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> } | null;
