# Hosting pyiiphyomaung.com (domain registered via Cloudflare)

Since you registered the domain through Cloudflare Registrar, your DNS already lives on Cloudflare. You have two good paths. **Pick one** — don't mix them.

---

## Path A — Vercel (recommended: zero-config for Next.js)

Vercel is made by the Next.js team. Auto-deploys on every `git push`, free tier covers personal sites comfortably, SSL is automatic.

### 1. Push the project to GitHub

```bash
cd /Users/pyiiphyomaung/Programming/personal-website

# If you haven't set up a GitHub repo yet:
#   1. Create an empty repo at https://github.com/new (name: personal-website)
#   2. Don't initialize with README/license (this repo already has content)

git add -A
git commit -m "Initial personal website"
git branch -M main
git remote add origin git@github.com:austenppm/personal-website.git
git push -u origin main
```

### 2. Import the project on Vercel

1. Sign in to https://vercel.com with your GitHub account.
2. **Add New → Project → Import** `austenppm/personal-website`.
3. Framework preset auto-detects as **Next.js**. Leave all defaults.
4. Click **Deploy**. First build takes ~1 minute.
5. You'll get a free `personal-website-xxx.vercel.app` URL — open it to confirm the site works.

### 3. Add the custom domain

1. In the Vercel project: **Settings → Domains**.
2. Add `pyiiphyomaung.com` and `www.pyiiphyomaung.com`.
3. Vercel will show the DNS records you need to add. For a Cloudflare-registered domain they typically are:
   - `A` record: `@` → `76.76.21.21`
   - `CNAME` record: `www` → `cname.vercel-dns.com`
4. In **Cloudflare Dashboard → your domain → DNS → Records**:
   - Add both records exactly as Vercel specified.
   - **Important:** Set the proxy status (the orange cloud) to **DNS only** (gray cloud) for both records. If you leave the orange cloud on, you can get redirect loops and invalid-cert errors because Cloudflare and Vercel will both try to terminate TLS.
5. Back in Vercel, the domain status will flip to ✅ within a couple of minutes. Vercel auto-issues a Let's Encrypt cert.

### 4. Pushing updates

```bash
git add -A && git commit -m "..." && git push
```

Every push to `main` auto-deploys to production. Branches get free preview URLs (handy for trying a redesign without touching the live site).

---

## Path B — Cloudflare Pages (everything stays on Cloudflare)

If you prefer to keep DNS + hosting + domain all on one account, this works too.

### 1. Push to GitHub (same as Path A, Step 1)

### 2. Create a Pages project

1. Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
2. Pick `austenppm/personal-website`.
3. Framework preset: **Next.js**. Cloudflare will set:
   - Build command: `npx @cloudflare/next-on-pages@1`
   - Build output: `.vercel/output/static`
   - Node version: `20` or later
4. Deploy.

### 3. Add the domain

1. Pages project → **Custom domains → Set up a custom domain** → `pyiiphyomaung.com`.
2. Cloudflare auto-creates the DNS record (since the domain is already on Cloudflare). Leave proxy status on (orange cloud is fine here — same account).
3. Add `www.pyiiphyomaung.com` the same way if you want it.

### Caveats
- Cloudflare Pages doesn't run the full Next.js server — it uses the `@cloudflare/next-on-pages` adapter. For a static-rendered portfolio (what we have) it's fine. If you later add Next.js features that need a Node runtime (middleware, image optimization, server actions with heavy deps), Vercel will be less friction.

---

## Which should you pick?

- **Vercel** — you value zero setup and want the fastest happy path. Recommended.
- **Cloudflare Pages** — you want one vendor, or you plan to use Cloudflare Workers/R2/KV alongside.

Both are free for a personal site.

---

## Local dev reference

```bash
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint     # eslint
```
