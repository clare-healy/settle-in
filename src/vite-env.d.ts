/// <reference types="vite/client" />

// Raw text imports used only by the dev bootstrap (guarded by import.meta.env.DEV
// so nothing under fixtures/ ships in the production bundle).
declare module '*.md?raw' {
  const content: string;
  export default content;
}

// CSS side-effect imports.
declare module '*.css';
