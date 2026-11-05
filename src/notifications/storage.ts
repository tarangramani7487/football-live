// Native: SQLite-backed key-value store (AsyncStorage-compatible API), loaded only if the
// installed app contains expo-sqlite. Web uses storage.web.ts so SQLite's wasm isn't bundled.
import { has } from './native';

type KeyValueStore = typeof import('expo-sqlite/kv-store').default;

// eslint-disable-next-line @typescript-eslint/no-require-imports
export const Storage: KeyValueStore | null = has('ExpoSQLite') ? require('expo-sqlite/kv-store').default : null;
