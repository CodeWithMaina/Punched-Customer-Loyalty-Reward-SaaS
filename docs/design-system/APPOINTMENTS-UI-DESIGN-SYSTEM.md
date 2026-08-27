# APPOINTMENTS UI DESIGN SYSTEM

> Reference implementation: `punched-pwd/app/dashboard/business/appointments/**`
> Status vocabulary: `punched-pwd/lib/appointment-status.ts`
> UI primitives: `punched-pwd/components/ui/*`
> Design tokens: `punched-pwd/app/globals.css` (60-30-10 theme system)

This document extracts the design language of the Business Appointments module and defines
the rules every future module (Staff, Customers, Loyalty Programs, Stamp Cards, Rewards,
Analytics, Settings) must inherit so the whole product feels like one coherent experience.

---

## 1. Executive Summary

The Appointments module is an **operational, mobile-first dashboard page** built from:

- A **sticky page header** with title, description, and a single primary action.
- A **summary strip** of metric cards answering "what is happening now / what needs attention".
- A **view switcher** (Calendar | List) over one shared, filtered dataset.
- A **control bar** (search + filters) operating on that dataset — inline selects on desktop,
  a collapsible panel on mobile toggled from the header.
- A **day-schedule calendar** (week date strip + hour grid + live current-time indicator) or a
  **card list**, both rendering the same information anatomy.
- A responsive **Drawer** (bottom sheet on mobile → right drawer on desktop) for entity details
  and status actions, and a **Modal** for short creation forms.
- Shared primitives (`Button`, `Badge`/`StatusBadge`, `Tabs`, `Skeleton`, `EmptyState`,
  `ErrorState`, `Pagination`, `Avatar`, `Select`, `FormField`) from `components/ui`.
- Page-local state in `_hooks`, presentation in `_components`, composition only in `page.tsx`.

Its coherence comes from five things: **one primary action per context**, **status as a semantic
badge everywhere**, **CSS-variable theming (60-30-10)**, **responsive transformation instead of
shrinkage**, and **strict layering** (primitive → product component → domain component → page).

---
## 2. Appointment UX Philosophy

### 2.1 Operational Clarity
The screen must answer instantly:
```
What is happening now?   → Current-time indicator on the calendar, "Today" summary card
What is happening next?  → Upcoming count; calendar is time-ordered
What needs attention?    → "Needs attention" (pending) summary card; pending badges
What can I do?           → One primary action (Book), contextual status actions in the drawer
```
Implementation signals: summary cards sit above everything; the calendar header says
"Focused on current time and upcoming appointments"; the live clock indicator ticks every 30s.

### 2.2 Information Hierarchy
```
Page Context      (header title/description — text-lg/xl bold)
↓
Primary Action    (Book appointment — brand Button, header right)
↓
Operational Pulse (summary metric cards)
↓
Controls          (view tabs, search, filters — small, quiet)
↓
Primary Data      (calendar events / appointment cards — customer + service bold)
↓
Metadata          (10px uppercase tertiary labels: TIME · DURATION · STAFF · PRICE)
↓
Secondary Actions (View details, Reschedule, Cancel — outline/ghost, card footer)
```
Communicated via size (text-sm body vs text-[10px] labels), weight (bold vs medium),
color tokens (`--text-primary` > `-secondary` > `-tertiary`), position (top → bottom),
and grouping (cards, hairline dividers).

### 2.3 Calm Enterprise UI
- One border per surface group; hairline `--border` / `--border-light` dividers inside cards.
- Rounded-but-restrained corners: `rounded-xl`/`--radius-md` controls, `--radius-lg`/`rounded-2xl`
  surfaces. Never pill-shaped panels (pills are reserved for badges/count chips).
- Color budget follows **60-30-10**: 60% neutral surface, 30% brand (primary buttons, active tab,
  selected states), 10% accent (current-time indicator, today dot).
- Elevation is rare: `shadow-card` on Card, `shadow-elevated` on overlays only.
- No gradients, no decorative illustration; icons come from lucide at h-4 w-4.
- Animations are short (150–350ms) and disabled under `prefers-reduced-motion`.

---

## 3. Design Principles

1. **One dataset, many views.** Filters apply across Calendar and List; switching views never
   changes the data.
2. **Status is semantic, never just color.** `StatusBadge` = tinted pill + dot + text label from a
   single source of truth (`lib/appointment-status.ts`).
3. **Mobile-first transformation.** Bottom sheet → side drawer; inline selects → collapsible
   panel; header button label shortens ("Book"); a floating full-width Book button appears on
   mobile (`lg:hidden fixed bottom-5`).
4. **Composition-only pages.** `page.tsx` wires hooks to components; all markup lives in
   `_components`, all data logic in `_hooks`, all formatting in `_utils`.
