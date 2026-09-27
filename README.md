<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# NivaraConnect — Smart Society Management Platform

**Live app:** https://nivaraconnect.onrender.com

## Run it on GitHub (Codespaces)

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/ShahidAli02-design/NivaraConnect)

Click the badge above (or **Code → Codespaces → Create codespace on main** on this repo). GitHub spins up a full cloud dev machine, installs everything, and starts the real Node server + Vite dev environment automatically — no local setup needed. A "NivaraConnect App" preview opens on port 3000 once it's ready (usually under a minute).

By default the codespace uses its own local seed data (isolated per codespace, resets when the codespace is deleted — this keeps random codespace sessions from writing into the live production data). To make a codespace share the same permanent database as the live deploy instead, add a [Codespaces secret](https://github.com/settings/codespaces) named `DATABASE_URL` (repository access: this repo) with the Neon Postgres connection string.

> Note: `.github/workflows/deploy-pages.yml` (GitHub Pages) does **not** work for this project — it's a full-stack app with a live backend and database, and GitHub Pages only serves static files. Use Codespaces or the Render link above instead.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
