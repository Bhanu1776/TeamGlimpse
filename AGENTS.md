# TeamGlimpse — Agent Guide

## What This Is

TeamGlimpse is a mobile-first PWA that answers "who's in today?" for small co-located teams. Users set a daily status (Going / WFH / Maybe / Not decided), pin teammates they care about, and get reminder nudges.

**Current phase:** Frontend-only with a localStorage mock data layer. No real backend. No Supabase. No real push delivery.

## Stack

- Next.js 16 App Router, TypeScript, Tailwind CSS v4
- shadcn/ui components in `src/components/ui/`
- lucide-react icons, date-fns, sonner toasts, zod (localStorage validation)
- pnpm, Node 20

## Key Conventions

- **All data access goes through `@/lib/data/client.ts`** — never import from `mock-client.ts` directly in screens.
- Types live in `src/types/domain.ts`. Add new domain types there, not inline.
- Feature logic lives in `src/features/<feature>/`. Route pages in `src/app/<route>/page.tsx` should stay thin (import the feature component and render it).
- Use `cn()` from `@/lib/utils` (clsx + tailwind-merge) for conditional class names.
- All `dataClient` methods are async (`Promise`-returning) — even the mock. This ensures the Supabase swap is mechanical later.
- localStorage round-trips are zod-validated. On parse failure: reseed, toast "Mock data reset."
- No dark mode in v1.
- No backend, no auth, no real push in this phase.

## Directory Map

```
src/
  app/                   Next.js App Router routes
  components/
    app-shell/           TopBar + BottomNav shell
    ui/                  shadcn-generated (do not hand-edit)
  features/              Feature-level components/hooks
  lib/
    auth/                mock session hook + redirect logic
    data/                client interface + mock implementation + storage utils
    pwa/                 service worker registration
    push/                notification permission helpers (no-op stubs)
    utils/               cn.ts, dates.ts
  types/domain.ts        All domain types
```

## Running Locally

```bash
pnpm dev         # start dev server on :3000
pnpm build       # production build
pnpm lint        # eslint
pnpm tsc --noEmit  # type check
```

## Swapping Mock for Supabase (later)

Replace `src/lib/data/mock-client.ts` with `src/lib/data/supabase-client.ts` implementing the same interface exported from `client.ts`. No screen-level changes needed.
