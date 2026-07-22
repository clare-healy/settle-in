// The store's public surface: durable IndexedDB access, the migration scaffold,
// record types, and the projection rebuild used for transactional projections
// and recovery equivalence checks. No DOM, no run orchestration (that is src/run).

export * from './types.js';
export * from './projections.js';
export {
  DB_NAME,
  DB_VERSION,
  openDatabase,
  type OpenOptions,
  type SettleInDB,
  type SettleInDatabase,
} from './db.js';
export { Store, type BeginRunResult, type PutClassResult, type RunPatch } from './store.js';
