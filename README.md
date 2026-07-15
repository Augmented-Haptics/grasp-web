# grasp-web

`app.grasp.it` — gated tester signup and download for Grasp. Static multi-page site
(Vite + TypeScript) deployed to GitHub Pages. Single origin so the Supabase session
extends to future platform/profile pages.

## Pages

- `/join` — new testers enter their email, receive the Confirm signup link.
- `/download` — session gate; signed-in testers see installers, others recover via an emailed code.

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
OTP gate are the protection. **Set the real `ANON_KEY` before deploy.**

## Deploy

Push to `main` → GitHub Action builds and deploys to Pages. `public/CNAME` maps the
domain; `noindex` is set via meta tags and `public/robots.txt`.
