/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Absolute backend URL (e.g. "https://nivaraconnect.onrender.com/api") for
  // deployments where the frontend is hosted separately from the API, like
  // GitHub Pages. Leave unset for same-origin deployments (Render, local,
  // Codespaces) — requests then use relative "/api" paths as before.
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
