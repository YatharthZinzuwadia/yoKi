# Guide 04 — Put it online for free

## Option A — Cloudflare Pages via GitHub (recommended: free, fast worldwide, auto-deploys)

1. Create an **empty private repo** on GitHub named `yoki`. Don't add a README.
2. Push the project:

   ```bash
   cd "/home/yoki/Desktop/work shi/yoKi/yoki-mythobiography-v2.0-final-vision-pack"
   git remote add origin git@github.com:YatharthZinzuwadia/yoki.git
   git push -u origin main
   ```
3. Go to https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → pick the `yoki` repo.
4. Build settings:

   | Setting | Value |
   |---|---|
   | Framework preset | None |
   | Build command | `yarn build` |
   | Build output directory | `dist` |
   | Environment variable | `NODE_VERSION` = `22` (or newer) |
5. **Save and Deploy.** You get a `*.pages.dev` URL. Every `git push` redeploys automatically.
6. (Optional) **Custom domain:** in the Pages project, go to Custom domains → add your domain.

## Option B — Netlify drag-and-drop (no Git needed)

```bash
yarn build
```

Then open https://app.netlify.com/drop and drag the `dist` folder onto the page. You get a URL in seconds.

## Before sharing

- Run `yarn build && yarn preview` and watch the whole film once on the built version.
- The loader's content line (`18+ · …`) is already there.
