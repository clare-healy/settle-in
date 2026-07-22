// The application version.
//
// docs/implementation-treaty.md § Updates and migrations: "Application releases
// have an application version" — independent of the store schema version
// (store/db.ts DB_VERSION) and the class-input / as-taught schema versions
// (schema/index.ts). It is stamped into every as-taught export and whole-library
// backup so an exported record names the app that produced it.
//
// This is the single source of truth for that string. Bump it on a release; the
// golden as-taught fixtures pin it, so a bump is a deliberate, reviewed change.

export const APP_VERSION = '0.1.0';