5. **Shared vocabulary.** Statuses live in lib status files; variant maps in `Badge.tsx`; unknown
   statuses degrade to neutral — domain data can never break the UI.
6. **Touch targets ≥ 36–40px.** Buttons h-10/h-12, IconButtons ≥ 36px, card action rows
   min-h-[40px].
7. **Accessibility as structure.** ARIA tabs pattern with arrow keys, `role="tabpanel"` pairs,
   aria-labels on icon-only/date controls, `aria-live` counts, focus rings via `--brand-ring`.

---
## 4. Page Architecture

Derived from `business/appointments/page.tsx`:

```
Page (min-h-screen bg-background)
│
├── AppointmentsHeader          ← sticky top-0 z-30, surface/95 + backdrop-blur, border-b
│   ├── Title (truncate, text-lg sm:text-xl bold)
│   ├── Description (hidden on mobile, text-xs secondary)
│   └── Actions: [IconButton SlidersHorizontal (lg:hidden)] [Button sm + Plus "Book"]
│
├── main (mx-auto max-w-[1600px] px-4 py-5 pb-24 sm:px-6 lg:px-8 lg:py-8)
│   ├── SummaryCards            ← grid-cols-2 gap-3 lg:grid-cols-4
│   ├── AppointmentViewTabs     ← Tabs (Calendar | Appointments), mb-6
│   ├── AppointmentFilters      ← search always visible; desktop-inline / mobile-collapsed
│   └── View panel              ← AppointmentCalendar | AppointmentList (role=tabpanel)
│
├── AppointmentDetailsDrawer    ← conditional, driven by selectedId
├── Floating mobile book button ← lg:hidden, fixed bottom-5 inset-x-4, z-20
└── BookAppointmentSheet        ← conditional Modal form
```

Loading/error replace the entire page early (`if (loading) return <AppointmentsLoadingState/>`),
mirroring the real page skeleton so there is no layout jump.

Consistent everywhere: sticky header, max-w container, summary → tabs → filters → content order,
bottom padding `pb-24` reserved for mobile floating actions / bottom nav.

---

## 5. Layout & Spacing System

| Token level | Value | Usage |
|---|---|---|
| Page max width | `max-w-[1600px]` centered | All operational pages |
| Page horizontal padding | `px-4` → `sm:px-6` → `lg:px-8` | Mobile → tablet → desktop |
| Page vertical rhythm | `py-5` → `lg:py-8`; `pb-24` bottom reserve | Header-to-content breathing |
| Major section gap | `mb-6` (24px) | Summary → tabs → filters → content |
| Related-group gap | `gap-3` / `gap-2` / `space-y-2` | Grids, button rows |
| Intra-component spacing | `mt-4`, `pt-4` after divider | Metadata grid, action footer |
| Tight metadata | `mt-1`, `gap-0.5` | Label under value, badge internals |

Hierarchy rule: **large spacing separates page sections, medium separates related groups, small
separates elements inside a component, minimal ties tightly-related metadata together.**

---

## 6. Responsive & Mobile-First Strategy

Breakpoints in active use: base (mobile) / `sm:` 640 / `lg:` 1024 / `xl:` 1280.

