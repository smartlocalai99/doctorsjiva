# Apple-Style Doctor Portal Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the DRJIVA doctor portal into a calm, app-like Apple-inspired interface across login, dashboard, publishing, content, camps, reports, and profile without changing business behavior.

**Architecture:** Keep the existing Next.js pages, contexts, APIs, and Supabase contracts. Centralize visual decisions in `styles/globals.css` and the existing `AppShell`/shared components, then update each page only where layout or control composition needs page-specific treatment. Remove the bright custom focus rings while retaining a restrained active border for keyboard and assistive navigation.

**Tech Stack:** Next.js Pages Router, React, Tailwind CSS v4 via `@import "tailwindcss"`, Lucide icons, existing Supabase APIs.

## Global Constraints

- Preserve all existing authentication, data fetching, uploads, publishing, delete, and sign-out behavior.
- Use the existing DRJIVA blue as the accent; use semantic neutral surfaces and readable contrast.
- Keep mobile controls at least 44px high and preserve safe-area padding on the bottom navigation.
- Remove the custom `outline`/ring treatment; use border or background state without a glowing ring.
- Keep the login carousel and the fixed app-like viewport behavior.
- Do not add new UI dependencies.
- Validate every task with the narrowest relevant ESLint/build or browser check.

---

### Task 1: Establish Apple-style visual tokens and focus treatment

**Files:**
- Modify: `styles/globals.css`
- Test: `npx eslint pages/login.jsx pages/_document.js && npm run build`

**Interfaces:**
- Produces the shared classes and CSS tokens consumed by `AppShell` and all portal pages.

- [ ] Replace the current custom focus rule with a quiet active state: remove `outline: 3px solid ...` and `outline-offset`, then use `:focus-visible` only to strengthen border color/background without a ring.
- [ ] Consolidate page background, surface, separator, label, secondary-label, accent, destructive, and success values into the existing `@theme` tokens.
- [ ] Adjust shared buttons, form controls, panels, status labels, headings, and spacing to use fewer radii, quieter shadows, and 44px minimum interactive heights.
- [ ] Add reduced-motion handling for existing transitions and the login carousel using `@media (prefers-reduced-motion: reduce)`.
- [ ] Run `npx eslint pages/login.jsx pages/_document.js && npm run build`; expected result is a successful build.

### Task 2: Refine the shared shell and navigation

**Files:**
- Modify: `components/AppShell.jsx`
- Modify: `components/AppLogo.jsx`
- Modify: `styles/globals.css`
- Test: Browser check at `/` and `/profile` at 390px and 1440px.

**Interfaces:**
- Consumes the shared tokens from Task 1.
- Produces the stable desktop sidebar and mobile tab bar used by all authenticated routes.

- [ ] Keep the current six navigation destinations and route matching unchanged.
- [ ] Restyle the desktop sidebar as a quiet grouped navigation column with a clearer selected state and no decorative card nesting.
- [ ] Restyle the mobile header and bottom tabs for safe-area spacing, readable labels, and 44px touch targets.
- [ ] Preserve install prompt, avatar fallback, profile link, and sign-out behavior.
- [ ] Verify navigation links, active states, and sign-out remain functional in the browser.

### Task 3: Redesign the login experience

**Files:**
- Modify: `pages/login.jsx`
- Modify: `styles/globals.css`
- Modify: `pages/_document.js`
- Test: Browser checks for PIN entry and responsive layout.

**Interfaces:**
- Consumes the existing `useAuth().login(phone, code)` contract.
- Produces the app-like login screen with the moving image carousel, Indian flag phone prefix, four-digit PIN cells, and no test-access block.

- [ ] Keep the existing phone and four-digit code validation and error response.
- [ ] Keep the carousel motion but remove any logo block the user rejected.
- [ ] Keep the viewport metadata and horizontal overscroll prevention.
- [ ] Verify the phone field, PIN cells, disabled/enabled Continue state, and failed-login message.

### Task 4: Redesign dashboard and shared data surfaces

**Files:**
- Modify: `pages/index.jsx`
- Modify: `styles/globals.css`
- Test: Browser check at `/` with authenticated session or existing local test session.

**Interfaces:**
- Consumes existing workspace data and action handlers.
- Produces the primary doctor studio overview without changing data contracts.

- [ ] Establish a compact page header with one primary action.
- [ ] Convert metrics into grouped, scannable rows with icon plus label plus value, not nested decorative cards.
- [ ] Preserve all links, counts, loading states, and empty states.
- [ ] Verify the dashboard at mobile and desktop widths.

### Task 5: Redesign publishing, content, camps, and reports

**Files:**
- Modify: `pages/create.jsx`
- Modify: `pages/posts.jsx`
- Modify: `pages/camps.jsx`
- Modify: `pages/reports.jsx`
- Modify: `styles/globals.css`
- Test: `npx eslint pages/create.jsx pages/posts.jsx pages/camps.jsx pages/reports.jsx` and browser checks for forms, filters, and destructive actions.

**Interfaces:**
- Preserves all existing API calls, media selection, draft/publish operations, filters, report resolution, and delete flows.

- [ ] Make the create screen a focused editor with clear field grouping, visible publish state, and a single primary action.
- [ ] Make posts and camps list surfaces denser and easier to scan with consistent rows and status treatments.
- [ ] Make reports prioritize severity, date, subject, and the available resolution action.
- [ ] Retain all existing error/success feedback and confirmation behavior.
- [ ] Run the focused lint command and verify the primary workflows in the browser.

### Task 6: Redesign profile and finish responsive/accessibility pass

**Files:**
- Modify: `pages/profile.jsx`
- Modify: `styles/globals.css`
- Test: `npx eslint pages/profile.jsx && npm run build`; browser checks at 390px, 768px, and 1440px.

**Interfaces:**
- Preserves profile loading, avatar upload, field updates, and save behavior.
- Completes the shared visual and interaction language across the portal.

- [ ] Use a grouped profile header with clear identity, completion state, and editing controls.
- [ ] Preserve avatar upload, input labels, validation, and save feedback.
- [ ] Check all pages for clipped text, overflow, accidental horizontal scrolling, low contrast, and controls below 44px.
- [ ] Check reduced motion and keyboard navigation after removing focus rings; active controls must remain distinguishable without relying on color alone.
- [ ] Run the production build and record any unrelated baseline lint errors separately.
