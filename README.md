# grasp-web

`app.grasp.it` — gated signup and download for Grasp It. Static multi-page site
(Vite + TypeScript) deployed to GitHub Pages. Single origin so the Supabase session
extends to future platform/profile pages.

## Develop

```sh
npm install
npm run dev        # local dev server
npm run build      # typecheck + production build → dist/
npm run preview    # serve the built dist/
```

## Config

`src/config.ts` holds the public Supabase URL, publishable anon key, and the
`latest.json` pointer. All values are safe in a static bundle; RLS and the runtime
OTP gate are the protection.

## Deploy

Push to `main` → GitHub Action builds and deploys to Pages. `public/CNAME` maps the
domain; `noindex` is set via meta tags and `public/robots.txt`.
</content>
</invoke>