Transformations observed (transform, don't shrink):

| Element | Mobile | Tablet/Desktop |
|---|---|---|
| Header description | hidden | shown |
| Header book button | label "Book" | "Book appointment" |
| Filters toggle | IconButton in header (`lg:hidden`) opens collapsible panel | Inline select rows (`hidden lg:flex`) |
| Summary cards | `grid-cols-2` | `lg:grid-cols-4` |
| View tabs | full width (`w-full sm:w-auto`) | auto width |
| Detail overlay | bottom sheet (rounded-t-3xl, slide-up) | right drawer 420–520px (slide-in-right) |
| Modal | bottom sheet, max-h-[92vh] | centred dialog, `sm:p-6` |
| Primary CTA | floating fixed full-width bar (`lg:hidden`) | header button only |
| List layout | single column cards | `xl:grid-cols-2` |
| Calendar time gutter | 48px | `sm:w-16` |
| Pagination prev/next labels | icon-only | icon + text |

Mobile rules: thumb-friendly (≥40px targets), vertical stacking, reduced density, progressive
disclosure (filters collapsed), safe-area handling (`safe-area-bottom`), inputs sized to avoid iOS
zoom (16px font in the auth Input pattern).

---

## 7. Information Hierarchy

Concrete type scale used by the module:

- Page title: `text-lg sm:text-xl font-bold tracking-tight`
- Section heading: `text-base sm:text-lg font-bold` (+ optional count pill)
- Card primary identity: `text-sm font-bold truncate`
- Card service line: `text-sm text-[var(--brand)]`
- Metadata value: `text-xs font-medium`; metadata label: `text-[10px] uppercase font-semibold text-[var(--text-tertiary)]`
- Badges: `text-[10px] font-semibold rounded-full px-2 py-1`

Rule: identity > status > metadata > actions, enforced by size/color/position — not decoration.

---
## 8. Page Header Pattern

**EXISTING PATTERN (Action Header)** — `AppointmentsHeader.tsx`:
```tsx
<header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
  <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
    <div className="min-w-0">
      <h1 className="truncate text-lg font-bold tracking-tight sm:text-xl">{Title}</h1>
      <p className="hidden text-xs text-[var(--text-secondary)] sm:block">{Description}</p>
    </div>
    <div className="flex items-center gap-2">
      {/* optional mobile-only contextual icon, e.g. filters toggle */}
      <IconButton label="Filters" variant="outline" className="lg:hidden">…</IconButton>
      <Button size="sm" leftIcon={<Plus/>}>
        <span className="hidden sm:inline">Book appointment</span>
        <span className="sm:hidden">Book</span>
      </Button>
    </div>
  </div>
</header>
```

Variants:
- **Simple Header** — Title (+ description). Read-only pages (FAQ, profile views).
- **Action Header** — Title + description + one primary Button. Default for operational pages.
- **Operational Header** — Action Header plus a contextual IconButton toggling page-level controls
  (the appointments filter toggle). Only add when the control is global to the page.

Rules: exactly one filled primary button; secondary entry points are ghost/outline; header is
sticky with blur so context persists while scrolling long datasets; description hides on mobile.

---

## 9. Context & Control System

**Search:** `SearchInput` — first item in the filter section, `flex-1`, h-11, leading search icon,
`type="search"` (native clear), visually-hidden accessible label. Placeholder names the searchable
entities ("Search customer, service or staff..."). Client-side filtering through
`useAppointmentFilterState`; `hooks/useDebouncedValue` exists for server-backed search.

**Filter hierarchy:**
```
Primary (desktop row 1):  Date · Status · Price
Secondary (desktop row 2): Service · Staff · Customer
Mobile: all six in a collapsible panel + Clear filters button
```

Placement: one bordered surface card directly under the view tabs
(`mb-6 rounded-[--radius-lg] border bg-surface`). Desktop: search row with inline selects;
hairline `border-t`; second row ends with a quiet "Clear filters" text button (`ml-auto`).
Mobile: header IconButton toggles a stacked full-width panel; Clear becomes a bordered h-10 button.

Active-state convention: counts surface as pills/badges near content headings (schedule count pill,
week-strip day counts) rather than a "Filters (n)" counter.
**RECOMMENDED STANDARD:** when porting this pattern to modules with >3 filter dimensions, add an
active-filter count badge to the header toggle.

---

## 10. Filtering System

- Filter state is a single plain object managed by `_hooks/useAppointmentFilters`, exposing
  `{ setQuery, setFilter(key,value), clearAll }` — one mental model for every module.
- Options are declared as `readonly [value, label][]` tuples co-located with the filter component
  and rendered via a thin `FilterSelect` wrapper over the shared `Select` (a native select = free
  mobile pickers).
- Every select starts with an explicit "All …" option; clearing resets to those defaults.
- Filters compose with (not replace) the calendar's date window: the server receives date range +
  status/staff/customer/service; query and price refine client-side.

---

## 11. View Switching Pattern

`AppointmentViewTabs` wraps the shared accessible `Tabs` primitive (WAI-ARIA: roving tabindex,
arrow keys, `aria-selected`, id/aria-controls pairing with `role="tabpanel"` sections).

- Placement: directly above the filters, left-aligned (`w-full sm:w-auto`).
- Active state: solid brand fill + white text + shadow-sm; inactive: quiet secondary text.
- State lives in the URL (`?view=list`) via `history.replaceState` — shareable and refresh-stable.
- Switching changes **presentation only**; filters, selections and dataset are untouched.

Reusable for: Customers (List | Segments), Staff (List | Schedule), Analytics (Overview | Trends),
Loyalty (Programs | Performance). Principle: *a view switcher changes how the same dataset is seen,
not where the user is.*

---
## 12. Calendar Design System

Structure of `AppointmentCalendar` (`section[role=tabpanel]`):

1. **Section header** — "Your schedule" + count pill + helper copy; day navigation
   (`‹ Today ›`, 36px chevron IconButtons, bordered).
2. **Week navigation** — `‹ This week · Mon 3 – Sun 9 ›`; the center button doubles as
   "Back to this week" when offset ≠ 0; range dates hidden on mobile.
3. **WeekDateStrip** — 7-column grid of tappable days: weekday abbrev, big day number, per-day
   appointment-count pill, accent today-dot when not selected; selected day = solid brand fill;
   `aria-current="date"` and rich aria-labels ("Tue 14, 3 appointments").
4. **ScheduleCalendar** — bordered surface card; header shows full date + "N appointments" +
   current-time legend (accent dot); scrollable `max-h-[720px]` hour grid (START_HOUR→END_HOUR at
   PX_PER_MINUTE), hairline hour lines with floating time labels over a 48/64px gutter.
5. **Calendar events** — absolutely positioned `<button>`s (keyboard-accessible) sized by duration
   (min height 58px). Anatomy:
   ```
   Event: Service name (bold, truncate) · Customer (xs secondary) · StatusBadge
   If rendered height ≥ 85px: Time · duration · staff (10px tertiary row)
   Selected: brand border + brand-surface bg + ring-2 ring-[--brand-ring]
   Hover: border-brand
   ```
6. **CurrentTimeIndicator** — accent 2px line + dot + live time chip, updates every 30s, renders
   only on today's column within business hours.

Past/upcoming differentiation is positional (time axis) plus the live-now marker; statuses carry
lifecycle semantics. Tap/click opens the details Drawer. Mobile keeps the same scrollable grid;
density drops via narrower gutters and height-gated metadata overflow.

---

## 13. Operational Data List Pattern

The list view is **cards, not a table** (tabular needs are served by "Export week (CSV)"):

```
AppointmentList
├── Section header: "Appointment list" + description + Export CSV (outline, disabled at 0)
├── shared EmptyState when no matches
└── grid gap-3 xl:grid-cols-2 of AppointmentCard
```

```
AppointmentCard (article, rounded-lg border bg-surface p-4 sm:p-5, hover:border-brand)
├── Identity row: Avatar(md initials) · CustomerName(bold) · Service(brand color)
│                 + StatusBadge (right; stacks under name on mobile)
├── Metadata grid: grid-cols-2 gap-3 sm:grid-cols-4
│   TIME · DURATION · STAFF · PRICE  (10px uppercase labels, xs values)
├── Divider (border-t border-light)
└── Actions: [View details — primary Button, flex-1, min-h-[40px]]
             [Reschedule — Link styled as outline]
             [Cancel — outline, error-tinted on hover, spinner while loading,
              only if status ∈ CANCELLABLE_STATUSES]
```

Cancellation eligibility comes from `CANCELLABLE_STATUSES` in lib code — UI only reads business
rules. Per-row loading uses `actionLoading === id` (single-flight mutation indicator).
Desktop keeps two columns for scan density; mobile collapses metadata to a 2×2 grid — nothing is
cut, it reflows. There is deliberately no horizontally-scrolling table anywhere.

---

## 14. Card System

| Card type | Example | Treatment |
|---|---|---|
| **Surface card** | Filter section, calendar frame | `rounded-[--radius-lg] border border-[--border] bg-[--surface]` |
| **Metric card** | SummaryCards (Today / Upcoming / Needs attention / Completed) | icon chip in brand-light + big bold number + xs label, p-4 |
| **Entity card** | AppointmentCard | interactive (hover:border-brand), internal divider, action footer |
| **Info group** | Drawer customer block | `bg-[--background] p-4 rounded-lg` — recessed, not elevated |

Anatomy conventions: header = identity/status; body = labeled metadata grid; footer = actions below
a hairline divider. The shared `Card` primitive (rounded-2xl, shadow-card, p-6, composed
Header/Title/Description/Content/Footer) serves settings/content-style pages.

**When NOT to use a card:** raw page background is fine for long lists; use recessed blocks or
dividers for sub-groups; never nest cards more than one level deep (drawer detail rows use a
divided list, not nested boxes).

---
## 15. Entity Detail Page Pattern

Two tiers exist:

**Tier 1 — quick inspect (Drawer, default):** `AppointmentDetailsDrawer` — title "Appointment
details"; customer identity block (recessed bg, Avatar lg + name + role caption); standalone
StatusBadge; a divided `DetailRow` list (icon + xs label left, semibold truncated value right)
covering Date / Time / Duration / Service / Staff / Price; then a full-width stacked action column
whose contents depend on status:
- pending/draft → Confirm appointment (primary, `isLoading`)
- confirmed → Mark completed (success variant) + Mark no-show (outline)
- always → Open appointment (link-as-outline); Cancel appointment as a bare danger-text button
  unless terminal status.

**Tier 2 — full page (`appointments/[id]/page.tsx`):** back link → confirmation hero → divided
definition list (WHEN / LOCATION / SERVICES / STAFF / REFERENCE in mono) → **fixed bottom action
bar** (Reschedule outline + Cancel danger, split 50/50, safe-area padded).

Reusable skeleton for Staff / Customer / Program / Reward / Business details:

```
Identity block   (avatar, name, role/status badge)
↓
Key-value list   (icon + caps label + value, hairline dividers)
↓
Lifecycle actions (stacked, primary first, status-dependent)
↓
Destructive last  (text-only danger treatment)
```

Above the fold: who + status + primary next action. Everything else is scannable list rows.
Activity/history sections may be appended below once event data exists — collapsible.

---

## 16. Booking & Form Experience

`BookAppointmentSheet`: a `Modal` titled "Book appointment" + description; fields in priority
order — Customer (required Select) → Service (required Select, option embeds "name - X min") →
Date and time (native `datetime-local`, h-12, focus ring) → Staff member (**optional**, default
"Any available staff"). Single-column `space-y-5`; submit is a full-width primary Button with a
CheckCircle2 icon, `disabled={!valid}` until required fields exist.

Operational Form Pattern:
```
Context (overlay title + description)
→ Required inputs first, in decision order
→ Optional/conditional inputs after (staff assignment)
→ Gated submit (disabled primary until valid)
→ Full-width primary confirm at the end
```
Field behavior: labels via FormField/FormLabel (xs semibold secondary); hints under fields; errors
inline in red; loading via `isLoading` on Button (spinner replaces left icon); native inputs for
best mobile keyboard/picker quality. Progressive disclosure: optional fields last and unobtrusive
rather than multi-step for short flows; steppers/full pages reserved for genuinely long workflows.

---

## 17. Action Hierarchy

| Tier | Variant | When | Module examples |
|---|---|---|---|
| Primary | `Button` primary (brand fill) | One per context: create / advance lifecycle | Book appointment, Confirm, Mark completed |
| Semantic | `success` / `danger` variants | Lifecycle completion / destructive confirms | Complete, dialog confirm-danger |
| Secondary | `outline` | Important but non-dominant | Reschedule, Mark no-show, Export CSV |
| Tertiary | `ghost`, text buttons | Low-stakes, inline | Clear filters, Close |
| Icon | `IconButton` (`label` REQUIRED as aria-label+title) | Space-constrained, universally recognized | Filters toggle, ‹ › nav, X close |

Rules: one dominant filled button per view region; destructive actions appear last with lowest
visual weight until intent; busy state = spinner swap + disabled (`isLoading` / per-row
`actionLoading` map); mobile action groups stack full-width; disabled styling is centralized in the
Button primitive.

---

## 18. Status System

Single source of truth `lib/appointment-status.ts`; variant mapping in
`APPOINTMENT_STATUS_VARIANT` (Badge.tsx):

| Status | Label | Badge variant | Meaning |
|---|---|---|---|
| draft | Draft | neutral | created, not submitted |
| pending | Pending | info (accent tint) | awaiting business response — "needs attention" |
| confirmed | Confirmed | brand | scheduled and locked in |
| in_progress | In Progress | success | happening now |
| completed | Completed | success | finished successfully |
| cancelled | Cancelled | neutral | terminated |
| no_show | No Show | neutral | customer absent |

Also exported: `SERVER_STATUSES`, `CANCELLABLE_STATUSES` (pending/draft/confirmed),
`TERMINAL_STATUSES` (completed/cancelled/no_show).

Presentation: `StatusBadge` = rounded-full tinted pill + leading dot + 10px semibold text. Never
color alone — text label always present plus dot shape; neutral fallback for unknown statuses
guarantees graceful degradation. Badges render identically in cards, calendar events, and the
detail drawer. Future modules define their own vocabulary + variant-map files reusing `Badge`.

---
## 19. Modal / Drawer / Sheet Rules

Canonical overlays live in `components/ui/Modal.tsx` and share one shell: backdrop button
(click closes, `bg-black/40 backdrop-blur-sm`), Escape handling, `role="dialog"` + `aria-modal` +
labelled-by title, close IconButton, slide-up on mobile / slide-in-right on desktop,
`motion-reduce` respected, sticky header (and footer when present).

| Surface | Use for | Examples |
|---|---|---|
| **Modal** (bottom sheet → centred) | Short focused forms, confirmations | BookAppointmentSheet, ConfirmationDialog |
| **Drawer** (bottom sheet → right rail 420/520px) | Entity inspection + contextual lifecycle actions | AppointmentDetailsDrawer, FilterSheet |
| **Full page** | Deep workflows, multi-step booking, rescheduling | `/appointments/new`, `[id]?action=reschedule` |

Decision test: ≤ ~5 fields or a yes/no → Modal; inspect-and-act on one entity → Drawer; anything
needing its own URL, scroll depth, or >1 screen → Full page. Never nest modals; a confirmation on
top of a drawer should close or replace it. `ConfirmationDialog` standardizes destructive intent
(tone danger/primary, loading state, cancel + confirm pair).

---

## 20. Loading / Empty / Error States

**Loading:** the page-level skeleton (`states.tsx`) mirrors true layout — header bar, 4 metric-card
skeletons, filter-bar skeleton, tall content skeleton — using the shimmer `Skeleton` primitive.
Local mutations use per-row spinners; `Spinner`/`Loader2` for inline waits; Button has built-in
`isLoading`.

**Empty:** shared `EmptyState` = dashed-border surface, circular brand-surface icon tile, bold xs
title, xs explanation naming *why* it's empty ("no appointments matching the current filters"),
then the primary next action (Book appointment). Answers what / why / next — never decorative.

**Error:** shared `ErrorState` = alert icon tile, bold title ("Appointments unavailable"), message,
retry button wired to `reload()`. Field errors render inline under inputs; destructive/network
actions never silently lose user input.

All three are thin domain wrappers around shared primitives in a per-module `states.tsx` — never
ad-hoc markup.

---

## 21. Data Density Rules

- **High density:** calendar hour grid, desktop filter rows, pagination — 10–12px type, tight gaps.
- **Medium density (default):** entity cards, summary metrics, detail lists — text-sm values,
  10px labels, gap-3 grids.
- **Low density:** booking modal, empty/error states, confirmation hero — space-y-5/6, generous
  padding, one idea per screen region.

Density follows task urgency: monitoring is dense, deciding is airy.

---

## 22. Component Architecture

```
Application UI
├── Layout Components
│   ├── DashboardLayout (app/dashboard/layout.tsx — role-based sidebar/topbar/mobile bottom nav)
│   └── PageContainer pattern (mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 …)
├── Primitive Components (components/ui — reusable everywhere)
│   ├── Button, IconButton, Input, Select, Textarea, FormField/FormLabel
│   ├── Badge/StatusBadge, Avatar, Skeleton/Spinner, Pagination, Tabs, SearchInput
│   ├── EmptyState, ErrorState, Card(+parts), Modal, Drawer, ConfirmationDialog
│   └── FilterSheet, FilterChips, SortOptions
├── Shared Product Patterns
│   ├── PageHeader (Action Header composition)
│   ├── SummaryCards / MetricCard
│   ├── ViewSwitcher (Tabs + ?view= URL state)
│   ├── ControlBar (SearchInput + FilterSelects + Clear)
│   └── DetailRows / definition list
├── Domain Components (_components, module-private)
│   ├── AppointmentCalendar, WeekDateStrip, CurrentTimeIndicator
│   ├── AppointmentCard, AppointmentList, AppointmentFilters
│   ├── AppointmentDetailsDrawer, BookAppointmentSheet
│   └── states.tsx (module Loading/Empty/Error)
└── Page Components (page.tsx — composition + view state only)

Supporting layers per module: _hooks/ (data, filtering, actions), _utils/ (formatting),
lib/<domain>-status.ts (vocabulary), lib/api/<domain>.ts, lib/validations/<domain>.ts
```

Layering contract: primitives know nothing about domains; domain components consume primitives;
pages compose domains + hooks; a component graduates into `components/ui` only when a second
module needs it.

---
## 23. Component Inventory (contracts)

- **Button** — variants: primary/secondary/success/danger/outline/ghost; sizes sm(h-10)/md(h-12)/
  lg(h-14)/icon; props `isLoading`, `fullWidth`, `leftIcon`; disabled+loading styles centralized;
  active scale 0.97. Anti-pattern: multiple primaries in one region.
- **IconButton** — requires `label`; outline/ghost/solid; ≥36px touch target; round.
- **Tabs** — generic `TabItem<T>` switcher, WAI-ARIA complete. Any view/period switching.
- **Badge / StatusBadge** — 6 semantic variants (neutral/brand/info/success/warning/danger),
  optional dot, neutral fallback; pair with a domain status-vocabulary file.
- **Modal / Drawer / ConfirmationDialog** — see §19; sizes sm/md/lg; sticky headers/footers.
- **SearchInput** — controlled, icon-leading, sr-only label, native clear.
- **Select / FilterSelect** — native select, chevron affordance, hover/focus border-brand,
  sr-only `label` option.
- **FormField / FormLabel / Textarea / Input** — labeled field units with hint/error slots.
- **SummaryCard** — icon chip + big value + label; grid 2→4 columns.
- **AppointmentCard** — the reference entity card (§13).
- **WeekDateStrip / CurrentTimeIndicator** — calendar sub-patterns (§12).
- **Pagination** — server-list pager; degrades to result count at 1 page; aria-live counts;
  icon-only labels on mobile.
- **Avatar** — initials fallback, xs/sm/md/lg, image support, role="img" labelled by name.
- **Skeleton / SkeletonText / Spinner** — shimmer block + role="status" spinner.
- **EmptyState / ErrorState** — §20 contracts.
- **FilterSheet / FilterChips / SortOptions** — mobile bottom sheet ↔ desktop inline panel duality
  with an Apply button; chip groups for enum-ish filters; sort chips.

## 24. Cross-Module Reusable Patterns

For each: Problem → When → Structure → Responsive.

1. **Sticky Action Header** — persistent context + one CTA while scrolling data. Always for
   operational pages. Sticky, blur, responsive label/icon collapse.
2. **Metric Summary Strip** — instant operational pulse. Place before controls; 2-col → 4-col.
3. **Data View Switcher** — same dataset, multiple presentations. Tabs + URL param.
4. **Control Bar** — search + tiered filters in one surface card; mobile collapses behind a header
   icon toggle; always offer Clear filters.
5. **Responsive Overlay Duality** — bottom sheet on mobile, drawer/dialog on desktop, one API.
6. **Entity Card** — identity + status + metadata grid + action footer; 1→2 col grid.
7. **Detail Definition List** — icon + caps-label + value rows with hairline dividers; works in
   drawers and full pages.
8. **Status Vocabulary File** — labels + badge variants + rule sets (cancellable/terminal) in lib.
9. **States Wrapper (`states.tsx`)** — module loading/empty/error composing shared primitives;
   skeleton mirrors real layout.
10. **Floating Mobile Primary Action** — fixed bottom full-width CTA when the header CTA is out of
    thumb reach (`pb-24` on main reserves room).
11. **Fixed Mobile Action Bar** — detail-page confirmations pinned to bottom, safe-area aware.
12. **Count Pills** — numeric context attached to headings, week-strip days, legends.
13. **Export affordance** — outline button top-right of list section header, disabled when empty.
14. **Per-row Mutation Loading** — `id === actionLoading` spinner swap; never a global blocker.

---

## 25. Design Decision Matrix

| Problem | Recommended Pattern | Avoid |
|---|---|---|
| Complex dataset scanning | List view + Export CSV | Multiple unrelated card piles |
| Mobile filters | Collapsible panel / FilterSheet | 6+ permanently visible selects |
| Primary page action | Single header Button (+ floating mobile CTA) | Several competing filled buttons |
| Entity inspection + act | Details Drawer | Full page for glanceable info |
| Short creation flow | Modal with gated submit | Multi-step wizard for ≤5 fields |
| Deep/multi-step workflow | Full page with own URL | Nested modals |
| Same data, two presentations | ViewSwitcher tabs + `?view=` | Duplicate routes/pages |
| Lifecycle states | StatusBadge + vocabulary lib | Ad-hoc colored text |
| Destructive action | Last-positioned text/outline + ConfirmationDialog | Prominent filled danger everywhere |
| Server-paginated list | Pagination primitive | Infinite scroll without count context |
| Numeric pulse | Metric summary strip | Dense stat tables |
| Empty dataset | EmptyState with next action | Blank area or apology-only copy |
| Slow fetch | Layout-mirroring skeletons | Whole-page blocking spinners |
| Icon-only control | IconButton with required label | Unlabelled glyphs |
| Date picking | Native inputs / week strip + Today | Custom popover calendars on mobile |

---

## 26. Anti-Patterns

- **Box-in-box-in-box** — nesting elevated surfaces; use recessed backgrounds and dividers.
- **Multiple primary buttons per region** — dilutes action hierarchy; demote to outline/ghost.
- **Squeezed desktop tables on mobile** — transform to cards/stacks instead.
- **Color-only status** — always pair tint with label (+ dot).
- **Filters scattered** — one control surface; the header toggle owns visibility on mobile.
- **Hidden critical actions** — lifecycle next-steps belong in the drawer/detail page, not buried
  in menus.
- **Overloaded headers** — max: title, description, one contextual icon, one primary button.
- **Invented spacing** — stick to §5's scale; arbitrary margins erode rhythm.
- **Decorative animation** — functional 150–350ms transitions only, reduced-motion honored.
- **Domain knowledge in components** — cancellable statuses etc. belong in lib vocabularies.
- **Blocking global spinners for row-level mutations** — scope loading to affected row/button.

---
## 27. Appointment UI Blueprint

Every operational page follows:

```
1. Establish Context      → sticky Action Header (title + description)
2. Present Pulse          → summary metrics (now / next / needs attention)
3. Provide Controls       → view switcher + control bar (search, filters, clear)
4. Display Primary Data   → view panel (calendar/list/cards) with count pills
5. Support Actions        → entity drawer/detail page with lifecycle-aware action stack
6. Handle States          → skeleton load, actionable empty, retryable error
7. Reserve Thumb Zone     → floating/fixed mobile primary actions + pb-24
```

**Product-wide rules:**

1. One clear primary action per page context.
2. Controls operate on the currently visible dataset; they persist across view switches.
3. View switching changes presentation, never the underlying entity or route intent.
4. Mobile prioritizes the primary action and essential context; everything else discloses.
5. Secondary information reveals progressively (truncation, height-gated event metadata, collapsed
   filters, drawer-before-page).
6. Cards group *related* information with a labeled metadata grid — never arbitrary content.
7. Status is always semantic: vocabulary lib → variant map → StatusBadge.
8. Detail experiences follow: identity → definition list → lifecycle actions → destructive last.
9. Overlays are responsive by default (sheet ⇄ drawer/dialog) with Escape/backdrop close and ARIA.
10. Touch targets ≥ 36px; primary CTAs ≥ 40px.
11. Spacing obeys the four-level scale (sections / groups / elements / metadata).
12. Desktop adds context and density, not stretched components (max-w-[1600px]).
13. Every async boundary has designed loading, empty, and error treatments.
14. Business rules (what's allowed when) live in lib constants consumed by UI — never hardcoded.
15. Unknown/unauthorized data degrades to neutral fallbacks, never breaks the UI.
16. Formatting utilities are centralized (`_utils`, `lib/format`) so every surface renders
    identical values (hhmm time, price, duration, date keys).
17. Pages compose; components present; hooks compute. No fetching inside leaf components.
18. New primitives enter `components/ui` only when a second module needs them.
19. Motion is functional, ≤350ms, removable via prefers-reduced-motion.
20. Accessibility is structural: roles, labels, aria-live counts, keyboard support ship inside the
    component — not bolted on later.

---

## 28. Product-Wide Design Rules (tokens)

- Theme via CSS variables only — never hex in components. 60% neutrals (`--background`,
  `--surface`, `--surface-raised`, `--border`, `--border-light`,
  `--text-primary/secondary/tertiary/muted`), 30% brand (`--brand*` incl. `--brand-ring` focus),
  10% accent (`--accent*`), plus `--success*` and danger semantics. Every theme (blue, obsidian,
  …) must supply the full variable set.
- Type: Inter body; Plus Jakarta Sans display/labels; Space Mono for references/data-emphasis;
  sizes text-[10px]→text-xl per §7; uppercase tracked labels for metadata.
- Radius: `--radius-sm/md/lg` + rounded-xl/2xl/3xl; pills only for badges/count chips.
- Shadows: `shadow-card` (resting surfaces), `shadow-elevated` (overlays) — nothing else.
- Icons: lucide, h-4 w-4 standard, strokeWidth ~1.8–2.5 (heavier for active emphasis).

---

## 29. New Module UI Implementation Checklist

**Understanding**
- [ ] Primary user goal defined; immediate vs secondary information separated
- [ ] Single primary action identified (header CTA + mobile equivalent)
- [ ] Operational questions answered: what's now / next / needs attention

**Page structure**
- [ ] Sticky Action Header with responsive label collapsing
- [ ] Order: summary → view tabs (if needed) → control bar → content
- [ ] `max-w-[1600px] px-4 sm:px-6 lg:px-8 py-5 lg:py-8 pb-24` container

**Data**
- [ ] Filters modeled as one state object in `_hooks/use…Filters` with clearAll
- [ ] Desktop inline / mobile collapsible filter strategy; "All …" defaults
- [ ] Entity cards follow §13 anatomy; metadata grid 2↔4 cols
- [ ] Density matches task (§21)

**Components**
- [ ] Existing ui primitives reused; new ones generalized into components/ui
- [ ] Status vocabulary extracted to `lib/<domain>-status.ts` + variant map on Badge
- [ ] `states.tsx` provides skeleton/empty/error composing shared primitives
- [ ] Mutations show scoped loading; destructive flows confirmed

**Responsive**
- [ ] Overlays use sheet⇄drawer/dialog duality; deep flows are full pages
- [ ] Transformations (not shrinkage) verified at 360/640/1024/1280px
- [ ] Thumb-zone actions present; ≥36px targets; safe-area handled

**Consistency**
- [ ] Tokens/CSS-vars only; no hardcoded colors; all themes supported
- [ ] Formatting via shared utils; identical values across surfaces
- [ ] ARIA/keyboard complete (tabs pattern, labelled icon buttons, live counts)
- [ ] Follows the §27 Blueprint and its 20 rules; deviations justified in writing








