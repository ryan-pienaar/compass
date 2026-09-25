# Compass design system: Folio

This is the single source of truth for how Compass looks and moves. It covers visuals and interaction polish only. Nothing in it changes behaviour, data, API, auth or routing, except the handful of accessibility fixes it names explicitly (§7.6, §9).

About ten engineers implement this in parallel. When this document gives a class string, use that string. When it is silent, follow the principles (§1) and the nearest documented pattern. Don't invent new tokens, radii, shadows, durations or font sizes.

- **Stack reminders:** Tailwind 4.3.3, shadcn `base-nova` on Base UI 1.8 (not Radix: `render` prop, `data-open`/`data-starting-style`), `cn` 0.4 (tailwind-merge rules), lucide-react 1.47, @dnd-kit/react 0.5, sonner 2, tw-animate-css.
- **Verification:** every class string in this document was compiled against the project's Tailwind 4.3.3. Every contrast figure was computed with WCAG 2 relative luminance after OKLCH→sRGB conversion, with alpha composited over the real surface.

---

## 1. Purpose and principles

**Folio: a well-made notebook.** Warm paper, confident ink, one teal needle, and a serif voice that turns up when Compass asks you to reflect. It should be calm like Things, typographically honest like iA Writer, and finished like good paper stock. Opening Today should feel like opening a journal, not a dashboard.

### The five principles

1. **Paper first, boxes last.** Content sits on the page. A container exists only when it holds one real object (an agreement, a chart, a dialog, the day's priorities sheet) or marks a drop area.
   - Each region gets at most one container level.
   - Inside a container, separate groups with a label, space and hairlines, never with another box.
   - **Container rule:** a card holds one real object or the page's focal sheet; lists sit on paper; boards sit in wells.
2. **Ink hierarchy; colour means something.** Hierarchy comes from size, weight and three ink strengths (ink, muted, faint). Colour carries meaning only:
   - **Teal** is the needle: the one primary action per view, focus, today/now, progress and links.
   - **Quadrant hues** mark category, as fills, dots, bars and top rules.
   - **Role colours** identify roles, as dots, bars, tints and the completion check.
   - **Red** means "this destroys something". **Amber** means a real deadline or real over-capacity. Nothing else is coloured.
3. **Two voices.** Geist is the working voice (controls, data, lists). Newsreader is the reflective voice (page titles, mission, affirmations, reflections, reframes, quotes). The serif never sits on a control, a chip or a number you act on.
4. **Legible at a glance.** Body text is 14px, metadata is 13px in muted ink, and nothing is smaller than 12px. Density comes from removing chrome, not from shrinking text. Every target is at least 24px on a mouse and 44px on touch.
5. **Quiet motion, honest feedback; reward kept promises, never punish broken ones.**
   - Every action responds within 100ms; motion lasts 80–320ms and eases out.
   - Finishing something gets one small, satisfying moment. A rare moment (a Quadrant II big rock done) gets one soft green bloom.
   - A plan you didn't follow never turns red. There is no confetti.

### Why it fits Compass

- Quadrant II work is important and unhurried. A low-temperature interface lets the one thing that matters stand out (the Von Restorff effect).
- Reflection reads better in a serif at a comfortable measure.
- The no-guilt rules are built into the palette.
- Paper and ink age well: no gradients, glass or glow to date the product.

---

## 2. Tokens: `src/index.css`

Replace the whole of `src/index.css` with the block below (owner: F1). It is a complete file.

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
@import "@fontsource-variable/geist";
@import "@fontsource-variable/newsreader/opsz.css";
@import "@fontsource-variable/newsreader/opsz-italic.css";

@custom-variant dark (&:is(.dark *));

/* ───────── Constants (plain @theme). T-shirt names only: shadcn's `cn` merges these. ───────── */
@theme {
  --font-sans: "Geist Variable", ui-sans-serif, system-ui, sans-serif;
  --font-serif: "Newsreader Variable", Georgia, "Times New Roman", serif;
  --font-heading: var(--font-sans);

  /* Type scale. text-xs is 13px in Compass; text-2xs (12px) is the floor. Always size + line-height together. */
  --text-2xs: 0.75rem;    --text-2xs--line-height: 1rem;       --text-2xs--letter-spacing: 0.01em;
  --text-xs: 0.8125rem;   --text-xs--line-height: 1.125rem;
  --text-sm: 0.875rem;    --text-sm--line-height: 1.25rem;
  --text-md: 0.9375rem;   --text-md--line-height: 1.5rem;
  --text-base: 1rem;      --text-base--line-height: 1.5rem;    --text-base--letter-spacing: -0.005em;
  --text-lg: 1.125rem;    --text-lg--line-height: 1.625rem;    --text-lg--letter-spacing: -0.008em;
  --text-xl: 1.25rem;     --text-xl--line-height: 1.75rem;     --text-xl--letter-spacing: -0.012em;
  --text-2xl: 1.5rem;     --text-2xl--line-height: 1.875rem;   --text-2xl--letter-spacing: -0.016em;
  --text-3xl: 2rem;       --text-3xl--line-height: 2.375rem;   --text-3xl--letter-spacing: -0.012em;
  --text-4xl: 2.5rem;     --text-4xl--line-height: 2.875rem;   --text-4xl--letter-spacing: -0.015em;
  --text-5xl: 3.25rem;    --text-5xl--line-height: 3.5rem;     --text-5xl--letter-spacing: -0.02em;

  /* Page width "wide" (replaces max-w-[1500px]) */
  --container-8xl: 85rem;

  /* Easing: override the built-in keys so every existing ease-* follows. Durations stay numeric (duration-120 …). */
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);      /* enter, appear, hover-in */
  --ease-in-out: cubic-bezier(0.2, 0, 0, 1);       /* on-screen change: indicator, thumb, meter */
  --ease-in: cubic-bezier(0.3, 0, 0.8, 0.15);      /* leaves for good */
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);   /* Sheet enter only */
  --default-transition-duration: 150ms;
  --default-transition-timing-function: cubic-bezier(0.2, 0, 0, 1);

  /* Every keyframe goes through an --animate-* token (Tailwind drops unreferenced keyframes). */
  --animate-check-pop: check-pop 240ms cubic-bezier(0.22, 1, 0.36, 1);
  --animate-rise-in: rise-in 240ms cubic-bezier(0.22, 1, 0.36, 1) both;
  --animate-dnd-lift: dnd-lift 120ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
  --animate-bloom: bloom 480ms cubic-bezier(0.22, 1, 0.36, 1);
  --animate-check-bloom: check-pop 240ms cubic-bezier(0.22, 1, 0.36, 1), bloom 480ms cubic-bezier(0.22, 1, 0.36, 1);
  --animate-skeleton: skeleton-in 200ms linear 200ms backwards, skeleton-pulse 1.6s ease-in-out 400ms infinite;
  --animate-breathe: breathe 1.6s ease-in-out infinite;
  --animate-grow-y: grow-y 480ms cubic-bezier(0.22, 1, 0.36, 1) both;
  --animate-draw: draw 600ms cubic-bezier(0.22, 1, 0.36, 1) both;

  @keyframes check-pop { 0% { scale: 0.82; } 60% { scale: 1.08; } 100% { scale: 1; } }
  @keyframes rise-in { from { opacity: 0; translate: 0 var(--motion-rise); } }
  @keyframes dnd-lift { to { scale: var(--motion-scale-lift); box-shadow: var(--elev-drag); } }
  @keyframes bloom {
    from { box-shadow: 0 0 0 0 color-mix(in oklab, var(--q2) 35%, transparent); }
    to { box-shadow: 0 0 0 8px transparent; }
  }
  @keyframes skeleton-in { from { opacity: 0; } }
  @keyframes skeleton-pulse { 50% { opacity: 0.55; } }
  @keyframes breathe { 50% { opacity: 0.45; } }
  @keyframes grow-y { from { scale: 1 0; } }
  @keyframes draw { from { stroke-dashoffset: 1; } }
}

/* ───────── Theme-switched mappings ───────── */
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--foreground);
  /* Background-only: as a --color-* token, `ring-inset` would also compile as a ring colour and override hairlines. */
  --background-color-inset: var(--inset);
  --color-field: var(--field);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-faint-foreground: var(--faint-foreground);
  --color-subtle: var(--subtle);
  --color-selected: var(--selected);
  --color-secondary: var(--muted);
  --color-secondary-foreground: var(--foreground);
  --color-accent: var(--subtle);                 /* menus highlight neutral, never teal */
  --color-accent-foreground: var(--foreground);
  --color-border: var(--border);
  --color-border-subtle: var(--border-subtle);
  --color-border-strong: var(--border-strong);
  --color-edge: var(--edge);
  --color-dot-ring: var(--dot-ring);
  --color-input: var(--input);
  --color-control: var(--control);
  --color-ring: var(--ring);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary-hover: var(--primary-hover);
  --color-primary-ink: var(--primary-ink);
  --color-primary-soft: var(--primary-soft);
  --color-primary-soft-foreground: var(--primary-soft-foreground);
  --color-destructive: var(--destructive);       /* TEXT-SAFE ink (text-destructive, border-destructive) */
  --color-destructive-solid: var(--destructive-solid);
  --color-destructive-solid-hover: var(--destructive-solid-hover);
  --color-destructive-soft: var(--destructive-soft);
  --color-success: var(--success);
  --color-success-soft: var(--success-soft);
  --color-warning: var(--warning);
  --color-warning-soft: var(--warning-soft);
  --color-warning-solid: var(--warning-solid);
  --color-warning-solid-foreground: var(--warning-solid-foreground);
  --color-info: var(--info);
  --color-info-soft: var(--info-soft);
  --color-scrim: var(--scrim);
  --color-q1: var(--q1);
  --color-q2: var(--q2);
  --color-q3: var(--q3);
  --color-q4: var(--q4);
  --color-viz-series-1: var(--viz-series-1);
  --color-viz-grid: var(--viz-grid);
  --color-viz-axis: var(--viz-axis);
  --color-viz-seq-1: var(--viz-seq-1);
  --color-viz-seq-2: var(--viz-seq-2);
  --color-viz-seq-3: var(--viz-seq-3);
  --color-viz-seq-4: var(--viz-seq-4);
  --color-viz-seq-5: var(--viz-seq-5);
  --color-viz-seq-6: var(--viz-seq-6);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--primary);
  --color-sidebar-primary-foreground: var(--primary-foreground);
  --color-sidebar-accent: var(--subtle);
  --color-sidebar-accent-foreground: var(--foreground);
  --color-sidebar-border: var(--border-subtle);
  --color-sidebar-ring: var(--ring);

  /* Radius: explicit px. Canonical names: xs 4 · sm 6 · lg 8 (controls) · xl 12 (cards) · 2xl 16 (overlays) · full.
     md == lg and 3xl == 2xl are aliases kept so old classes don't break; never write them in new code. */
  --radius-xs: 4px;
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-2xl: 16px;
  --radius-3xl: 16px;
  --radius-4xl: 9999px;

  /* Elevation, switched per theme */
  --shadow-xs: var(--elev-xs);
  --shadow-sm: var(--elev-sm);
  --shadow-md: var(--elev-md);
  --shadow-lg: var(--elev-lg);
  --shadow-xl: var(--elev-xl);
  --shadow-2xl: var(--elev-drag);
  --inset-shadow-2xs: var(--elev-highlight);
}

:root {
  color-scheme: light;
  --radius: 0.5rem; /* raw alias still read by input-group + sonner */

  /* Surfaces: sidebar ≈ inset < canvas < card ≤ popover */
  --background: oklch(0.968 0.007 84);   /* paper canvas #f7f4ef */
  --card: oklch(0.997 0.002 85);         /* sheet #fffefd */
  --popover: oklch(1 0 0);
  --sidebar: oklch(0.952 0.008 82);
  --inset: oklch(0.948 0.008 82);        /* wells: board columns, tray, segmented track */
  --muted: oklch(0.94 0.008 82);         /* neutral fills: tracks, skeleton, neutral chips */
  --field: oklch(0.997 0.002 85);
  --subtle: oklch(0.32 0.02 60 / 0.055); /* hover plate on any surface */
  --selected: oklch(0.32 0.02 60 / 0.09);

  /* Ink */
  --foreground: oklch(0.225 0.012 65);
  --muted-foreground: oklch(0.47 0.014 65);
  --faint-foreground: oklch(0.505 0.012 68);
  --sidebar-foreground: oklch(0.3 0.012 65);

  /* Lines */
  --border-subtle: oklch(0.918 0.007 80);
  --border: oklch(0.885 0.008 78);
  --border-strong: oklch(0.8 0.011 74);
  --edge: oklch(0.3 0.02 60 / 0.1);
  --dot-ring: oklch(0.225 0.012 65 / 0.18);
  --input: oklch(0.645 0.012 72);        /* bordered text fields, select + date triggers (≥3:1) */
  --control: oklch(0.62 0.012 70);       /* checkbox, radio, switch-off boundary (≥3:1) */
  --ring: oklch(0.52 0.09 186);

  /* The needle (teal) */
  --primary: oklch(0.52 0.09 186);
  --primary-hover: oklch(0.465 0.08 186);
  --primary-foreground: oklch(0.99 0.004 186);
  --primary-ink: oklch(0.47 0.08 186);
  --primary-soft: oklch(0.955 0.022 186);
  --primary-soft-foreground: oklch(0.36 0.06 186);

  /* Status: text-safe inks, soft fills, solids */
  --destructive: oklch(0.52 0.19 27);
  --destructive-solid: oklch(0.555 0.2 27);
  --destructive-solid-hover: oklch(0.5 0.19 27);
  --destructive-soft: oklch(0.96 0.018 27);
  --success: oklch(0.5 0.11 152);
  --success-soft: oklch(0.955 0.028 152);
  --warning: oklch(0.52 0.115 62);
  --warning-soft: oklch(0.962 0.03 80);
  --warning-solid: oklch(0.8 0.15 75);
  --warning-solid-foreground: oklch(0.25 0.05 65);
  --info: oklch(0.5 0.12 255);
  --info-soft: oklch(0.955 0.018 255);
  --scrim: oklch(0.25 0.02 60 / 0.24);

  /* Quadrants: validated CVD-safe set. Unchanged. */
  --q1: #eb6834;
  --q2: #1baf7a;
  --q3: #eda100;
  --q4: #4a3aa7;

  /* Charts: series unchanged; grid/axis tied to the line tokens */
  --viz-series-1: #2a78d6;
  --viz-seq-1: #cde2fb;
  --viz-seq-2: #9ec5f4;
  --viz-seq-3: #6da7ec;
  --viz-seq-4: #3987e5;
  --viz-seq-5: #256abf;
  --viz-seq-6: #184f95;
  --viz-grid: oklch(0.918 0.007 80);
  --viz-axis: oklch(0.8 0.011 74);
  --chart-1: #2a78d6;
  --chart-2: #eb6834;
  --chart-3: #1baf7a;
  --chart-4: #eda100;
  --chart-5: #4a3aa7;

  /* Raw aliases still read by stock primitives/sonner. Do not use in new code. */
  --card-foreground: var(--foreground);
  --popover-foreground: var(--foreground);
  --secondary: var(--muted);
  --secondary-foreground: var(--foreground);
  --accent: var(--subtle);
  --accent-foreground: var(--foreground);
  --sidebar-primary: var(--primary);
  --sidebar-primary-foreground: var(--primary-foreground);
  --sidebar-accent: var(--subtle);
  --sidebar-accent-foreground: var(--foreground);
  --sidebar-border: var(--border-subtle);
  --sidebar-ring: var(--ring);

  /* Elevation: warm-tinted, layered, light from straight above */
  --elev-xs: 0 1px 2px 0 oklch(0.28 0.02 60 / 0.06);
  --elev-sm: 0 1px 2px 0 oklch(0.28 0.02 60 / 0.04), 0 2px 6px -2px oklch(0.28 0.02 60 / 0.06);
  --elev-md: 0 2px 4px -1px oklch(0.28 0.02 60 / 0.06), 0 8px 16px -6px oklch(0.28 0.02 60 / 0.1);
  --elev-lg: 0 1px 2px 0 oklch(0.28 0.02 60 / 0.04), 0 6px 12px -4px oklch(0.28 0.02 60 / 0.08), 0 18px 32px -10px oklch(0.28 0.02 60 / 0.14);
  --elev-xl: 0 2px 6px 0 oklch(0.28 0.02 60 / 0.05), 0 20px 48px -12px oklch(0.28 0.02 60 / 0.2), 0 40px 80px -32px oklch(0.28 0.02 60 / 0.18);
  --elev-drag: 0 4px 8px -2px oklch(0.28 0.02 60 / 0.1), 0 18px 36px -8px oklch(0.28 0.02 60 / 0.22);
  --elev-highlight: inset 0 1px 0 0 oklch(1 0 0 / 0.14);

  /* Motion scalars (neutralised under reduced motion) */
  --motion-rise: 4px;
  --motion-scale-in: 0.96;
  --motion-scale-press: 0.97;
  --motion-scale-press-lg: 0.985;
  --motion-scale-lift: 1.02;
  --motion-stagger: 30ms;

  /* Role-colour tint strength for calendar blocks */
  --event-mix: 14%;
}

.dark {
  color-scheme: dark;
  --background: oklch(0.168 0.006 70);   /* #110f0c */
  --card: oklch(0.212 0.007 70);
  --popover: oklch(0.245 0.008 70);
  --sidebar: oklch(0.152 0.005 70);
  --inset: oklch(0.148 0.005 70);
  --muted: oklch(0.262 0.008 70);
  --field: oklch(0.19 0.006 70);
  --subtle: oklch(1 0 0 / 0.05);
  --selected: oklch(1 0 0 / 0.085);

  --foreground: oklch(0.935 0.006 80);
  --muted-foreground: oklch(0.775 0.01 75);
  --faint-foreground: oklch(0.68 0.01 72);
  --sidebar-foreground: oklch(0.86 0.008 78);

  --border-subtle: oklch(1 0 0 / 0.065);
  --border: oklch(1 0 0 / 0.1);
  --border-strong: oklch(1 0 0 / 0.18);
  --edge: oklch(1 0 0 / 0.075);
  --dot-ring: oklch(1 0 0 / 0.2);
  --input: oklch(1 0 0 / 0.36);
  --control: oklch(1 0 0 / 0.4);
  --ring: oklch(0.68 0.09 184);

  --primary: oklch(0.51 0.085 184);      /* deep teal solid; the bright mint is retired */
  --primary-hover: oklch(0.54 0.09 184);
  --primary-foreground: oklch(0.99 0.004 186);
  --primary-ink: oklch(0.79 0.09 182);
  --primary-soft: oklch(0.27 0.035 186);
  --primary-soft-foreground: oklch(0.86 0.06 184);

  --destructive: oklch(0.76 0.13 25);
  --destructive-solid: oklch(0.55 0.18 25);
  --destructive-solid-hover: oklch(0.5 0.18 25);
  --destructive-soft: oklch(0.27 0.05 25);
  --success: oklch(0.78 0.12 152);
  --success-soft: oklch(0.27 0.04 152);
  --warning: oklch(0.82 0.12 78);
  --warning-soft: oklch(0.28 0.045 75);
  --warning-solid: oklch(0.78 0.14 75);
  --warning-solid-foreground: oklch(0.22 0.04 65);
  --info: oklch(0.78 0.1 250);
  --info-soft: oklch(0.27 0.04 255);
  --scrim: oklch(0 0 0 / 0.55);

  --q1: #d95926;
  --q2: #199e70;
  --q3: #c98500;
  --q4: #9085e9;

  --viz-series-1: #3987e5;
  --viz-seq-1: #0d366b;
  --viz-seq-2: #104281;
  --viz-seq-3: #1c5cab;
  --viz-seq-4: #2a78d6;
  --viz-seq-5: #5598e7;
  --viz-seq-6: #86b6ef;
  --viz-grid: oklch(1 0 0 / 0.07);
  --viz-axis: oklch(1 0 0 / 0.18);
  --chart-1: #3987e5;
  --chart-2: #d95926;
  --chart-3: #199e70;
  --chart-4: #c98500;
  --chart-5: #9085e9;

  --elev-xs: 0 1px 2px 0 oklch(0 0 0 / 0.4);
  --elev-sm: inset 0 1px 0 0 oklch(1 0 0 / 0.04), 0 1px 2px 0 oklch(0 0 0 / 0.35), 0 2px 8px -2px oklch(0 0 0 / 0.35);
  --elev-md: inset 0 1px 0 0 oklch(1 0 0 / 0.05), 0 4px 12px -2px oklch(0 0 0 / 0.5);
  --elev-lg: inset 0 1px 0 0 oklch(1 0 0 / 0.06), 0 4px 10px -2px oklch(0 0 0 / 0.45), 0 16px 32px -8px oklch(0 0 0 / 0.6);
  --elev-xl: inset 0 1px 0 0 oklch(1 0 0 / 0.06), 0 24px 64px -12px oklch(0 0 0 / 0.7);
  --elev-drag: inset 0 1px 0 0 oklch(1 0 0 / 0.06), 0 18px 40px -8px oklch(0 0 0 / 0.75);
  --elev-highlight: inset 0 1px 0 0 oklch(1 0 0 / 0.1);

  --event-mix: 24%;
}

@layer base {
  * { @apply border-border; }
  html {
    @apply font-sans;
    scroll-padding-top: 7rem;     /* top bar + a sticky secondary header (Tasks groups, Journal months, Plan header) */
    scroll-padding-bottom: 5rem;  /* sticky action bars / sheet footers */
    font-synthesis-weight: none;
    -webkit-tap-highlight-color: transparent;
  }
  body { @apply bg-background text-foreground antialiased; position: relative; }
  /* #root is deliberately NOT isolated: the toaster lives inside it and must stack above the dialogs and sheets Base UI portals to <body>. In-page z-indices stop at 30; popups are 50. */
  h1, h2, h3 { text-wrap: balance; }
  p { text-wrap: pretty; }
  button:not(:disabled), [role="button"]:not([aria-disabled="true"]), summary, label[for] { cursor: pointer; }
  /* The one focus mechanism. Components override only with focus-ring-inset / focus-field. */
  :focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
  ::selection { background: color-mix(in oklab, var(--primary) 22%, transparent); }

  /* dnd-kit: lift the element under the pointer. A keyframe, because dnd-kit locks transition/translate with !important. */
  [data-dnd-dragging]:not([data-dnd-dropping]):not([data-dnd-overlay]):not([data-dnd-placeholder]) {
    animation: var(--animate-dnd-lift);
    cursor: grabbing;
  }
  /* Sortable origin slot (Today priorities): a dashed ghost instead of an invisible gap. Runtime-verified by F1. */
  :root [data-dnd-placeholder="hidden"] {
    visibility: visible !important;
    border-radius: var(--radius-lg);
    outline: 1px dashed var(--border-strong);
    outline-offset: -1px;
    background: transparent;
    box-shadow: none;
  }
  :root [data-dnd-placeholder="hidden"] > * { visibility: hidden; }

  /* Route cross-fade (TanStack defaultViewTransition). Root only; no named groups. */
  ::view-transition { pointer-events: none; }
  ::view-transition-old(root) { animation-duration: 120ms; animation-timing-function: cubic-bezier(0.2, 0, 0, 1); }
  ::view-transition-new(root) { animation-duration: 180ms; animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1); }
}

/* ───────── Utilities ───────── */
/* Serif voice. Never combine with text-* sizes (lint grep). Display: voice-display + text-3xl|4xl|5xl. */
@utility voice-sm { font-family: var(--font-serif); font-size: 1rem; line-height: 1.625rem; }
@utility voice { font-family: var(--font-serif); font-size: 1.125rem; line-height: 1.75rem; }
@utility voice-lg { font-family: var(--font-serif); font-size: 1.25rem; line-height: 2rem; }
@utility voice-display { font-family: var(--font-serif); font-weight: 450; }

@utility focus-ring-inset { &:focus-visible { outline: 2px solid var(--ring); outline-offset: -2px; } }
@utility focus-field { &:focus-visible { outline: 2px solid var(--ring); outline-offset: -1px; } }

/* Title strike that sweeps in. Put data-done on the title or on any ancestor row. */
@utility strike {
  background: linear-gradient(currentColor, currentColor) 0 58% / 0% 1.5px no-repeat;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
  transition: background-size 240ms cubic-bezier(0.22, 1, 0.36, 1) 80ms, color 240ms cubic-bezier(0.2, 0, 0, 1) 80ms;
  &[data-done], :where([data-done]) & { background-size: 100% 1.5px; color: var(--muted-foreground); }
}

/* Anything that sets style={{ "--role": color }} adds role-scope to get legible derived colours. */
@utility role-scope {
  --role-ink: color-mix(in oklab, var(--role, var(--primary)) 85%, black);
  --role-on: white;
  --role-tint: color-mix(in oklab, var(--role, var(--muted-foreground)) var(--event-mix), var(--card));
  --role-wash: color-mix(in oklab, var(--role, var(--primary)) 10%, transparent);
  &:is(.dark *) {
    --role-ink: color-mix(in oklab, var(--role, var(--primary)) 75%, white);
    --role-on: var(--card);
  }
}

/* (The temporary .compass-text/.compass-display aliases were deleted in the §11d sweep.) */

@media (prefers-reduced-motion: reduce) {
  :root {
    --motion-rise: 0px;
    --motion-scale-in: 1;
    --motion-scale-press: 1;
    --motion-scale-press-lg: 1;
    --motion-scale-lift: 1;
    --motion-stagger: 0ms;
  }
  *, ::before, ::after {
    --tw-enter-scale: 1 !important; --tw-exit-scale: 1 !important;
    --tw-enter-translate-x: 0 !important; --tw-enter-translate-y: 0 !important;
    --tw-exit-translate-x: 0 !important; --tw-exit-translate-y: 0 !important;
    --tw-enter-rotate: 0 !important; --tw-exit-rotate: 0 !important;
    --tw-enter-blur: 0 !important; --tw-exit-blur: 0 !important;
    scroll-behavior: auto !important;
  }
  [data-starting-style], [data-ending-style] { scale: none !important; }
  [class*="duration-240"], [class*="duration-320"], [class*="duration-480"] { transition-duration: 150ms !important; }
  [data-slot="skeleton"], .animate-pulse, .animate-breathe, .animate-grow-y, .animate-draw, .animate-rise-in, .animate-bloom, [data-just-done] { animation: none !important; }
  [data-dnd-dragging] { animation: none !important; box-shadow: var(--elev-drag); }
  ::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*) { animation: none !important; }
}
```

### 2.1 What each token is for

| Token (utility) | Use | Never |
|---|---|---|
| `bg-background` | page canvas (paper) | inside cards |
| `bg-card` + `ring-1 ring-edge` + `shadow-sm` | raised surfaces: cards, tiles, board cards | nested inside another card |
| `bg-popover` + `ring-1 ring-edge` + `shadow-lg`/`shadow-xl` | popovers, menus, dialogs, sheets, toasts | in-page surfaces |
| `bg-inset` | sunken wells: board columns, week tray, segmented track | with a border or shadow |
| `bg-muted` | neutral fills: meter tracks, skeletons, neutral chips, count badges | as a card background |
| `bg-field` | text fields, checkbox/radio interiors | — |
| `bg-subtle` | hover plate on any surface | resting state |
| `bg-selected` | pressed/selected plate (current row, selected option) | faint text on top |
| `bg-sidebar` | sidebar only | — |
| `text-foreground` | ink: titles, body, values | — |
| `text-muted-foreground` | metadata, descriptions, labels, icons at rest | opacity modifiers (`/60`) |
| `text-faint-foreground` | placeholders, disabled text, `·` separators, decorative numerals | on `bg-selected`; on tinted fills (quadrant, role or status tints); for text someone must read to act |
| `border-border-subtle` | dividers, hour lines, hairlines between groups | — |
| `border-border` | outline buttons, Kbd | field borders |
| `border-border-strong` | drop-zone dashes, marginal rules, hover borders | — |
| `ring-edge` | hairline on every raised surface (box-shadow, so no layout) | as a field border |
| `border-input` | bordered text fields, Select and DateField triggers (≥3:1) | decoration |
| `border-control` / `bg-control` | checkbox, radio and switch-off boundary (≥3:1) | — |
| `ring-dot-ring` | 1px outline on every dot of 12px or less | — |
| `bg-primary` / `hover:bg-primary-hover` | the one primary button, today disc, now line, meter fill, checked controls | category, decoration, text |
| `text-primary-ink` | links, active nav icon, teal text | body copy |
| `bg-primary-soft` + `text-primary-soft-foreground` | `soft` button, "attention" count, Callout, plan-week row, check-in due | more than one Callout per page |
| `text-destructive` | **text-safe** red ink: errors, destructive menu items, destructive-ghost buttons | as a fill |
| `bg-destructive-solid` | the destructive confirm button fill | text |
| `bg-destructive-soft` | destructive hover plate, error callout, "remove block" drop state | lateness |
| `text-warning` / `bg-warning-soft` | past due dates (with an icon), over capacity, 30-minute plan timer | scheduled days, missed days, carried items |
| `text-success` / `bg-success-soft` | kept/done status icons, "saved" | — |
| `text-info` / `bg-info-soft` | informational notes (task status note) | — |
| `bg-q1…q4` | quadrant dots, bars, fills (`/12`, Q3 `/16`), top rules | text colour, whole-column borders |
| `role-scope` + `--role` | derived role colours: `--role-ink` (bars, check ring/fill), `--role-on` (tick), `--role-tint` (event fill), `--role-wash` (hover) | raw role hex for thin marks |

**Destructive split.** In this system `--destructive` is the **text-safe ink**, and the fill is `--destructive-solid`.
- The 16 existing `text-destructive` sites (field errors, menu items, ghost delete buttons, sign-in error) pass contrast automatically in both themes.
- Every fill must move to `bg-destructive-solid`:
  - `ui/button.tsx` and `ui/badge.tsx` (F2)
  - `week-stats.tsx:28`, where it becomes `bg-warning` (S2)
  - `goal-tray.tsx:41`, which becomes neutral (S2)
  - `auth.tsx:92`, which becomes a danger Callout (S9)

**Colour mixing rule.** Mix tints only `in oklab`, or against the `white`, `black` or `transparent` keywords.
- Never write `color-mix(in oklch, …)` against the warm neutrals: hue rotates. Blue turns khaki, and Q2 turns beige.
- Tailwind opacity modifiers (`bg-q2/12`) already mix `in oklab` with `transparent`, so they are safe.

**Also changes with the tokens (F1):**
- `index.html`: replace the single theme-color meta with `<meta name="theme-color" content="#f7f4ef" media="(prefers-color-scheme: light)" />` and `<meta name="theme-color" content="#110f0c" media="(prefers-color-scheme: dark)" />`.
- `src/components/theme.tsx`: when the resolved theme changes, set the `content` of both metas to `#f7f4ef` (light) or `#110f0c` (dark).

### 2.2 Measured contrast

WCAG 2 ratios. Normal text needs 4.5, and UI boundaries and focus need 3. All values are in sRGB gamut.

| Pair | Light | Dark |
|---|---|---|
| foreground on canvas / card / popover | 15.6 / 17.0 / 17.1 | 15.9 / 14.6 / 13.4 |
| muted-fg on canvas / card / inset / muted | 6.24 / 6.79 / 5.88 / 5.74 | 9.41 / 8.66 / 9.68 / 7.58 |
| muted-fg on a hover plate over inset / on selected over card | 5.35 / 5.78 | 8.81 / 6.83 |
| faint on canvas / card / inset / muted | 5.36 / 5.83 / 5.05 / 4.93 | 6.65 / 6.12 / 5.86 / 5.36 |
| faint on a hover plate over inset | 4.60 | 5.37 |
| primary-ink on card / canvas / primary-soft | 6.49 / 5.96 / 5.79 | 9.49 / 10.32 / 7.99 |
| primary-soft-fg on primary-soft | 9.32 | 9.95 |
| primary-fg on primary / primary-hover | 5.11 / 6.51 | 5.35 / 4.70 |
| ring on card / canvas / inset (≥3) | 5.21 / 4.79 / 4.51 | 6.39 / 6.95 / 7.14 |
| input border on card / canvas / popover (≥3) | 3.27 / 3.01 / 3.30 | 3.34 / 3.31 / 3.30 |
| control boundary on card / canvas (≥3) | 3.62 / 3.32 | 3.82 / 3.81 |
| destructive ink on card / canvas / destructive-soft | 6.02 / 5.54 / 5.38 | 7.79 / 8.47 / 6.77 |
| white on destructive-solid / its hover | 5.26 / 6.62 | 5.32 / 6.59 |
| success / warning / info ink on card | 5.64 / 5.65 / 5.98 | 9.24 / 9.99 / 8.87 |
| success / warning / info ink on its own soft fill | 5.04 / 5.10 / 5.29 | 7.78 / 8.30 / 7.57 |
| warning-solid-fg on warning-solid | 8.46 | 8.53 |
| `--role-ink` on card, worst role (#ca8a04 light, #4f46e5 dark) | ≥ 4.36 | ≥ 4.88 |
| tick on `--role-ink` (white light / card dark), worst role | ≥ 4.40 | ≥ 4.88 |
| `--role-ink` bar against its own event tint | ≥ 3.83 | ≥ 4.03 |
| muted-fg on an event tint (14% light / 24% dark) / done tint (7%) | ≥ 5.53 / ≥ 6.14 | ≥ 6.15 / ≥ 7.98 |
| muted-fg on the lit Q2 well (12% Q2 into inset) | 5.35 | 8.37 |
| quadrant dot on card: Q1 / Q2 / Q3 / Q4 | 3.17 / 2.79 / 2.15 / 8.48 | 4.54 / 5.18 / 5.75 / 5.65 |

**Surfaces separate by hairline and shadow, not by luminance.** Card on canvas is 1.09 in both themes, inset on card is 1.15 (light) and 1.12 (dark), and popover on canvas in dark is 1.18. So:
- Every raised surface carries `ring-1 ring-edge` plus a shadow.
- Dark mode gets its lift from lighter surfaces plus an inset top highlight (built into `--elev-*`).

**Two consequences:**
- Light Q2 and Q3 dots are under 3:1, so every quadrant dot carries `ring-1 ring-dot-ring` **and** a text label ("Q2") or its column position.
- Faint text is **banned on `bg-selected`** (4.37–4.58).

---

## 3. Typography

### 3.1 Scale

Use these names only. They are real Tailwind keys, so `cn` merges them.

| Utility | Size / line-height | Weight | Use |
|---|---|---|---|
| `text-2xs` | 12/16, +0.01em | 500–600 | **Floor.** Kbd, count badges, chart ticks, week-grid gutter labels and short-block titles, `sm` chips, menu shortcuts, calendar weekday headers |
| `text-xs` | **13**/18 | 400 meta · 500 labels | All metadata, helper text, field labels, eyebrows, tooltips, captions |
| `text-sm` | 14/20 | 400 body · 500 buttons, nav, row titles | UI default |
| `text-md` | 15/24 | 400 | Page descriptions, step ledes, empty-state text, onboarding copy, command input |
| `text-base` | 16/24 | 600 | Section headings, card titles; mobile inputs (prevents iOS zoom) |
| `text-lg` | 18/26 | 600 | Dialog and sheet titles, role names |
| `text-xl` | 20/28 | 600 | Task-sheet title |
| `text-2xl` | 24/30 | 600, `tabular-nums` | Stat values |
| `text-3xl` / `text-4xl` | 32/38, 40/46 | 600 | Timers (Geist, tabular) |
| `voice-display text-2xl` | 24 serif, 450 | | Section titles inside Exercises and Influence |
| `voice-display text-3xl` | 32 serif, 450 | | **Every page title (h1)**, step titles, Week range, 404 |
| `voice-display text-4xl` | 40 serif, 450 | | Today greeting (`sm:`), sign-in, Focus title (base) |
| `voice-display text-5xl` | 52 serif, 450 | | Welcome hero (`sm:`), Focus title (`sm:`) |
| `voice-lg` · `voice` · `voice-sm` | 20/32 · 18/28 · 16/26 serif, 400 | | Mission editor · affirmations, reflections, journal bodies, reframes, quotes · role statements, notes, reflection fields, in-card quotes |

At 375px, h1s drop one step: `voice-display text-2xl sm:text-3xl`. The greeting uses `text-3xl sm:text-4xl`.

### 3.2 Rules

1. **Nothing below 12px.** These are banned:
   - `text-[9px]`, `text-[10px]`, `text-[11px]` and any `text-[…]` arbitrary size (including SVG text; use `text-2xs` on `<text>`)
   - `!text-*` overrides
   - `text-[0.8rem]`, `text-[0.95rem]`, `text-[1.075rem]`
2. **No opacity on text.** `text-foreground/60` and `text-muted-foreground/70` are banned. Pick an ink token.
3. **No uppercase, no letter-spaced labels.** `uppercase`, `tracking-wide` and `tracking-wider` are banned. Eyebrows are sentence case: `text-xs font-medium text-muted-foreground`.
4. **Weights:** Geist uses 400, 500 and 600. Newsreader uses 400–450 (`voice-display` is 450). `font-bold` and 700 are banned.
5. **Serif usage:**
   - Newsreader appears only through `voice*` utilities: page and step titles, the greeting and the reflective content listed above.
   - Never use it for buttons, chips, inputs for data, numbers you act on, stats, times or errors.
   - Italic is for quotations, affirmations, reframes, the weekly focus and PrincipleNote only. Never italicise Geist (no italic face is loaded).
   - Don't set `font-variation-settings`; optical size is automatic now that the `opsz` axis loads.
6. **Never combine `voice*` with a `text-*` size.** `cn` keeps both, and `md:text-sm` then wins. Serif fields use the Input/Textarea `voice` prop (§6.1), which removes `text-base md:text-sm`.
7. **Numerals:** use `tabular-nums` on times, durations, dates in lists, counts, stats, meters, hour labels, timers and chart ticks. Timers use Geist, never `font-mono`.
8. **Measure:** reading text and serif blocks cap at `max-w-[65ch]`; descriptions at `max-w-[60ch]`. `h1–h3` balance and `p` wraps pretty (set in base CSS).
9. **Copy typography:**
   - `…` not `...`.
   - En dash for ranges (`9:30–10:15`, `Sep 21 – 27`).
   - Sentence case everywhere.
   - All guidance text stays original wording (§12).

### 3.3 Side effects of `text-xs` becoming 13px (F2/F3 QA)

Stock primitives that used `text-xs` in fixed heights move to `text-2xs`:
- `Kbd`, `DropdownMenuShortcut`, `CommandShortcut`, `SidebarMenuBadge`
- calendar weekday headers, `sm` chips, count badges

Every screen owner checks their fixed-height containers at 13/18 after the foundation lands. The known risk is week-grid chips and blocks, which S2 retunes anyway.

---

## 4. Spacing, radius, elevation, containers

### 4.1 Spacing: 4px grid

- **Allowed steps:** 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 16, plus 0.75 (3px) only for role and quadrant bars.
- **Rhythm:**

  | Context | Spacing |
  |---|---|
  | Page sections | `space-y-10` (40px) |
  | Header to content | 32px (`mb-8` on PageHeader) |
  | Within a section | 12–16px |
  | Groups inside a card | label plus `pt-5` (20px), no box |
  | Rows | 0 gap with hairline dividers, or `gap-1.5` for board cards |
  | Icon to label | `gap-1.5` (16px icon) or `gap-2` (20px icon) |
  | Card padding | `p-5` (`max-sm:p-4`) |
  | Compact card padding | `p-4` |
  | Popover padding | `p-3` |
  | Menu padding | `p-1` |
  | Dialog padding | `p-6` (`max-sm:p-5`) |

- **Group-to-group gap is at least twice the within-group gap.**

### 4.2 Radius

These are the canonical names. Write only these.

| Class | px | Job |
|---|---|---|
| `rounded-xs` | 4 | checkbox, Kbd, tiny marks (replaces bare `rounded`, `rounded-[4px]`, `rounded-[5px]`) |
| `rounded-sm` | 6 | things inside a control: segmented thumb and options, week-grid event blocks, hover-slot preview |
| `rounded-lg` | 8 | **every control**: buttons, inputs, selects, date triggers, menu and select items, tooltips, list-row plates, board cards, week-lane chips, Today timeline events |
| `rounded-xl` | 12 | cards, wells, stat strips, popovers, menus, select popups, toasts, callouts, verdict card |
| `rounded-2xl` | 16 | dialogs, alert dialogs, the floating sheet, the command palette. Nothing in-page. |
| `rounded-full` | pill | chips, badges, count badges, avatars, dots, switch, DoneCheck, challenge days, stepper discs |

- `rounded-md` (=8) and `rounded-3xl` (=16) are aliases that keep old classes rendering. Never write them in new code. `rounded-4xl` renders as a pill for legacy Badge only.
- **Nesting rule: inner radius = outer radius − padding.**
  - A menu (12) with `p-1` gives items of 8.
  - A segmented track (8) with `p-0.5` gives a thumb of 6.
  - A well (12) with `p-2` gives cards of 8.
  - When padding is at least the outer radius (a card with `p-5`), inner controls use the control radius (8).

### 4.3 Elevation

There are four surfaces, each with one recipe.

| Level | Recipe | Examples |
|---|---|---|
| Sunken | `bg-inset`, no ring, no shadow | board columns, week tray, segmented track |
| Flat | `bg-background` | the page; lists sit here |
| Raised | `bg-card ring-1 ring-edge shadow-sm` (board cards and fields `shadow-xs`; hover `shadow-md`) | cards, stat strip, board cards, focal sheet |
| Overlay | `bg-popover ring-1 ring-edge shadow-lg` (dialog, sheet, palette `shadow-xl`) | popover, menu, select, toast, dialog |
| Drag | `shadow-2xl` (maps to `--elev-drag`) via the `dnd-lift` keyframe | the item under the pointer |

- **Real `border`** is for bordered text fields, Select and DateField triggers, outline buttons, ChoiceChips and Kbd only. Everything else raised uses the `ring-1 ring-edge` hairline.
- **Dividers:** `border-border-subtle` (1px) inside cards, between list rows (inset to the text column), and between rail sections. Use either a divider or extra space, never both.
- **Background step:** hover `bg-subtle`, selected `bg-selected`, recessed `bg-inset`/`bg-sidebar`.
- **Shadows** are only the tokenised `shadow-xs…2xl` and `inset-shadow-2xs`. Arbitrary `shadow-[…]` is banned except the Kbd keycap line (§6.1).

### 4.4 No boxes inside boxes

- A **Card** may contain rows, GroupLabels, hairlines, fields, meters, chips and buttons. It never contains another Card, a Well or a bordered or tinted box.
- A **Well** may contain board cards (the one sanctioned two-level pattern) and an inline QuickAdd.
- A **Dialog or Sheet** may contain at most one muted sub-panel (`rounded-lg bg-muted p-3`) for a conditional sub-form (delegate panel). Nothing else is boxed.
- **Never a card for:** a single line, a lone paragraph, a page header, list rows, A/B/C groups, agreement elements, rail guidance, empty slots, or a box around inputs.
- **`bg-background` items inside `bg-card`** (inverted depth) are banned.
- **Dashed lines** exist in exactly three places:
  - drop zones, only while a compatible drag is active
  - the drag-source ghost
  - the `dotted` half-hour lines in the week grid

  Resting empty slots are never dashed.

---

## 5. Iconography

- **Provider:** wrap the app in `<LucideProvider strokeWidth={1.5} nonScalingStroke>` (in `main.tsx`, owned by F1). Every lucide icon then renders a 1.5px line at any size.
- **Sizes by context:**

  | Size | px | Context |
  |---|---|---|
  | `size-3.5` | 14 | inside meta lines, `xs` buttons, chips, board-card meta |
  | `size-4` | 16 | **default**: buttons, nav, menus, inputs, section headers, tabs |
  | `size-4.5` | 18 | command-palette input, `xl` buttons |
  | `size-5` | 20 | empty states, brand mark, 404 |
  | `size-3` | 12 | **only** inside `sm` chips and inside glyph containers of 16–20px (DoneCheck sm). Never elsewhere. `size-2.5` is banned. |

- **Colour:** `text-muted-foreground` at rest, `text-foreground` on hover or active.
  - Teal (`text-primary-ink`) only for the active nav icon, links and the free-write timer at zero.
  - Status icons use their status ink.
  - No coloured icon tiles; the only icon container is the neutral `bg-muted` circle in EmptyState.
- **Every icon-only button has an `aria-label`**, and a Tooltip when its meaning isn't obvious. Use `IconButton` (§6.2). Native `title=""` on interactive elements is banned (53 sites today).
- **Fixed meanings** (resolve today's collisions):

  | Concept | Icon |
  |---|---|
  | Big rock | `Mountain` |
  | Deadline / due / past-due | `CalendarClock` |
  | Unfinished / waiting | `Hourglass` |
  | Say no | `Ban` |
  | Let it go / drop | `CircleX` |
  | Delete | `Trash2` |
  | Carried | `Repeat` |
  | Not placed yet | `CircleDashed` |
  | Delegate | `HeartHandshake` |
  | Plan week | `CalendarCheck` |
  | Kept | `CircleCheck` (success) |
  | Journal: daily | `Moon` |
  | Journal: weekly | `CalendarCheck` |
  | Journal: choice | `Scale` |
  | Journal: note | `NotebookPen` |
  | Journal: tribute, free-write, mission questions | `Compass` |

---

## 6. Components

**Global rules for every component:**
- Never `transition-all`; list the properties.
- Never `outline-none`, `ring-3` or `ring-ring/50` for focus. Focus comes from the one global `:focus-visible` outline (2px `--ring`, offset 2). Components override only with:
  - `focus-ring-inset`, where the ring would be clipped or crowd neighbours (tabs, segmented options, list rows, grid blocks)
  - `focus-field` (text fields)
- `outline-hidden` is allowed only on:
  - menu, select and command items (focus shown by `data-highlighted`/`data-selected`)
  - overlay popups
  - a field whose container shows `has-focus-visible`/`focus-within` focus (paper editor, QuickAdd)
- Base UI state variants:
  - `data-[selected]:` on Base UI parts (Select items).
  - `data-[selected=true]:` on cmdk items.
  - `data-highlighted:` for menu and select highlight (not `focus:bg-accent`).
  - **Specificity trap:** shadcn's custom variants (`data-active:`, `data-checked:`, `data-unchecked:`, `data-disabled:`, `data-open:`, `data-closed:`, `data-selected:`) compile inside `:where()`, so they are (0,1,0) and lose to any `hover:`, `aria-*:`, `has-*:` or `data-[…]:` utility on the same property, whatever the source order. When a state plate must survive hover, repeat it under the hover (`data-active:bg-card data-active:hover:bg-card`), or exclude the state from the hover (`not-has-[[data-checked]]:hover:…`). The same applies to a plain selected class against a hover plate: `bg-selected hover:bg-selected`. The custom `data-selected:` matches only `data-selected="true"`, so Base UI parts (which write an empty value) keep `data-[selected]:`.
- **Overlays use Base UI transitions** (`data-starting-style`/`data-ending-style`). Delete every tw-animate `data-open:animate-in fade-in-0 zoom-in-95 slide-in-from-* duration-100` class from `ui/*`, or popups animate twice.

### 6.1 Primitives in `src/components/ui/*`

Owners: F2 (controls) and F3 (surfaces and overlays). Keep every export name, prop and `data-slot`. New props are additive.

#### Button (`ui/button.tsx`, F2)

- **Component:** render `data-variant={variant}` and `data-size={size}` on the element (Base UI forwards them). Keep the `nativeButton` logic.
- **Base:**
  ```
  group/button relative inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap select-none transition-[color,background-color,border-color,box-shadow,scale] duration-120 ease-out active:not-aria-[haspopup]:scale-(--motion-scale-press) disabled:pointer-events-none disabled:opacity-45 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4
  ```
- **Variants:**

  | Variant | Classes | Use |
  |---|---|---|
  | `default` | `bg-primary text-primary-foreground shadow-xs inset-shadow-2xs hover:bg-primary-hover` | the one primary action per view |
  | `outline` | `border-border bg-card text-foreground shadow-xs hover:border-border-strong hover:bg-[color-mix(in_oklab,var(--card),var(--foreground)_4%)] aria-expanded:bg-[color-mix(in_oklab,var(--card),var(--foreground)_4%)] dark:bg-muted dark:hover:bg-[color-mix(in_oklab,var(--muted),white_5%)] dark:aria-expanded:bg-[color-mix(in_oklab,var(--muted),white_5%)]` | the workhorse (the last class keeps the open-menu plate in dark, where `dark:bg-muted` would otherwise win) |
  | `secondary` | `bg-muted text-foreground hover:bg-[color-mix(in_oklab,var(--muted),var(--foreground)_6%)] aria-pressed:bg-selected` | quiet actions, pressed toggles |
  | `soft` (new) | `bg-primary-soft text-primary-soft-foreground hover:bg-[color-mix(in_oklab,var(--primary-soft),var(--primary)_12%)]` | plan-week row, callout actions |
  | `ghost` | `text-muted-foreground hover:bg-subtle hover:text-foreground aria-expanded:bg-subtle aria-expanded:text-foreground aria-pressed:bg-selected aria-pressed:text-foreground` | toolbars, rows, icon buttons |
  | `destructive` | `bg-destructive-solid text-white shadow-xs inset-shadow-2xs hover:bg-destructive-solid-hover` | confirm dialogs only |
  | `destructive-ghost` (new) | `text-destructive hover:bg-destructive-soft` | replaces the 4 `ghost` + `className="text-destructive"` sites |
  | `link` | `rounded-xs text-primary-ink underline decoration-[color-mix(in_oklab,var(--primary-ink)_40%,transparent)] underline-offset-4 hover:decoration-current` | inline links; always with `size="inline"` |

  Add a compoundVariant `{ variant: "link", class: "h-auto px-0" }` so link never inherits a height.

- **Sizes.** The names are unchanged, so every existing call site moves up one step automatically: 24→28, 28→32, 32→36, 36→40.

  | Size | Classes | Fine / coarse |
  |---|---|---|
  | `xs` | `h-7 gap-1.5 px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3.5 pointer-coarse:after:absolute pointer-coarse:after:-inset-2` | 28 / 44 hit area |
  | `sm` | `h-8 px-3 pointer-coarse:h-11` | 32 / 44 |
  | `default` | `h-9 px-3.5 pointer-coarse:h-11` | 36 / 44 |
  | `lg` | `h-10 px-4 pointer-coarse:h-11` | 40 / 44 |
  | `xl` (new) | `h-11 px-5 text-md [&_svg:not([class*='size-'])]:size-4.5` | 44: welcome, sign-in, plan ActionBar |
  | `icon-xs` | `size-7 [&_svg:not([class*='size-'])]:size-3.5 pointer-coarse:after:absolute pointer-coarse:after:-inset-2` | 28 / 44 hit area |
  | `icon-sm` | `size-8 pointer-coarse:size-11` | 32 / 44 |
  | `icon` | `size-9 pointer-coarse:size-11` | 36 / 44 |
  | `icon-lg` | `size-10 pointer-coarse:size-11` | 40 / 44 |
  | `inline` (new) | `h-auto gap-1 p-0` | text links |

- Remove the shadcn `rounded-[min(var(--radius-md),…)]` and `has-data-[icon=…]` padding rules.
- **Pending:** while a mutation it triggers is pending, render `<Spinner />` in place of the leading icon and set `aria-busy`. The width stays the same.

#### Kbd (`ui/kbd.tsx`, F2)

```
pointer-events-none inline-flex h-5 min-w-5 items-center justify-center gap-0.5 rounded-xs border border-border bg-card px-1 font-sans text-2xs font-medium text-muted-foreground tabular-nums shadow-[0_1px_0_var(--border)] select-none in-data-[slot=tooltip-content]:border-transparent in-data-[slot=tooltip-content]:bg-background/15 in-data-[slot=tooltip-content]:text-background in-data-[slot=tooltip-content]:shadow-none group-data-[variant=default]/button:border-transparent group-data-[variant=default]/button:bg-black/15 group-data-[variant=default]/button:text-primary-foreground group-data-[variant=default]/button:shadow-none
```

- Inside a primary Button the plate **darkens** the teal (`bg-black/15`): 6.55:1 light, 6.07:1 on dark hover. A lighter `primary-foreground/15` plate measured 3.6–4.0:1 and failed §9.1.
- Scope the in-button adaptation with `group-data-[variant=default]/button:` only. **Never** use `in-data-[variant=default]:`, because menus, tabs and the sidebar also emit `data-variant="default"`.
- The platform modifier comes from `MOD_KEY` in `src/lib/platform.ts` (F1): `⌘` on Mac, `Ctrl` elsewhere.

#### Fields (`ui/input.tsx`, `ui/textarea.tsx`, F2)

- **`fieldShell`**, exported from `ui/input.tsx` and reused by SelectTrigger, the DateField trigger and InputGroup:
  ```
  w-full min-w-0 rounded-lg border border-input bg-field text-foreground shadow-xs transition-[border-color,box-shadow,background-color] duration-120 ease-out placeholder:text-faint-foreground hover:border-muted-foreground focus-field focus-visible:border-ring disabled:cursor-not-allowed disabled:border-border disabled:bg-muted disabled:text-faint-foreground aria-invalid:border-destructive
  ```

- **Input**
  - Props: `Omit<ComponentProps<"input">, "size"> & { size?: "sm" | "default" | "lg"; variant?: "default" | "ghost"; voice?: "sm" | "md" | "lg" }`.
  - `default`: `cn(fieldShell, "h-9 px-3 text-base md:text-sm pointer-coarse:h-11")`
  - `sm`: `h-8 px-2.5`
  - `lg`: `h-11 px-3.5 text-base`
  - `ghost` (inline edit; replaces the 5 borderless recipes and every `focus-visible:ring-0`):
    ```
    -mx-1.5 h-auto min-h-8 border-transparent bg-transparent px-1.5 shadow-none hover:border-transparent hover:bg-subtle focus-visible:border-ring focus-visible:bg-field
    ```
  - `voice`: **replaces** `text-base md:text-sm` with `voice-sm` / `voice` / `voice-lg`. All are ≥16px, so iOS won't zoom. This removes all 21 `!text-*` overrides.
  - Keep the `file:` classes.

- **Textarea**
  - Same props, plus `variant="paper"`.
  - Base: `cn(fieldShell, "min-h-20 px-3 py-2.5 field-sizing-content resize-y supports-[field-sizing:content]:resize-none text-base md:text-sm")`. Where `field-sizing` is unsupported the field can't grow, so the manual resize handle stays as the fallback.
  - `ghost`: as Input ghost, plus `resize-none py-1.5`.
  - `paper` (mission editor only):
    ```
    min-h-[60vh] resize-none rounded-none border-0 bg-transparent px-0 py-0 shadow-none hover:border-0 focus-visible:outline-none
    ```
    Its container shows focus instead (§10 Compass).

- **Label** (`ui/label.tsx`)
  - Default: `text-sm leading-5 font-medium text-foreground`.
  - New `size="sm"`: `text-xs font-medium text-muted-foreground`. This replaces the 18 `className="text-xs text-muted-foreground"` overrides.
  - Always pair it with `htmlFor`.

- **Field** (`ui/field.tsx`), to adopt in dialogs and the task sheet:
  - `FieldLabel`: Label `sm`.
  - `FieldDescription`: `text-xs text-muted-foreground`.
  - `FieldError`: `flex items-center gap-1.5 text-xs font-medium text-destructive` with `CircleAlert size-3.5`.

- **InputGroup** (`ui/input-group.tsx`)
  - Shell: `cn(fieldShell, "flex h-9 items-center pointer-coarse:h-11")`.
  - Leading addon: `pl-3 text-muted-foreground [&_svg]:size-4`.
  - Replace `calc(var(--radius)-5px)` with `rounded-sm`.
  - Search pattern: leading `Search`, trailing `Kbd`.

#### Select (`ui/select.tsx`, F2)

- **Trigger**
  - Props add `variant?: "default" | "ghost"`. Existing `size` stays.
  - Base:
    ```
    cn(fieldShell, "flex h-9 items-center justify-between gap-2 px-3 text-sm whitespace-nowrap data-[popup-open]:border-ring data-[placeholder]:text-faint-foreground pointer-coarse:h-11 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&>svg:last-child]:size-4 [&>svg:last-child]:text-muted-foreground *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 *:data-[slot=select-value]:line-clamp-1")
    ```
  - `sm`: `h-8 px-2.5`.
  - `ghost` (task-sheet property grid):
    ```
    border-transparent bg-transparent shadow-none hover:border-input hover:bg-field data-[popup-open]:border-ring
    ```
- **Popup**
  ```
  relative isolate z-50 max-h-(--available-height) w-(--anchor-width) min-w-44 overflow-x-hidden overflow-y-auto rounded-xl bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-edge outline-hidden
  ```
  Add `popupMotion` (§6.1 Overlays) plus `data-[align-trigger=true]:data-starting-style:scale-100 data-[align-trigger=true]:data-starting-style:translate-y-0`.
- **Item**
  ```
  relative flex h-9 w-full cursor-default items-center gap-2 rounded-lg pr-8 pl-2.5 text-sm outline-hidden select-none data-highlighted:bg-subtle data-disabled:pointer-events-none data-disabled:opacity-45 data-[selected]:font-medium pointer-coarse:h-11 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground
  ```
  The indicator is a check on the right in `text-primary-ink`.
- **Label:** `px-2.5 pt-2 pb-1 text-xs font-medium text-muted-foreground`.
- **Separator:** `-mx-1 my-1 h-px bg-border-subtle`.
- **Rule:** `Select` still needs `items` to render labels.

#### Checkbox (`ui/checkbox.tsx`, F2)

- **Root**
  ```
  peer relative grid size-4.5 shrink-0 place-items-center rounded-xs border-[1.5px] border-control bg-field text-primary-foreground transition-[background-color,border-color] duration-120 ease-out after:absolute after:-inset-2.5 pointer-coarse:after:-inset-3.5 data-checked:border-primary data-checked:bg-primary aria-invalid:border-destructive data-disabled:cursor-not-allowed data-disabled:opacity-45
  ```
- **Indicator:** replace `CheckIcon` with an inline SVG, `<svg viewBox="0 0 24 24" fill="none" className="size-3.5" aria-hidden>`, holding `<path d="M5 12.5l4.5 4.5L19 7.5" pathLength={1} className="stroke-current [stroke-width:3] [stroke-linecap:round] [stroke-linejoin:round] [stroke-dasharray:1] [stroke-dashoffset:0] transition-[stroke-dashoffset] duration-180 ease-out in-data-starting-style:[stroke-dashoffset:1]" />`.
- **Verified:** Base UI does not apply `data-starting-style` to an indicator that mounts already checked, so boxes loaded as checked never animate.

#### RadioGroup (`ui/radio-group.tsx`, F2; not currently adopted)

- Item: the Checkbox recipe with `rounded-full`.
- Indicator: `size-2 rounded-full bg-primary-foreground`.

#### Switch (`ui/switch.tsx`, F2)

- **Root**
  ```
  peer group/switch relative inline-flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 transition-colors duration-180 ease-out after:absolute after:-inset-2.5 data-checked:bg-primary data-unchecked:bg-control data-disabled:cursor-not-allowed data-disabled:opacity-45 forced-colors:border forced-colors:border-[ButtonText] forced-colors:p-px
  ```
  `size="sm"`: `h-5 w-8`. Forced colours flatten fills and drop shadows, so the track gets a real border there; `p-px` offsets the border so the thumb's travel is unchanged.
- **Thumb**
  ```
  pointer-events-none block size-5 rounded-full bg-white shadow-xs transition-[translate] duration-180 ease-out data-checked:translate-x-4 forced-color-adjust-none forced-colors:bg-[ButtonText]
  ```
  `sm`: `size-4 data-checked:translate-x-3`.

#### Slider (`ui/slider.tsx`, F2)

- Track: `h-1.5 rounded-full bg-muted forced-colors:border forced-colors:border-[ButtonText]`.
- Range: `bg-primary forced-color-adjust-none forced-colors:bg-[Highlight]`.
- Thumb: `size-4 rounded-full bg-card shadow-sm ring-1 ring-control after:absolute after:-inset-2 pointer-coarse:after:-inset-3.5 forced-colors:border forced-colors:border-[ButtonText]` (its ring is a box-shadow, which forced colours drop).

#### Badge (`ui/badge.tsx`, F2)

Badge takes the Chip geometry (§6.2): `inline-flex h-6 w-fit shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap [&>svg]:size-3.5`.

| Variant | Classes |
|---|---|
| `default` | `bg-primary-soft text-primary-soft-foreground` |
| `secondary` | `bg-muted text-foreground` |
| `outline` | `ring-1 ring-inset ring-border-strong text-muted-foreground` |
| `destructive` | `bg-destructive-soft text-destructive` |

#### Calendar (`ui/calendar.tsx`, F2)

- `--cell-size: --spacing(9)`, with `pointer-coarse:[--cell-size:--spacing(11)]`.
- Weekday headers: `text-2xs font-medium text-muted-foreground`.
- Day: `rounded-lg`.
- Selected: `bg-primary text-primary-foreground`.
- Today: `ring-1 ring-inset ring-border-strong`.
- Outside days: `text-faint-foreground`.

#### Small primitives (F2)

- **Spinner:** `size-4 animate-spin text-muted-foreground`. Keep `role="status"` and the `aria-label`.
- **Separator:** `bg-border-subtle`.
- **Toggle / ToggleGroup / ButtonGroup:** restyle to the Segmented option recipe. Not adopted anywhere.
- **Progress:** restyle to the Meter recipe (§6.2). Not adopted.

#### Overlays (F3)

`src/components/ui/overlay-motion.ts` is new (F3):

```ts
export const popupMotion =
  "origin-(--transform-origin) transition-[opacity,scale,translate] duration-180 ease-out " +
  "data-starting-style:opacity-0 data-starting-style:scale-(--motion-scale-in) " +
  "data-ending-style:opacity-0 data-ending-style:scale-(--motion-scale-in) data-ending-style:duration-120 " +
  "data-[side=bottom]:data-starting-style:-translate-y-(--motion-rise) data-[side=top]:data-starting-style:translate-y-(--motion-rise) " +
  "data-[side=left]:data-starting-style:translate-x-(--motion-rise) data-[side=right]:data-starting-style:-translate-x-(--motion-rise) " +
  "data-instant:transition-none";

export const tooltipMotion =
  "origin-(--transform-origin) transition-[opacity,scale] duration-120 ease-out " +
  "data-starting-style:opacity-0 data-starting-style:scale-(--motion-scale-in) " +
  "data-ending-style:opacity-0 data-ending-style:duration-80 data-instant:transition-none";
```

- **Popover** (`ui/popover.tsx`): `cn("z-50 flex w-72 flex-col gap-3 rounded-xl bg-popover p-3 text-sm text-popover-foreground shadow-lg ring-1 ring-edge outline-hidden", popupMotion)`.
- **DropdownMenu** (`ui/dropdown-menu.tsx`)
  - **Content:**
    ```
    cn("z-50 max-h-(--available-height) w-(--anchor-width) min-w-44 overflow-x-hidden overflow-y-auto rounded-xl bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-edge outline-hidden", popupMotion)
    ```
    Sub-content is the same.
  - **Item:**
    ```
    group/dropdown-menu-item relative flex h-9 cursor-default items-center gap-2 rounded-lg px-2.5 text-sm outline-hidden select-none data-highlighted:bg-subtle data-disabled:pointer-events-none data-disabled:opacity-45 data-[variant=destructive]:text-destructive data-[variant=destructive]:data-highlighted:bg-destructive-soft pointer-coarse:h-11 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground
    ```
    Replace every `focus:bg-accent` with `data-highlighted:`.
  - **CheckboxItem / RadioItem:** the Item recipe with `pr-8`. Indicator is `text-primary-ink`.
  - **Label:** `px-2.5 pt-2 pb-1 text-xs font-medium text-muted-foreground`.
  - **Separator:** `-mx-1 my-1 h-px bg-border-subtle`.
  - **Shortcut:** `ml-auto text-2xs text-muted-foreground tabular-nums`.
- **Tooltip** (`ui/tooltip.tsx`)
  - **Popup:**
    ```
    cn("z-50 inline-flex w-fit max-w-64 items-center gap-1.5 rounded-lg bg-foreground px-2.5 py-1.5 text-xs font-medium text-background shadow-md has-data-[slot=kbd]:pr-1.5", tooltipMotion)
    ```
  - Delete the Arrow. The default `sideOffset` becomes 6.
  - `TooltipProvider delay={300}` stays in `main.tsx`.
  - A Tooltip is visual only in Base UI, so its trigger always carries its own `aria-label` or visible text.
- **Dialog** (`ui/dialog.tsx`)
  - **Overlay:**
    ```
    fixed inset-0 isolate z-50 bg-scrim transition-opacity duration-240 ease-out data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-180 supports-backdrop-filter:backdrop-blur-[2px] supports-[-webkit-touch-callout:none]:absolute supports-[-webkit-touch-callout:none]:min-h-dvh
    ```
  - **Content** props add `size?: "sm" | "md" | "lg" | "xl"` (default `md`) and `placement?: "center" | "top"`.
  - **Content base:**
    ```
    fixed top-1/2 left-1/2 z-50 flex w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-5 overflow-y-auto overscroll-contain rounded-2xl bg-popover p-6 text-sm text-popover-foreground shadow-xl ring-1 ring-edge outline-hidden max-h-[calc(100dvh-2rem)] transition-[opacity,scale,translate] duration-240 ease-out data-starting-style:scale-[0.97] data-starting-style:opacity-0 data-ending-style:scale-[0.97] data-ending-style:opacity-0 data-ending-style:duration-180 max-sm:top-auto max-sm:right-3 max-sm:bottom-[max(0.75rem,env(safe-area-inset-bottom))] max-sm:left-3 max-sm:w-auto max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:p-5 max-sm:max-h-[calc(100dvh-1.5rem)] max-sm:data-starting-style:translate-y-4 max-sm:data-ending-style:translate-y-4 max-sm:motion-reduce:data-starting-style:translate-y-0 max-sm:motion-reduce:data-ending-style:translate-y-0
    ```
    Below `sm`, dialogs are bottom-anchored floating cards for thumb reach.
  - **Sizes:** `sm:max-w-sm`, `sm:max-w-md`, `sm:max-w-xl`, `sm:max-w-2xl`. Existing `className="sm:max-w-*"` overrides keep merging.
  - **`placement="top"`:** `sm:top-[max(1rem,8dvh)] sm:translate-y-0 sm:max-h-[calc(100dvh-max(2rem,16dvh))]`. This retires the five `top-[Nvh] translate-y-0 max-h-[..] overflow-y-auto` hacks.
  - **Close:** `absolute top-3 right-3`, ghost `icon-sm`.
  - **Header:** `flex flex-col gap-1.5 pr-8`.
  - **Title:** `text-lg font-semibold text-foreground`.
  - **Description:** `text-sm text-muted-foreground`.
  - **Footer** props add `start?: ReactNode`:
    ```
    sticky bottom-0 z-10 -mx-6 -mb-6 mt-1 flex flex-wrap items-center justify-end gap-2 border-t border-border-subtle bg-popover px-6 py-4 max-sm:-mx-5 max-sm:-mb-5 max-sm:px-5
    ```
    `start` renders first in `<div className="mr-auto flex items-center gap-2">`. This replaces every `sm:justify-between` and `<span />` spacer.
  - The footer is sticky, so long dialogs scroll with the actions always visible. `DialogContent` adds `scroll-pb-24` so a field focused from the keyboard scrolls clear of it (§9), and on Tab into a textarea it scrolls the whole field into view (the browser reveals only the caret).
- **AlertDialog** (`ui/alert-dialog.tsx`)
  - Same overlay and content recipe, `size` default `sm`, centred.
  - Footer: as the Dialog footer, without `sticky`.
  - The destructive confirm uses `variant="destructive"`; the safe action is `outline` and receives initial focus.
  - **Change Dialog and AlertDialog together.**
- **Sheet** (`ui/sheet.tsx`)
  - **Overlay:** as Dialog.
  - **Content base:**
    ```
    fixed z-50 flex flex-col bg-popover text-sm text-popover-foreground shadow-xl ring-1 ring-edge outline-hidden transition-[translate,opacity] duration-320 ease-drawer data-ending-style:duration-240 data-ending-style:ease-in motion-reduce:data-starting-style:opacity-0 motion-reduce:data-ending-style:opacity-0
    ```
  - **`side="right"`:**
    ```
    inset-y-0 right-0 h-full w-full sm:inset-y-2 sm:right-2 sm:h-auto sm:w-[min(32rem,calc(100vw-1rem))] sm:rounded-2xl data-starting-style:translate-x-[calc(100%+1rem)] data-ending-style:translate-x-[calc(100%+1rem)] motion-reduce:data-starting-style:translate-x-0 motion-reduce:data-ending-style:translate-x-0
    ```
    It floats on desktop and is full-screen on mobile.
  - **`side="left"`** (mobile sidebar):
    ```
    inset-y-0 left-0 h-full w-3/4 max-w-[18rem] data-starting-style:-translate-x-full data-ending-style:-translate-x-full motion-reduce:data-starting-style:translate-x-0 motion-reduce:data-ending-style:translate-x-0
    ```
  - Top and bottom sides mirror that pattern.
  - **Header:** `flex flex-col gap-1 px-5 pt-5 pb-3`. **Title:** `text-lg font-semibold`. **Footer:** `mt-auto flex items-center gap-2 border-t border-border-subtle px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]`.
  - **Close:** `absolute top-3.5 right-3.5`, ghost `icon-sm`. It must stay a direct child `<button>` of the popup, because the mobile sidebar hides it with `[&>button]:hidden`.
- **Command** (`ui/command.tsx`)
  - **CommandDialog content:**
    ```
    top-[18dvh] w-[min(40rem,calc(100vw-2rem))] max-w-none translate-y-0 gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-none duration-100 data-ending-style:duration-100 data-starting-style:scale-100 data-ending-style:scale-100 max-sm:top-[max(0.75rem,env(safe-area-inset-top))] max-sm:bottom-auto max-sm:p-0
    ```
    It is opacity-only and 100ms, because it is keyboard-opened and frequent.
  - **Command root:** `flex size-full flex-col overflow-hidden rounded-2xl bg-popover text-popover-foreground`. Remove `rounded-xl! p-1`.
  - **Input:** replace the InputGroup wrapper with `<div data-slot="command-input-wrapper" className="flex h-12 items-center gap-3 border-b border-border-subtle px-4">`, `SearchIcon className="size-4.5 text-muted-foreground"`, and input `h-full w-full bg-transparent text-base outline-hidden placeholder:text-faint-foreground sm:text-md` (16px below `sm`: the palette opens with focus in this input, and a smaller one makes iOS zoom).
  - **List:** `max-h-[min(60dvh,26rem)] scroll-py-2 overflow-y-auto overscroll-contain p-2`.
  - **Group:** `**:[[cmdk-group-heading]]:px-3 **:[[cmdk-group-heading]]:pt-3 **:[[cmdk-group-heading]]:pb-1 **:[[cmdk-group-heading]]:text-xs **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:text-muted-foreground`.
  - **Item** (cmdk writes `data-selected="true"|"false"`):
    ```
    group/command-item relative flex h-10 cursor-default items-center gap-3 rounded-lg px-3 text-sm outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-45 data-[selected=true]:bg-subtle data-[selected=true]:before:absolute data-[selected=true]:before:inset-y-2.5 data-[selected=true]:before:left-0 data-[selected=true]:before:w-0.5 data-[selected=true]:before:rounded-full data-[selected=true]:before:bg-primary pointer-coarse:h-11 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground
    ```
  - **Shortcut:** `<Kbd className="ml-auto">`. **Empty:** `py-8 text-center text-sm text-muted-foreground`.
  - **New `CommandFooter`:** `flex h-10 items-center gap-4 border-t border-border-subtle px-4 text-2xs text-muted-foreground`.
- **Toaster** (`ui/sonner.tsx`). Sonner's CSS is unlayered, so every override needs `!`. It renders inside `#root` (unchanged from before the overhaul), which is why `#root` must not become a stacking context (§2): toasts have to stay above dialogs and sheets.
  - **Style:** `{ "--normal-bg": "var(--popover)", "--normal-text": "var(--foreground)", "--normal-border": "transparent", "--border-radius": "12px", "--width": "380px" }`.
  - **`classNames`:**

    | Key | Classes |
    |---|---|
    | `toast` | `ring-1! ring-edge! shadow-lg! gap-3! p-4! text-sm! font-sans!` |
    | `title` | `font-medium!` |
    | `description` | `text-xs! text-muted-foreground!` |
    | `actionButton` | `h-8! rounded-lg! bg-foreground! px-3! text-xs! font-medium! text-background!` |
    | `cancelButton` | `h-8! rounded-lg! bg-muted! text-foreground!` |
    | `closeButton` | `border-edge! bg-popover! text-muted-foreground!` |

  - Delete the dead `cn-toast` class.
  - **Icons:** size-4, in `text-success`, `text-info`, `text-warning` and `text-destructive`; the loader in `text-muted-foreground`.
  - **Undo toasts pass `duration: 10_000`.** The Undo toast sites are:
    - `src/lib/mutations.ts:84` (F1)
    - `week-planner.tsx:107` (S2)
    - `priorities.tsx:208`, if it carries an action (S1)

#### Tabs (`ui/tabs.tsx`, F3)

There is one style: an underline with a sliding ink bar. `variant` is still accepted, and `"default"` and `"line"` render the same.

- **Root:** unchanged.
- **List:**
  ```
  group/tabs-list relative flex h-10 w-full items-center gap-1 overflow-x-auto no-scrollbar scroll-fade-x border-b border-border-subtle
  ```
  Render `<TabsPrimitive.Indicator className="absolute bottom-0 left-0 h-0.5 w-(--active-tab-width) translate-x-(--active-tab-left) rounded-full bg-foreground transition-[translate,width] duration-180 ease-in-out data-[activation-direction=none]:transition-none motion-reduce:transition-none forced-color-adjust-none forced-colors:bg-[Highlight]" />` as the last child. Under reduced motion the bar jumps instead of sliding; in forced colours it keeps a system colour, because the selected tab's other cue (ink) flattens there.
- **Trigger:**
  ```
  relative inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors duration-120 hover:text-foreground data-active:text-foreground focus-ring-inset disabled:pointer-events-none disabled:opacity-45 pointer-coarse:h-11 [&_svg:not([class*='size-'])]:size-4
  ```
  The selected tab has two cues (ink text plus bar) and no weight change, so nothing shifts. Counts inside a trigger are `CountBadge`.
- **Panel:** `pt-6 text-sm transition-opacity duration-120 ease-out data-starting-style:opacity-0`.
  - Enter fade only; no exit animation, and no `keepMounted`, because autosave editors must unmount.
  - Remove the ten `className="pt-4"` overrides (screen owners).

#### Card (`ui/card.tsx`, F3; adopt everywhere)

- **Card** props add `variant?: "default" | "interactive" | "flush"`. `size` stays.
  - Base:
    ```
    group/card relative flex flex-col gap-4 rounded-xl bg-card p-5 text-sm text-card-foreground shadow-sm ring-1 ring-edge data-[size=sm]:gap-3 data-[size=sm]:p-4 max-sm:p-4
    ```
  - `interactive`: `cursor-pointer transition-[box-shadow,translate,scale] duration-150 ease-out hover:shadow-md motion-safe:hover:-translate-y-px active:scale-(--motion-scale-press-lg)`.
  - `flush`: `gap-0 overflow-hidden p-0 max-sm:p-0 data-[size=sm]:p-0`. Use it for divided lists, settings groups and the paper editor.
- **CardHeader:** `flex items-start justify-between gap-3`.
- **CardTitle:** `text-base font-semibold text-foreground`. Use `render`/`as` for `h2`/`h3`.
- **CardDescription:** `text-xs text-muted-foreground`.
- **CardAction:** `ml-auto flex shrink-0 items-center gap-2`.
- **CardContent:** no padding.
- **CardFooter:** `-mx-5 -mb-5 mt-1 flex items-center gap-2 border-t border-border-subtle px-5 py-3 max-sm:-mx-4 max-sm:-mb-4 max-sm:px-4`.

#### Skeleton and Empty (F3)

- **Skeleton:** `rounded-lg bg-muted animate-skeleton`. It fades in after 200ms, then pulses, and is static under reduced motion. **Never** use shadcn `shimmer` on a block (it is a text effect and renders invisible).
- **Empty** (`ui/empty.tsx`): remove `border-dashed`. Restyle it to match EmptyState (§6.2). Screens use `EmptyState`.

#### Item, ScrollArea, Collapsible, Chart (F3)

- **Item, ScrollArea, Collapsible:** align to tokens only (radius, `ring-edge`, focus). They are not adopted.
  - Collapsible panel, if ever used: `h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-180 ease-in-out data-starting-style:h-0 data-ending-style:h-0`.
- **`ui/chart.tsx`:** dead code (recharts is imported nowhere else). Do not edit it.

#### Sidebar (`ui/sidebar.tsx`, F1)

- **Dimensions:** `SIDEBAR_WIDTH = "15rem"` (mobile `18rem`, icon `3rem`).
- **Container:** `bg-sidebar border-r border-border-subtle`.
- **Collapsed state:** read the existing `sidebar_state` cookie into `defaultOpen` (it is written today but never read). Keep Ctrl/⌘+B.
- **SidebarInset:** `bg-background`.
- **SidebarGroupLabel:** `h-7 px-2.5 text-xs font-medium text-muted-foreground`. No opacity.
- **SidebarMenuButton `default`:**
  ```
  h-8 gap-2.5 rounded-lg px-2.5 text-sm font-medium text-sidebar-foreground transition-[background-color,color,box-shadow] duration-120 hover:bg-subtle hover:text-foreground [&>svg]:size-4 [&>svg]:text-muted-foreground data-active:bg-card data-active:hover:bg-card data-active:text-foreground data-active:shadow-xs data-active:ring-1 data-active:ring-edge data-active:[&>svg]:text-primary-ink pointer-coarse:h-11
  ```
  The active page is the sheet on top of the pile.
- **`outline` variant:** `bg-card shadow-xs ring-1 ring-edge hover:shadow-sm`. This fixes the broken `hsl(var(--sidebar-*))` shadow.
- **SidebarMenuBadge:** the CountBadge recipe (§6.2). It keeps its sibling position and its `peer-data-[size]` rules.
- **Separator:** `bg-border-subtle`.

### 6.2 Shared app components

- **Existing files:** `page.tsx`, `badges.tsx`, `segmented.tsx`, `pickers.tsx`, `language-hint.tsx`.
- **New files** are listed with their owner. Import paths are `@/components/<file>`.
- Every component accepts `className` and spreads unknown props onto its root. Components that can be droppable or draggable also accept `ref` (React 19).

#### `page.tsx` (F4)

- **`Page`**
  - Props: `{ width?: "narrow" | "medium" | "default" | "wide" | "full" }`.
  - Classes: `mx-auto w-full px-4 pt-6 pb-24 sm:px-6 sm:pt-8 lg:px-10`.
  - Widths: `narrow` = `max-w-3xl`, `medium` = `max-w-4xl` (new), `default` = `max-w-6xl`, `wide` = `max-w-8xl` (1360px; replaces `max-w-[1500px]`), `full` = `max-w-none`.
- **`PageHeader`**
  - Props: `{ title; description?; eyebrow?; habit?: 1 | 2 | 3; actions?; size?: "default" | "hero"; className? }`.
  - Wrapper: `mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4`. Inner: `min-w-0`.
  - Eyebrow: `<p className="flex flex-wrap items-center gap-x-1.5 text-xs font-medium text-muted-foreground">`.
    - With `habit`, it prepends `<span aria-hidden className="font-serif text-sm leading-none text-faint-foreground tabular-nums">{habit}</span><span className="sr-only">Habit {habit}: </span><span aria-hidden className="text-faint-foreground">·</span>`.
    - The eyebrow text is the habit name ("Put first things first").
    - `eyebrow` may be any ReactNode (Today puts its date nav there).
  - h1: `mt-1 voice-display text-2xl text-foreground sm:text-3xl`. With `hero`: `text-3xl sm:text-4xl`.
  - Description: `mt-2 max-w-[60ch] text-md text-muted-foreground`.
  - Actions: `flex flex-wrap items-center gap-2`. At most one `default` button.
- **`StepHeader`** (plan steps)
  - Props: `{ title; lede?; actions? }`.
  - `<header className="mb-8">`, h2 `voice-display text-3xl sm:text-4xl`, lede `mt-2 max-w-[60ch] text-md text-muted-foreground`.
- **`SectionHeader`** (replaces the unused `SectionTitle`; delete that)
  - Props: `{ title; count?; icon?; description?; action?; as?: "h2" | "h3"; size?: "default" | "sm"; className? }`.
  - Wrapper: `mb-3 flex min-h-8 items-center gap-2`.
  - Icon: `[&_svg]:size-4 text-muted-foreground`.
  - Title: `text-base font-semibold text-foreground`. `size="sm"`: `text-sm font-semibold text-foreground` (a sub-section inside a card, e.g. Roles' "Long-term goals").
  - Count: `text-xs font-normal text-muted-foreground tabular-nums`.
  - Description: under the title, `text-xs text-muted-foreground`.
  - Action: `ml-auto`, usually ghost `sm`.
- **`GroupLabel`** (a group inside a card or list)
  - Props: `{ label; hint?; count?; action?; as?: "h3" | "h4" | "div" }`.
  - Classes: `flex items-baseline gap-2 pt-5 pb-1.5 text-xs font-semibold text-foreground first:pt-0`.
  - Hint: `font-normal text-muted-foreground`. Count: `ml-auto font-normal text-muted-foreground tabular-nums`.
- **`PrincipleNote`** (same name and props; restyled as a marginal note with no box and no dashes)
  - Root: `relative flex max-w-[60ch] gap-2.5 pl-4 before:absolute before:inset-y-1 before:left-0 before:w-0.5 before:rounded-full before:bg-border-strong`.
  - Icon: `mt-1 shrink-0 text-faint-foreground [&_svg]:size-4`.
  - Body: `voice-sm italic text-muted-foreground`.
- **`WithRail`**
  - Props: `{ rail: ReactNode; children; className? }`.
  - Classes: `grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] xl:gap-12`.
  - The rail is an `<aside className="min-w-0 space-y-5 [&>*+*]:border-t [&>*+*]:border-border-subtle [&>*+*]:pt-5">`.
  - Every rail is 18rem (retire 20rem and 22rem).
- **`RailSection`**
  - Props: `{ title; icon?; action?; children }`.
  - Heading: `mb-2 flex items-center gap-2 text-sm font-semibold` (icon `size-4 text-muted-foreground`). Body: `text-sm`.

#### `badges.tsx` (F4)

- **`QUADRANT_CLASSES`:** same export, same keys (`bg`, `border`, `solid`, `ring`), same literal values. 16 consumers depend on it.
- **`QuadrantDot`:** `inline-block size-2 shrink-0 rounded-full ring-1 ring-dot-ring` plus `bg-q{n}`.
- **`RoleDot`:** `inline-block size-2 shrink-0 rounded-full ring-1 ring-dot-ring`, with the inline background colour. With no colour: `bg-border-strong`.
- **`RoleBadge`:** `Chip tone="neutral"` plus RoleDot plus a truncated name (`max-w-44`). `muted`: `bg-transparent px-0 text-muted-foreground`.
- **`QuadrantBadge`:** keep the props (`q`, `withLabel`, `size: "xs" | "sm"`).
  - Chip geometry: `xs` is Chip `sm`; `sm` is Chip `default`.
  - Classes: `bg-q{n}/12` (Q3 `bg-q3/16`) `text-foreground`, plus QuadrantDot, plus visible `Q{numeral}` (`aria-hidden`), plus `<span className="sr-only">Quadrant {numeral}: {label}</span>`, plus the verb when `withLabel` (`font-normal`).
  - The Tooltip stays for mouse users. The trigger is **not** focusable (no tab stop per row), because the sr-only text carries the meaning.
  - Untriaged: `h-6 gap-1.5 rounded-full px-2 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-border-strong` with a hollow dot `size-2 rounded-full ring-1 ring-inset ring-control`. Keep the text "Untriaged". No dashes.

#### `chip.tsx` (new, F4)

- **`Chip`**
  - Props: `{ tone?: "neutral" | "outline" | "primary" | "success" | "warning" | "info" | "danger"; size?: "sm" | "default"; icon?: ReactNode } & ComponentProps<"span">`.
  - Base: `inline-flex max-w-full min-w-0 shrink-0 items-center gap-1.5 rounded-full font-medium whitespace-nowrap [&>svg]:shrink-0`.
  - Sizes: `default` = `h-6 px-2.5 text-xs [&>svg]:size-3.5`; `sm` = `h-5 px-2 text-2xs [&>svg]:size-3`.

  | Tone | Classes |
  |---|---|
  | `neutral` | `bg-muted text-foreground` |
  | `outline` | `ring-1 ring-inset ring-border-strong text-muted-foreground` |
  | `primary` | `bg-primary-soft text-primary-soft-foreground` |
  | `success` | `bg-success-soft text-success` |
  | `warning` | `bg-warning-soft text-warning` |
  | `info` | `bg-info-soft text-info` |
  | `danger` | `bg-destructive-soft text-destructive` |

  Every status chip carries an icon and a word, never colour alone.
- **`CountBadge`**
  - Props: `{ count: number; attention?: boolean }`.
  - Classes: `inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-2xs font-semibold text-muted-foreground tabular-nums`.
  - `attention`: `bg-primary-soft text-primary-soft-foreground`.
- **`ChoiceChip`** (a `button type="button"` with `aria-pressed`)
  - Props: `{ pressed: boolean; selection?: "single" | "multi"; icon?; disabled?; onClick } & button props`.
  - Base:
    ```
    inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-sm font-medium text-muted-foreground shadow-xs transition-[background-color,color,border-color,box-shadow,scale] duration-120 ease-out hover:border-border-strong hover:text-foreground active:scale-(--motion-scale-press) disabled:pointer-events-none disabled:opacity-45 pointer-coarse:h-10 dark:bg-muted [&_svg]:size-3.5
    ```
  - `single` (one-of-many filter rows: Journal filters): `aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background aria-pressed:shadow-none`.
  - `multi` (default: toggles, Q3 options, if-then picks): `aria-pressed:border-foreground/40 aria-pressed:bg-selected aria-pressed:text-foreground`. It renders a leading `Check` when pressed.
  - A group of ChoiceChips sits in a `role="group"` with an `aria-label`.
- **`AddChip`** (suggestions; not a toggle): ChoiceChip base plus a leading `Plus`, with no `aria-pressed`.

#### `done-check.tsx` (new, F4)

One completion control replaces the four hand-rolled checks and the task-sheet Checkbox.

- **Props:** `{ done: boolean; onToggle: (e: React.MouseEvent) => void; color?: string | null; size?: "sm" | "default" | "lg"; celebrate?: boolean } & Omit<ComponentProps<"button">, "onClick" | "children" | "color">`.
- **Markup:** `<button type="button" data-slot="done-check" data-done={shown || undefined} data-just-done={justDone || undefined} style={{ "--role": color ?? undefined }}>` containing `<svg viewBox="0 0 24 24" fill="none" aria-hidden>` and a path.
- **Optimistic visual state** (local; the cache is never touched):
  ```
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const [justDone, setJustDone] = useState(false);
  useEffect(() => setOptimistic(null), [done]);
  useEffect(() => { if (optimistic === null) return; const t = setTimeout(() => setOptimistic(null), 4000); return () => clearTimeout(t); }, [optimistic]);
  const shown = optimistic ?? done;
  onClick = (e) => { const next = !shown; setOptimistic(next); setJustDone(next); onToggle(e); };
  onAnimationEnd = () => setJustDone(false);
  useEffect(() => { if (!justDone) return; const t = setTimeout(() => setJustDone(false), 600); return () => clearTimeout(t); }, [justDone]);
  ```
  The timeout is the fallback for reduced motion, where the animation is removed and `onAnimationEnd` never fires.
  - The check responds in under 100ms instead of after the refetch.
  - If the mutation fails, the error toast shows and the check reverts within 4s.
  - `data-just-done` is set only by a click, so rows loaded as done never animate.
- **`aria-label`:** passed by the caller, keeping each site's existing label ("Mark as done" / "Mark as not done"). The default is the same pair. Callers also pass `data-no-drag`, `onPointerDown` and so on through the rest props.
- **Base:**
  ```
  role-scope group/check relative grid shrink-0 place-items-center rounded-full border-(--role-ink) bg-field text-(--role-on) transition-[background-color,border-color,scale] duration-120 ease-out hover:not-data-[done]:bg-(--role-wash) active:scale-90 motion-reduce:active:scale-100 disabled:pointer-events-none disabled:opacity-45 after:absolute data-[done]:bg-(--role-ink) data-[just-done]:animate-check-pop
  ```
  - `celebrate` (Quadrant II big rock) swaps the animation for `data-[just-done]:animate-check-bloom`.
- **Sizes:**

  | Size | Classes | Use |
  |---|---|---|
  | `sm` | `size-4 border-[1.5px] after:-inset-1 pointer-coarse:after:-inset-3.5 [&>svg]:size-3` | week lane chips, grid blocks, tray |
  | `default` | `size-5 border-[1.5px] after:-inset-1.5 pointer-coarse:after:-inset-3 [&>svg]:size-3.5` | rows |
  | `lg` | `size-6 border-2 after:-inset-2 pointer-coarse:after:-inset-2.5 [&>svg]:size-4` | task-sheet header |

- **Path:** `<path d="M5 12.5l4.5 4.5L19 7.5" pathLength={1} className="stroke-current [stroke-width:3] [stroke-linecap:round] [stroke-linejoin:round] [stroke-dasharray:1] [stroke-dashoffset:1] transition-[stroke-dashoffset] duration-120 ease-out group-data-[done]/check:[stroke-dashoffset:0] group-data-[done]/check:duration-180 group-data-[just-done]/check:delay-40" />`.
- The row that owns the title sets `data-done` too (for `strike`).

#### `row.tsx` (new, F4)

- **`Row`**
  - Props: `{ as?: "li" | "div" | "button"; divided?: boolean; selected?: boolean; done?: boolean } & rest` (`ref` supported). It renders `data-done={done || undefined}`.
  - Base: `group/row relative flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 transition-colors duration-120 hover:bg-subtle has-focus-visible:bg-subtle pointer-coarse:min-h-12`.
  - `divided`: `before:pointer-events-none before:absolute before:top-0 before:right-3 before:left-11 before:h-px before:bg-border-subtle first:before:hidden hover:before:opacity-0 [&:hover+*]:before:opacity-0`. The divider starts at the text column.
  - `selected`: `bg-selected hover:bg-selected has-focus-visible:bg-selected after:absolute after:inset-y-2 after:left-0 after:w-0.5 after:rounded-full after:bg-primary` (the plate repeats under hover and focus, or the base plates would replace it).
  - A two-line row uses `items-start` plus `min-h-13`.
  - `as="button"` (clickable rows such as GoalList and Versions) adds `w-full cursor-pointer text-left focus-ring-inset`, plus `type="button"`.
- **`RowTitle`**
  - Props: `{ as?: "span" | "button"; children }`.
  - Wrapper: `min-w-0 flex-1 truncate text-left text-sm text-foreground`.
  - The text itself goes in `<span className="strike">`. `strike` must sit on an **inline span**, never on the truncating or clamping block.
  - As a button, add `cursor-pointer rounded-xs focus-ring-inset`.
- **`RowMeta`** (`as?: "div" | "span"`; use `span` inside a button): `mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground tabular-nums [&_svg]:size-3.5 [&_svg]:shrink-0`.
  - Show only properties that have a value.
  - A past **due date** shows as `text-warning` with `CalendarClock` and reads "was due …" (§9.6; the same words on Today, Tasks, Matrix, the task sheet and Insights). A due date that isn't past reads "due …".
  - `scheduledDate` is always plain muted, never late.
- **`MetaSep`:** `<span aria-hidden className="text-faint-foreground">·</span>`.
- **`MetaSlot`** (right-aligned columns at `sm+`)
  - Props: `{ slot: "day" | "due" | "estimate" }`.
  - Classes: `hidden shrink-0 text-right text-xs text-muted-foreground tabular-nums sm:block`, plus `w-14` / `w-20` / `w-10`.
- **`RowActions`:** `flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-120 group-hover/row:opacity-100 group-focus-within/row:opacity-100 pointer-coarse:opacity-100`.
  - It reveals on hover **and** keyboard focus, and is always visible on touch.
  - It uses the **named** group, so hovering a whole card never reveals every row's actions.
  - On coarse pointers, rows with more than two actions show one `icon-sm` `⋯` DropdownMenu instead.

#### `surface.tsx` (new, F4)

- **`Well`**
  - Props: `{ as?: "div" | "section" | "aside" } & rest` (`ref` supported, so the week tray keeps its droppable `ref`).
  - Classes: `min-w-0 rounded-xl bg-inset p-2`.
- **`BoardColumn`**
  - Props: `{ title; icon?; dot?; bar?: 1 | 2 | 3 | 4; label?; count?; lit?: boolean; drop?: "idle" | "available" | "over"; overTone?: "primary" | "danger"; empty?: ReactNode; footer?; children } & section props` (`ref` for `useDroppable`).
  - Root: `relative flex min-h-60 min-w-0 flex-col rounded-xl bg-inset p-2 transition-[background-color,outline-color] duration-180 ease-out`.
  - `bar`: `before:absolute before:inset-x-3 before:top-0 before:h-0.75 before:rounded-b-full before:bg-q{n}`.
  - `lit` (Q2 only): `bg-[color-mix(in_oklab,var(--q2)_12%,var(--inset))]`.
  - Header: `flex items-center gap-2 px-2 pt-2 pb-2`. Title `text-sm font-semibold`; label `text-xs text-muted-foreground`; count `ml-auto text-xs text-muted-foreground tabular-nums`.
  - Body: `flex flex-1 flex-col gap-1.5`.
  - Empty: `px-2 py-3 text-sm text-muted-foreground`.
  - No coloured borders around columns.
- **`dropZone(state, tone?)`**: a class helper used by BoardColumn, the priority groups, the week lane and the tray.
  - `idle`: nothing.
  - `available` (a compatible drag is active anywhere; read it with `useDragOperation()` from `@dnd-kit/react`): `outline-1 outline-dashed outline-border-strong -outline-offset-1`.
  - `over`: `outline-2 outline-solid outline-primary -outline-offset-2` plus an 8% primary tint drawn as a `background-image` layer, so the target keeps its own surface (a well stays a well).
  - `over` with danger: `outline-2 outline-solid outline-destructive -outline-offset-2` plus a 10% `--destructive-solid` tint, also as a `background-image` layer.
- **`boardCard`** (class constant): `rounded-lg bg-card px-3 py-2.5 text-sm shadow-xs ring-1 ring-edge transition-shadow duration-120 hover:shadow-sm`.
  - Draggable cards add `cursor-grab active:cursor-grabbing`.
- **`dragSource`** (class constant) for the element left in place during an overlay-mode drag (Matrix, Week): `animate-none opacity-40 outline-1 outline-dashed outline-border-strong -outline-offset-1 shadow-none`.
  - `animate-none` sits in the utilities layer, so it beats the global base-layer lift if dnd-kit also marks the source.
- **`Callout`**
  - Props: `{ tone?: "primary" | "neutral" | "warning" | "info" | "danger"; icon?; title?; action?; children }`.
  - Root: `flex flex-wrap items-start gap-3 rounded-xl px-4 py-3 text-sm`.

  | Tone | Classes |
  |---|---|
  | `primary` | `bg-primary-soft text-primary-soft-foreground` |
  | `neutral` | `bg-muted text-foreground` |
  | `warning` | `bg-warning-soft text-foreground [&>svg]:text-warning` |
  | `info` | `bg-info-soft text-foreground [&>svg]:text-info` |
  | `danger` | `bg-destructive-soft text-foreground [&>svg]:text-destructive` |

  - Icon: `mt-0.5 size-4 shrink-0`. Title: `font-medium`. Body: the tone's ink (never `text-muted-foreground` on a tint). Action: `ml-auto self-center`.
  - **At most one Callout per page.**

#### `meter.tsx` (new, F4)

- **`Meter`**
  - Props: `{ value: number /* 0..1 */; target?: number; tone?: "primary" | "warning" | "q2"; size?: "sm" | "default"; label: string }`.
  - Root: `relative` with `role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={round(value*100)} aria-label={label}`.
  - Track: `h-1.5 overflow-hidden rounded-full bg-muted` (`sm` is `h-1`).
  - Fill: `h-full w-full rounded-full bg-primary transition-[translate] duration-320 ease-out`, with ``style={{ translate: `${(clamp(value) - 1) * 100}% 0` }}``. Tones: `bg-warning`, `bg-q2`.
  - Target tick (a sibling of the track, so it isn't clipped): `pointer-events-none absolute -top-0.5 h-2.5 w-px bg-foreground`, with `left: target%`.
  - Over capacity is `tone="warning"`, **never** red.
- **`MeterSegments`**
  - Props: `{ total; filled; tone?: "q2" | "primary"; label }`.
  - Root: `flex gap-1`. Segments: `h-1.5 flex-1 rounded-full`, filled `bg-q2` (Sharpen the saw is Quadrant II work: one colour everywhere) or `bg-primary`, empty `bg-muted`.
- **`MeterRing`**
  - Props: `{ value; size?: number (200); stroke?: number (3); label; valueText?: string; children }`.
  - Track `stroke-(--border-subtle)`; arc `stroke-primary [stroke-linecap:round]` using `pathLength=1`/dasharray, with `transition-[stroke-dashoffset] duration-320 ease-out`. Children are centred.
  - `role="meter"`, the `aria-value*` attributes and `aria-label` sit on the ring's `<svg>`, **not** on the wrapper: a meter's children are presentational, so the centre content (the Focus timer) must stay outside it. `valueText` maps to `aria-valuetext` ("12 minutes left").

#### `stat.tsx` (new, F4)

- **`StatStrip`** (preferred when three or more stats sit together: one container, not four)
  - Props: `{ cols?: 3 | 4; children }`.
  - Classes: `grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-border-subtle shadow-sm ring-1 ring-edge max-sm:[&>:last-child:nth-child(odd)]:col-span-2`, plus `sm:grid-cols-3` or `sm:grid-cols-4`.
- **`StatCell`**
  - Props: `{ label; value; unit?; hint?; info?: ReactNode; tone?: "default" | "warning"; standalone?: boolean; children? }`.
  - Cell: `min-w-0 bg-card px-4 py-3.5`. `standalone`: `rounded-xl shadow-sm ring-1 ring-edge`.
  - Label: `flex items-center gap-1.5 text-xs font-medium text-muted-foreground`.
  - `info`: wrap the label in `<button type="button">` with `Info size-3.5`, as a Tooltip trigger. This makes the tooltip keyboard-reachable. Base UI tooltips set no ARIA, so the button also carries `aria-describedby` pointing at a `hidden` copy of `info`.
  - Value: `mt-1 text-2xl font-semibold text-foreground tabular-nums` (`warning` tone: `text-warning`). Unit: `ml-1 text-sm font-normal text-muted-foreground`.
  - Hint: `mt-0.5 text-xs text-muted-foreground`. Children (meter slot): `mt-2.5`.

#### `empty-state.tsx` (new, F4)

- **Props:** `{ icon?; title; description?; action?; size?: "default" | "compact" }`.
- **Default:** `flex flex-col items-center gap-3 px-6 py-12 text-center`.
  - Icon: `grid size-10 place-items-center rounded-full bg-muted text-muted-foreground [&_svg]:size-5`.
  - Title: `text-sm font-medium text-foreground`. Description: `max-w-sm text-sm text-muted-foreground`. Action: `mt-1`, one `outline sm` button.
- **Compact:** one `px-1 py-2 text-sm text-muted-foreground` line, with the action inline as `Button variant="link" size="inline"`.
- Never show empty-state copy while data is loading.

#### `quick-add.tsx` (new, F4)

- **Props:** `{ value; onValueChange; onSubmit: () => void; placeholder; "aria-label"; submitLabel?: string (default "Add"); pending?; disabled?; variant?: "field" | "inline"; autoFocus?; inputRef? }`.
- It renders a `<form>` that calls `preventDefault()` and then `onSubmit()`. Callers keep their own trim and validation logic.
- **`field`:**
  - Form: `group/qa flex h-10 items-center gap-2 rounded-lg bg-field pr-1 pl-3 shadow-xs ring-1 ring-edge transition-shadow duration-120 hover:ring-border-strong focus-within:ring-2 focus-within:ring-ring pointer-coarse:h-12`.
  - Contents: `Plus size-4 shrink-0 text-muted-foreground`; input `h-full min-w-0 flex-1 bg-transparent text-base outline-hidden placeholder:text-faint-foreground md:text-sm` (focus shown by the form); `<Kbd className="opacity-0 transition-opacity group-focus-within/qa:opacity-100 pointer-coarse:hidden">↵</Kbd>`; then `Button type="submit" size="sm" variant="ghost" disabled={!value.trim() || pending}` with `submitLabel`.
  - The visible submit is the single-pointer path.
- **`inline`** (the foot of wells and role groups): `flex h-9 items-center gap-2 rounded-lg px-2 text-sm text-muted-foreground transition-colors duration-120 hover:bg-subtle focus-within:bg-field focus-within:ring-2 focus-within:ring-ring pointer-coarse:h-11`. It has the same input, and shows the submit `icon-xs` button only when `value.trim()`.

#### Small shared components (F4, F2, F1)

- **`save-status.tsx`** (new, F4)
  - Props: `{ saving: boolean; label?: ReactNode }` (label shown when idle).
  - Markup: `<p aria-live="polite" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">`.
  - Dot: `size-1.5 rounded-full`, `bg-primary animate-breathe` while saving, otherwise `bg-border-strong`.
  - Text: "Saving…" or the label (default "Saved").
- **`event-block.tsx`** (new, F4): the shared calendar-block visuals for the Week grid (S2) and the Today timeline (S1).
  - `eventBlockVariants` (cva) base:
    ```
    role-scope relative overflow-hidden text-foreground before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:w-0.75 before:bg-(--role-ink)
    ```
  - `kind`:
    - `focus`: `bg-(--role-tint) ring-1 ring-inset ring-[color-mix(in_oklab,var(--role,var(--muted-foreground))_22%,transparent)]`
    - `appointment`: `bg-card shadow-xs ring-1 ring-inset ring-edge`
  - `layout`:
    - `grid` (absolute week blocks): `rounded-sm pr-1.5 pl-2.5`
    - `row` (Today timeline): `rounded-lg px-3 py-2.5 pl-3.5`
  - State data attributes on the root:
    - `data-done` (with `[--event-mix:7%] dark:[--event-mix:12%]` and a title `strike`)
    - `data-skipped`: `[background-image:repeating-linear-gradient(135deg,transparent_0_6px,var(--selected)_6px_7px)]` with a muted title and no strike
    - `data-past`: muted title and time, **never opacity**
    - `data-current`: `ring-2 ring-ring`
  - **`EventTitle`:** `font-medium text-foreground in-data-[past]:text-muted-foreground in-data-[skipped]:text-muted-foreground`.
  - **`EventTime`:** `text-muted-foreground tabular-nums`.
  - **`tierFor(minutes)`** returns `"xs"` (≤20 min), `"sm"` (≤40) or `"md"` (>40):

    | Tier | Content |
    |---|---|
    | `xs` | one line, title only, `text-2xs font-medium`, `py-0` |
    | `sm` | one line "Title · 9:30", `text-xs`, `py-0.5` |
    | `md` | title `text-xs font-medium line-clamp-2`, then time and duration (`09:00–10:30 · 1h 30m`) `text-2xs` on its own line, `py-1` |

  - Blocks of 20 minutes or less still show a title. Never a tooltip-only bar.
- **`motion.ts`** (new, F4): `useEnterOnce()` returns `(index: number) => ({ className?, style? })`.
  - Until 600ms after mount (a local `settled` state flipped by a `setTimeout` in `useEffect`), it returns `className: "animate-rise-in"` and ``style: { animationDelay: `calc(${Math.min(index, 8)} * var(--motion-stagger))` }``. After that it returns `{}`.
  - The class is guaranteed to be gone afterwards, so it never blocks the drag lift.
  - Refetches and filter changes never replay it.
- **`language-hint.tsx`** (F4)
  - Container: `grid grid-rows-[1fr] transition-[grid-template-rows,opacity] duration-240 ease-out starting:grid-rows-[0fr] starting:opacity-0`.
  - Inner: `min-h-0 overflow-hidden`, then `flex items-start gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-foreground`, with icon `MessageSquareQuote size-3.5 text-muted-foreground mt-0.5`.
  - Reframe chips: `rounded-full bg-card px-2 py-0.5 ring-1 ring-edge hover:ring-border-strong` (buttons keep their handlers). Chip buttons add `relative pointer-coarse:after:absolute pointer-coarse:after:inset-x-0 pointer-coarse:after:-inset-y-3` (44px touch target), and their row adds `pointer-coarse:gap-y-3`.
  - Add the dismiss control its docstring promises: `IconButton` X, `icon-xs`, label "Dismiss language hint". Local `dismissed` state resets when the matched phrase changes.
  - Dismissing from the keyboard returns focus before the note unmounts: to the optional `returnFocusRef` prop, else the nearest text field before the note (inside the dialog, if any).
  - Keep `role="note"`.
- **`icon-button.tsx`** (new, F2)
  - Props: `{ label: string; icon: ReactNode; shortcut?: string; tooltipSide?; variant?: ButtonVariant ("ghost"); size?: "icon-xs" | "icon-sm" | "icon" (default "icon-sm") } & ButtonProps`.
  - It renders `<Tooltip><TooltipTrigger render={<Button variant size aria-label={label} {...props} />}>{icon}</TooltipTrigger><TooltipContent side>{label}{shortcut && <Kbd>}</TooltipContent></Tooltip>`, forwarding `ref` and props.
  - When the icon button also opens a Popover or Menu, compose it: `<PopoverTrigger render={<IconButton label="…" icon={…} />} />`. This replaces every `title=` on icon buttons.
- **`segmented.tsx`** (F2). Keep `role="group"`, `aria-pressed`, `type="button"`, the nullable generic `T`, and `options[].className`, which now applies to the option button.
  - Props add `wrap?: boolean`, and unknown `div` props (`id`, `aria-labelledby`, `data-*`, …) spread onto the track. Every call site passes `aria-label` (17 are missing today) or `aria-labelledby` pointing at a visible label.
  - **Track:** `relative isolate inline-flex h-9 max-w-full items-center rounded-lg bg-inset p-0.5 ring-1 ring-inset ring-border-subtle dark:ring-edge pointer-coarse:h-11`. `sm`: `h-8`.
  - **Thumb:** one `<span aria-hidden>`, `pointer-events-none absolute inset-y-0.5 left-0 -z-10 w-(--seg-w) translate-x-(--seg-x) rounded-sm bg-card shadow-xs ring-1 ring-edge transition-[translate,width] duration-180 ease-in-out motion-reduce:transition-none dark:bg-popover` (it jumps under reduced motion).
    - `--seg-x`/`--seg-w` come from the pressed button's `offsetLeft`/`offsetWidth` (`useLayoutEffect` plus a `ResizeObserver` on the track).
    - Add `transition-none` until the first measurement lands.
    - The thumb is hidden when `value` is null. It is lighter than the track in both themes, which fixes the dark "pressed-in" bug.
  - **Option:** `relative h-8 min-w-8 rounded-sm px-3 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors duration-120 hover:text-foreground aria-pressed:font-semibold aria-pressed:text-foreground focus-ring-inset pointer-coarse:h-10`. `sm`: `h-7 px-2.5 text-xs`.
    - Each label renders inside `<span className="inline-grid *:col-start-1 *:row-start-1"><span aria-hidden className="invisible font-semibold">{label}</span><span>{label}</span></span>`, so the weight change never shifts width. That gives two selection cues: ink and weight.
  - **Before the first measure, or in `wrap` mode** (no thumb): pressed options get `bg-card shadow-xs ring-1 ring-edge dark:bg-popover`. `wrap` makes the track `h-auto flex-wrap` (Influence method).
- **`pickers.tsx`** (F2)
  - RoleSelect, GoalSelect and EstimateSelect pass through `size` and a new `variant` to SelectTrigger.
  - **DateField:**
    - The trigger is a `button` styled with `fieldShell` (Select heights, `CalendarDays size-4 text-muted-foreground`, value, placeholder in `text-faint-foreground`), with `pr-8` reserved.
    - The clear control is a **sibling** `IconButton` (`icon-xs`, label "Clear date") absolutely positioned at `right-1 top-1/2 -translate-y-1/2` inside a `relative inline-flex` wrapper. It stays rendered and becomes `invisible` when empty, so the row never jumps.
    - It supports `variant="ghost"`. The popover is `w-auto p-2`.
  - **Move `DaySelect` and `HourSelect` here** from `settings.tsx:165-199`, with identical props. S9 deletes the copies in `settings.tsx` and `welcome.tsx`.
- **`brand-mark.tsx`** (new, F1)
  - Props: `{ size?: "sm" | "md" | "lg"; withName?: boolean }`.
  - Tile: `grid place-items-center bg-primary text-primary-foreground shadow-xs inset-shadow-2xs` with lucide `Compass`.
  - Sizes: `sm` = `size-7 rounded-lg [&_svg]:size-4`; `md` = `size-8 rounded-lg [&_svg]:size-4.5`; `lg` = `size-10 rounded-xl [&_svg]:size-5`.
  - Name: `font-serif text-lg font-medium text-foreground` "Compass".
- **`src/lib/platform.ts`** (new, F1): `export const MOD_KEY = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl";`.

### 6.3 App shell (F1)

- **Sidebar content** (`app-sidebar.tsx`):
  - **Header:** `BrandMark size="sm" withName`. Drop the subtitle.
  - **Capture:** `SidebarMenuButton variant="outline"` (not className overrides), `h-9`, with `Plus` and `<Kbd className="ml-auto">N</Kbd>`. Replace the raw `<kbd>`.
  - **Plan your week** (when `planTarget`): a ritual row, not a second primary: `h-auto min-h-12 items-start rounded-lg bg-primary-soft px-2.5 py-2 text-primary-soft-foreground pointer-coarse:h-auto hover:bg-[color-mix(in_oklab,var(--primary-soft),var(--primary)_12%)] data-active:bg-[color-mix(in_oklab,var(--primary-soft),var(--primary)_12%)] data-active:hover:bg-[color-mix(in_oklab,var(--primary-soft),var(--primary)_12%)]`. `pointer-coarse:h-auto` beats the menu button's touch height so the two-line row isn't clipped; `data-active:hover:` overrides the menu button's active card plate.
    - Icon: `CalendarCheck`. Title: `text-sm font-medium`. Subline: `text-xs text-primary-ink` (replaces `text-[11px] opacity-80`).
  - **Group labels:** the habit **name** only (sentence case, muted). **No habit numerals in the sidebar.** The 3-2-1 order stays and isn't called out; numerals live in page eyebrows.
  - **Counts:** inbox is a plain `CountBadge`. Check-ins due use `CountBadge attention`.
  - **Footer:** a hairline above Settings, Theme and Account. Avatar: `size-6 rounded-full ring-1 ring-edge`.
- **Top bar** (`_app.tsx`):
  ```
  sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-transparent bg-background/80 px-3 backdrop-blur-md backdrop-saturate-150 transition-colors duration-180 data-[scrolled]:border-border-subtle sm:px-4 lg:px-6
  ```
  - It is translucent at **every** width. Remove the `md:` transparent override.
  - `data-scrolled` comes from an `IntersectionObserver` on a 1px sentinel `<div aria-hidden>` rendered just before the bar.
  - **Search:** `Button variant="outline" size="sm" className="w-56 justify-start text-muted-foreground"` with `Search`, "Search or jump to…" and `<Kbd className="ml-auto">{MOD_KEY} K</Kbd>`. Below `sm`, an `IconButton` "Search".
  - **Capture:** `Button variant="outline" size="sm"` with `Plus`, "Capture" and `<Kbd>N</Kbd>` (Kbd hidden below `md`).
  - **Chrome buttons are never teal.** The page owns its one primary.
- **Pending splash** (`_app.tsx` `pendingComponent`): `grid min-h-svh place-items-center` with `<Spinner />`. Unchanged.

---

## 7. Motion

### 7.1 Tokens

- **Durations** are numeric classes only, so `cn` merges them: `duration-80`, `100` (command palette only), `120`, `150`, `180`, `240`, `320`, `480`.
- **Easings** override the built-ins:
  - `ease-out` for entering and appearing (and the Base UI default)
  - `ease-in-out` for on-screen movement (indicator, thumb, meter)
  - `ease-in` for permanent exits
  - `ease-drawer` for the Sheet enter only

  Put easing on a state variant (`data-ending-style:ease-in`), and never pass two `ease-*` classes to one element through cva plus `className`.
- **Scalars:** `--motion-rise` (4px), `--motion-scale-in` (.96), `--motion-scale-press` (.97), `--motion-scale-press-lg` (.985), `--motion-scale-lift` (1.02), `--motion-stagger` (30ms). All are neutralised under reduced motion.
- **Animations:** `animate-check-pop`, `-check-bloom`, `-rise-in`, `-dnd-lift`, `-bloom`, `-skeleton`, `-breathe`, `-grow-y`, `-draw`. Every keyframe goes through an `--animate-*` token (Tailwind drops unreferenced keyframes).

### 7.2 Per interaction

| Interaction | Recipe |
|---|---|
| Hover (colour, plate) | 120ms `ease-out` on the listed properties. Tailwind `hover:` already skips touch |
| Press | `active:scale-(--motion-scale-press)` on buttons, chips and icon buttons; `--motion-scale-press-lg` on interactive cards. Rows don't scale; menu triggers are excluded (`not-aria-[haspopup]`) |
| Focus | Instant; the outline is not transitioned |
| Card hover depth | `hover:shadow-md motion-safe:hover:-translate-y-px`, 150ms; interactive cards only, never dense rows |
| Popover, menu, select | `popupMotion`: 180ms in, 120ms out, from `--transform-origin`, 4px from the anchor side |
| Tooltip | `tooltipMotion`: 120ms in, 80ms out; 0ms within a group (`data-instant`) |
| Dialog | 240ms in, 180ms out, scale .97 plus fade; scrim 240ms. Below `sm`: 16px rise |
| Sheet | 320ms `ease-drawer` in, 240ms `ease-in` out, translate plus fade |
| Command palette | 100ms opacity only |
| Tab indicator, segmented thumb | 180ms `ease-in-out` on `translate` and `width` |
| Tab panel | 120ms fade on enter only |
| List enter (first mount of a view) | `useEnterOnce()`: `animate-rise-in` with a 30ms stagger capped at 8. Never on refetch or filter change |
| Task completion | t0: press and fill (120ms). t40: tick draws (180ms). t0–240: `check-pop`. t80–320: the title `strike` sweeps and turns muted. Un-checking reverses in 120ms with no pop |
| Rare moments (a Quadrant II big rock done) | One bloom (a Q2-green ring fading over 480ms, `animate-check-bloom` on the DoneCheck). Never on routine tasks, and never at the cost of delaying navigation (so not on commit or review save, which navigate away). No confetti |
| Kept promises (weekly review) | The "kept" rows enter once with `useEnterOnce()` and a `CircleCheck` in `text-success` |
| Drag lift | The global `[data-dnd-dragging]` rule (`dnd-lift` keyframe: scale 1.02 plus `--elev-drag`, 120ms). dnd-kit locks `transition` and `translate` with `!important`, so the lift must be a keyframe, and it may override scale when target sizes differ (the shadow still lifts) |
| Drag source, overlay boards (Matrix, Week) | The card left in place: `opacity-40` plus a dashed `outline-border-strong`. The preview is fully opaque with `animate-dnd-lift`; no rotation |
| Drag source, sortable list (Today priorities) | The origin slot shows as a dashed ghost (global placeholder rule). Remove `opacity-50 shadow-lg` from the dragged item |
| Drop | `DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }}` (Matrix, Week). Verify the preview lands in the right place; if not, revert to `null`. Sortable reorder keeps dnd-kit's own curve |
| Drop target | `dropZone()` states, 180ms background and outline |
| Meters | 320ms `ease-out` translate, on value change only |
| Charts | Bars `animate-grow-y` (`transform-box: fill-box; transform-origin: bottom`) with a 12ms stagger capped at 12. Lines `animate-draw` (`pathLength=1`, `stroke-dasharray:1`). First mount only |
| Skeleton | `animate-skeleton`: invisible for 200ms, then fades in and pulses |
| Save status | The teal dot `animate-breathe` while saving |
| Route change | Root cross-fade: 120ms out, 180ms in (§7.4) |
| Toast | Sonner defaults (it already respects reduced motion) |
| Focus mode enter | `animate-in fade-in-0 zoom-in-98 duration-240` |
| Welcome steps | Each step wrapper `animate-rise-in` (steps remount per step) |

### 7.3 Reduced motion

The `@media (prefers-reduced-motion: reduce)` block in §2 already:
- zeroes rise, scale and stagger
- neutralises tw-animate transforms and Base UI starting/ending scale
- caps 240/320/480ms transitions at 150ms
- removes the check pop, bloom, skeleton pulse, breathe, chart grow and draw, and list rise
- keeps the drag shadow without the animation
- disables view transitions

Components add only the resets that cannot be tokenised:
- `motion-reduce:data-starting-style:translate-*-0` on Sheet and on the mobile Dialog, as specified in §6.1.
- `motion-reduce:transition-none` on the Tabs indicator and the Segmented thumb: they jump to the new option, and the ink and weight cues still mark it.
- `motion-reduce:active:scale-100` on DoneCheck, whose press scale is a literal (`scale-90`), not a `--motion-scale-*` token.

What stays: fades, colour changes, the check fill, the strike, and spinners.

### 7.4 Route transitions (verified in TanStack router-core)

In `src/main.tsx` (F1): `createRouter({ …, defaultViewTransition: { types: ({ pathChanged }) => (pathChanged && document.visibilityState === "visible" ? ["nav"] : false) } })`.

- A hidden document skips the transition: Chrome aborts view transitions in a hidden tab (a navigation after a mutation or Auth0 redirect while the user is elsewhere), and the rejection would go unhandled. Returning `false` makes the router run the update directly.

- Only the root cross-fades. There are no named groups, so the sticky blurred top bar never paints under a group.
- `::view-transition { pointer-events: none }` stops the overlay swallowing clicks.
- **Known limit:** Firefox ignores `types`, so search-param-only navigations (URL tabs) also cross-fade there. This is acceptable.

### 7.5 Never

- `transition-all`
- animating `width`, `height`, `top` or `left` (except Base UI's measured variables and the LanguageHint `grid-template-rows`)
- `ease-in` on entry
- scaling from 0
- `blur-in`
- animation on refetch or filter change
- `shimmer`
- motion on high-frequency keyboard actions

### 7.6 Accessibility fixes in scope

These are approved small behaviour changes; nothing else changes behaviour:
- undo toasts at 10s
- the Focus-mode focus trap (§10 Focus mode)
- `aria-label`s and Tooltips replacing `title=`
- keyboard-reachable stat tooltips
- the LanguageHint dismiss control
- `htmlFor` on labels

---

## 8. Layout and responsive rules

- **Widths:**

  | Width | Class | Used by |
  |---|---|---|
  | `narrow` | `max-w-3xl` | Journal, Settings |
  | `medium` | `max-w-4xl` | Tasks |
  | `default` | `max-w-6xl` | Matrix, Roles, Influence, Stewardships |
  | `wide` | `max-w-8xl` | Today, Compass, Insights |
  | `full` | no maximum | Week |

  Plan step content uses `max-w-3xl` (schedule step `max-w-8xl`). Welcome uses `max-w-2xl`.
- **Gutters:** `px-4 sm:px-6 lg:px-10`. Page top `pt-6 sm:pt-8`, bottom `pb-24`.
- **Grid rule:** every multi-column grid starts at `grid-cols-1` and uses `minmax(0, …)` tracks. Every truncating flex or grid child gets `min-w-0`. Known offenders, fixed by their owners:
  - `today.tsx:123`: the 375px overflow, which becomes `grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]` with `min-w-0` columns
  - `today.tsx:76`
  - `matrix.tsx:77`, `matrix.tsx:79`
  - `capture-dialog.tsx:296`
  - `influence.tsx:528`
  - `time-audit.tsx:325`
  - `stewardships.tsx:235`
- **Breakpoints:** Tailwind defaults. The sidebar becomes a sheet below `md` (768), matching `useIsMobile`.
- **320–375px:**
  - No horizontal page scroll anywhere. The only exceptions are inside the week grid, the Insights heatmap and tab rows; each scrolls in its own container, and tab rows use `scroll-fade-x`.
  - Toolbars wrap. Dialogs become bottom-anchored cards. The task sheet is full-screen.
  - Inputs are 16px.
  - Sticky bars pad with `pb-[max(0.75rem,env(safe-area-inset-bottom))]`.
- **Touch:** every target is 44px under `pointer-coarse:`.
  - Controls grow with `pointer-coarse:h-11` / `size-11`.
  - Small glyphs keep their size and get `after:` hit areas.
  - Row actions are always visible.
  - Drag handles are always visible.
- **Sticky stack (z-index):**

  | Layer | Position | z-index |
  |---|---|---|
  | Top bar | `top-0` | `z-30` |
  | Plan header | `top-12` | `z-20` |
  | Tasks group headers, Journal month headings | `top-12` | `z-10` |
  | Overlays | portals | `z-50` |

  - `html` sets `scroll-padding-top: 7rem` and `scroll-padding-bottom: 5rem`, so focused rows never hide under these bars (WCAG 2.4.11).
  - The Week grid card is `isolate`, so its internal header (`z-20`), gutter (`z-10`) and corner (`z-30`) never fight the top bar.

---

## 9. Accessibility checklist (thresholds)

Every screen PR is checked against this list, in light and dark.

1. **Text contrast:** ≥4.5:1 for all text, including placeholder, meta and tooltip text; ≥3:1 only for text ≥24px (or ≥18.66px bold).
   - Faint text is never on `bg-selected` and never on tinted fills (quadrant, role or status tints).
   - No opacity modifiers on text.
2. **Non-text contrast:** ≥3:1 for:
   - field borders (`--input`) and control boundaries (`--control`)
   - focus (`--ring`, a 2px outline)
   - role check rings (`--role-ink`) and the tick on a checked role fill
   - meaningful chart marks, or else they carry a direct label or table twin

   Quadrant dots below 3:1 always carry `ring-dot-ring` plus a "Q{n}" label or position.
3. **Focus:**
   - Always visible (2px solid, offset 2 on filled controls, so the ring sits on the page and not on teal).
   - Never hidden by sticky bars (scroll padding).
   - Forced-colors safe: it is a real outline.
   - One mechanism: the global `:focus-visible`.
4. **Targets:**
   - Fine pointer: ≥24×24 CSS px, or 24px spacing (WCAG 2.5.8).
   - Coarse pointer: ≥44×44.
   - Icon-only buttons in dense rows are 28px with `after:` hit areas.
5. **Names:**
   - Every icon-only control has an `aria-label`.
   - Every Tooltip trigger has an accessible name of its own.
   - Every field has a visible `<Label htmlFor>`, or an `aria-label` plus a leading icon and a visible submit (QuickAdd).
   - Every Segmented and ChoiceChip group has an `aria-label`.
6. **State is never colour alone:**
   - Quadrant: dot plus "Q2".
   - Role: dot plus name, or the check ring plus the row's role meta.
   - Past due: amber plus an icon plus "was due" copy.
   - Kept: an icon plus a word.
   - Selected tab: ink plus bar. Segmented: ink plus weight plus thumb. Filter chip: fill plus ink.
   - Covered versus uncovered roles: filled versus hollow dot.
7. **Motion:** everything in §7.3 holds under `prefers-reduced-motion`. No animation longer than 500ms except the chart draw (600ms, first render, removed under reduced motion).
8. **Reflow:** no horizontal scroll at 320px, or at 1280px with 400% zoom, outside the scroll containers named in §8. Text containers use `min-h-*`, not a fixed `h-*`, and truncated text has a Tooltip or detail view.
9. **Drag alternatives (2.5.7):** every drag has a single-pointer path:
   - Priority: the task-sheet priority field.
   - Day: the Move popover.
   - Quadrant: the task-sheet picker.
   - Block time: the block dialog's Day/From/To fields.
   - Tray rock to day: the Move/Schedule action.

   dnd-kit's announcements and `KeyboardSensor` stay.
10. **Dialogs:**
    - Titles are always rendered (sr-only when visually absent).
    - The safe action receives initial focus in destructive confirms.
    - Focus returns to the trigger, or to the list heading when the trigger was deleted.
11. **Live regions:** SaveStatus is `aria-live="polite"`. Toasts are sonner's polite region, and Undo toasts last 10s.
12. **Charts:** the ChartCard table twin stays. Hit rects are focusable with a visible `focus-visible:stroke-ring` and have an `aria-label`.
13. **Verification pass:**
    - axe or Lighthouse on every route in both themes.
    - A keyboard-only pass.
    - Forced-colors emulation.
    - 320px width and 400% zoom.
    - The text-spacing bookmarklet.
    - Reduced-motion emulation.
    - Deuteranopia, protanopia and tritanopia simulation.
    - The smallest target per route on fine and coarse pointers.

---

## 10. Screens: art direction

Each screen lists its layout, components, what to remove and its **signature** detail. Handlers, keys, ids and conditions are preserved (§12).

### Today (S1): `today.tsx`, `today/*`

- **Header:** `PageHeader size="hero"`.
  - **Eyebrow = date nav:** ghost `icon-sm` chevrons (existing Links and `aria-label`s), the date in `text-xs font-medium text-muted-foreground tabular-nums`, and "Back to today" as `Button variant="link" size="inline"`.
  - **Title:** the serif greeting.
  - **Action:** `outline` "Something came up?" with `Hand`.
- **Epigraph** (replaces the mission card box; **keep the exact conditional logic of `today.tsx:75-97`**):
  - Section: `mb-10 grid grid-cols-1 gap-x-8 gap-y-3 border-b border-border-subtle pb-8 md:grid-cols-[minmax(0,1fr)_auto]`.
  - **Affirmation:** `voice-lg italic max-w-[65ch]`, led by `<span aria-hidden className="mr-1 font-serif text-faint-foreground">“</span>`. Without an affirmation, the mission excerpt shows as `voice line-clamp-3`.
  - **Intention:** "This week:" in `text-xs text-muted-foreground`, then `voice-sm italic`.
  - **"Your mission":** `ghost sm`, still shown only when both the affirmation and the excerpt exist.
- **Banners:** the plan/review banner is the page's one `Callout tone="primary"` (`CalendarCheck`, title, body, `default` action).
- **Grid:** `grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]`, both columns `min-w-0 space-y-10`.
- **Schedule (left):** `SectionHeader` "Schedule" with a ghost `sm` "Add" action. Then a timeline, not boxes.
  - Rows are `grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-3`, with the time column `pt-2.5 text-right text-xs text-muted-foreground tabular-nums` and the content column `border-l border-border-subtle pl-3 pb-2`.
  - **Blocks:** `eventBlockVariants({ layout: "row" })` with `EventTitle` (`text-sm`) and meta in `text-xs`.
  - **Happened / Didn't happen:** two ghost `icon-xs` toggles with `aria-pressed`. Happened pressed: `aria-pressed:bg-success-soft aria-pressed:text-success`. Didn't: `aria-pressed:bg-selected`. Always visible.
  - **Open gaps:** the existing gap `<button>` restyled as `flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-subtle`, reading "Open · 2h", plus a `Plus` "Add block" affordance that shows on hover, focus and coarse pointers. No dashes.
  - **Now:** the current item replaces its start time with a pill (`rounded-full bg-primary px-1.5 text-2xs font-medium text-primary-foreground tabular-nums`) and turns its spine segment into `border-l-2 border-primary`.
  - **Below `sm`:** a single column, with the time moved into the meta line above the title.
  - **Empty:** `EmptyState size="compact"`.
- **Check-ins and Deadlines:** `SectionHeader` plus `Row divided` lists on paper. Past-due labels use `text-warning` with `CalendarClock`, not red.
  - *As built (§11d):* the Deadlines and Big rocks "Today" actions (`Sun` + "Today", same handlers) sit in `RowActions` (hover, keyboard focus, always on touch), so a column of "Today"s never reads as a date beside "was due". Unfinished keeps its one visible action, now also with `Sun`.
- **Priorities (right):** **the one Card on the page** (the sheet on the desk).
  - **Header:** `CardTitle` "Today's priorities"; `CardAction` holds "1 of 3" (`text-xs text-muted-foreground tabular-nums`) and a `Meter` `w-16 size="sm"`.
  - **Groups:** A, B, C and "Not ranked yet" are `GroupLabel`s ("A", hint "Vital", in ink, not teal). Each droppable `<section>` gets `-mx-2 rounded-lg px-2` plus `dropZone(state)` (read `useDragOperation()` for "available").
  - **Rows:** `Row divided as="li"` (the sortable `ref`) with:
    - a `GripVertical` handle button (`-ml-1 grid size-6 place-items-center rounded-xs text-faint-foreground cursor-grab opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100`)
    - `DoneCheck`
    - `RowTitle` and `RowMeta`
    - `QuadrantBadge size="xs"`
    - `RowActions` (Focus, Move)
  - **Empty group:** one line, "Drag a task here, or add one below."
  - **Foot:** `QuickAdd variant="field"` (keep `aria-label="Add priority"`).
- **Big rocks and Unfinished:** `SectionHeader` plus rows. Unfinished shows one visible ghost `xs` action plus a `⋯` DropdownMenu holding the others (same handlers). Nothing is in a card.
- **Challenge check-in:** `Card size="sm"` with a `Sprout` `SectionHeader` and rows of `Segmented size="sm"` (`aria-label` each).
- **Evening reflection:** a full-width Card after `mt-10`.
  - Header: `Moon` plus "Evening reflection" plus `SaveStatus`.
  - Body: three prompts in `grid gap-6 md:grid-cols-3`, each with a `Label size="sm" htmlFor` and `Textarea voice="sm" rows={3}`.
- **Loading:** a skeleton of the real layout (epigraph lines, 5/7 grid, `h-10` rows).
- **Remove:**
  - the mission card box
  - bordered A/B/C boxes and `bg-background` items
  - dashed gaps and uppercase panel titles
  - `text-[11px]` and `!text-sm`
  - `text-primary` labels and icons
  - the inline `borderLeft`
  - `opacity-50 shadow-lg` on drag, and `opacity-60` actions
- **Signature:** the teal now-pill on the timeline spine, plus the completion check.

### Week (S2): `week.$start.tsx`, `week/*`, `plan/step-schedule.tsx`

- **Header:** `PageHeader` with `className="mb-4"`.
  - **Eyebrow:** the week nav (`icon-sm` prev/next with the existing `aria-label`s, plus a `link inline` "This week").
  - **Title:** the range, `voice-display tabular-nums`.
  - **Next to the title, a WeekStatusBadge:**
    - Draft: `Chip outline` with a hollow dot.
    - Planned: `Chip neutral` with a `bg-primary` dot.
    - Reviewed: `Chip neutral` with `Check`.
  - **Actions:** all `sm`. Only "Plan this week" is `default`; "Review & plan next week" is `outline`; "Replan" is `ghost`.
- **Weekly focus:** `Input variant="ghost" voice="md" className="italic"`, keeping the placeholder, blur-save and Enter-blur. No dashes.
- **Stats** (`week-stats.tsx`): `StatStrip cols={4}` with `mb-4`.
  - **Planned time:** value plus unit, `Meter` with a target tick; `tone="warning"` over or at capacity (never destructive). The tooltip moves to the StatCell `info` button.
  - **Quadrant II time:** a `QuadrantDot q=2` in the label.
  - **Roles with a rock:** `x/5` plus role dots: covered `size-2.5` filled; uncovered `size-2.5 rounded-full ring-1 ring-inset ring-(--role-ink)` hollow inside `role-scope`. The names go in sr-only text and a Tooltip on the group.
  - **Sharpen the saw:** `MeterSegments tone="q2"`.
- **Tray** (`goal-tray.tsx`): a Well `aside` (keep the droppable `ref`).
  - **Header:** `flex items-center justify-between px-2 pb-2`, "Roles & big rocks" (`text-sm font-semibold`), a status `Chip` (neutral, or success with `Check`), and a subtitle `text-xs text-muted-foreground` (existing text logic).
  - **Drop states:** neutral `dropZone("over")` while a task is over it. `dropZone("over", "danger")` plus the existing subtitle only when a **block** is over it (it removes the block).
  - **Role groups:** a `GroupLabel` with RoleDot, name and count; "· no rock yet" muted.
  - **Rock cards:** `boardCard` with `flex items-start gap-2`:
    - `DoneCheck size="sm"` (role colour, `data-no-drag`)
    - `Mountain size-3.5 text-muted-foreground`
    - title `text-sm` with `strike`
    - `RowMeta`: "2× · 1h 30m", day "Tue", **"Not placed yet" with `CircleDashed` in muted ink (not amber)**, `Repeat` plus carry count, estimate
  - The grip is decorative, shown on hover and coarse pointers.
  - **Saw:** `GroupLabel` "Sharpen the saw" with dimension sub-labels (`text-xs font-medium text-muted-foreground`) and `QuickAdd variant="inline"` for empty dimensions. No dashed box.
- **Grid** (`week-grid.tsx`, `layout.ts`)
  - **Setup:**
    - One Card: `p-0` plus `overflow-hidden`, with an `isolate overflow-auto scrollbar-thin scroll-pl-14` scroller.
    - `HOUR_PX = 56`. Re-tune the `--week-h` calcs: `week.$start.tsx`'s `calc(100svh - …)`, WeekPlanner's default, and `step-schedule.tsx`'s.
    - Columns: one constant, `grid-cols-(--week-cols)`, with `[--week-cols:3.5rem_repeat(7,minmax(7.5rem,1fr))] md:[--week-cols:3.5rem_repeat(7,minmax(5.25rem,1fr))]`. It is shared by the header and the body; drop `min-w-[760px]`. The tray beside it is 16rem from `lg` and 18rem from `2xl`, so all seven days fit at 1280px with the sidebar open.
    - Mobile: `snap-x snap-mandatory`, with day columns `snap-start`.
  - **Header and gutter:**
    - Sticky header: `sticky top-0 z-20 bg-card/95 backdrop-blur-md`.
    - Corner cells: `sticky left-0 z-30 bg-card`.
    - Hour gutter: `sticky left-0 z-10 bg-card`, with labels `text-2xs text-muted-foreground tabular-nums`.
    - Day header: weekday `text-2xs font-medium text-muted-foreground`; date `mt-0.5 grid size-8 place-items-center rounded-full text-lg font-medium tabular-nums`. Today: `bg-primary text-primary-foreground`. Past days: `text-faint-foreground`.
  - **Priorities lane:**
    - The gutter cell shows `ListChecks size-4 text-muted-foreground` with a Tooltip and `sr-only` "Priorities" (replaces the rotated 10px label).
    - Lane: keep the scroll, `max-h-32 min-h-14 flex-col gap-1 p-1.5`, plus `dropZone`.
    - Chips: `role-scope flex items-start gap-1.5 rounded-lg bg-card px-2 py-1 text-xs shadow-xs ring-1 ring-edge`, with `DoneCheck size="sm"` and the title `line-clamp-2`. No inline `borderLeft`.
    - "Drop here" (`text-2xs`) shows only while a compatible drag is active.
  - **Day columns:**
    - Today: `bg-[color-mix(in_oklab,var(--primary)_4%,transparent)]`.
    - Hour lines: `border-border-subtle`. Half-hours: `border-dotted border-border-subtle`.
    - **Every decorative child stays `pointer-events-none`.**
  - **Now:** a `h-0.5 bg-primary` line with a `size-2 rounded-full bg-primary` dot in today's column, plus a gutter pill (`rounded-full bg-primary px-1.5 text-2xs font-medium text-primary-foreground tabular-nums`) at the same `top`. Use the `--now`/primary teal, never `bg-q1`.
  - **Hover slot:** `rounded-sm bg-[color-mix(in_oklab,var(--primary)_10%,transparent)] outline-1 outline-primary/60 -outline-offset-1`, with a time label `text-2xs font-medium text-primary-ink`.
  - **Blocks:** `eventBlockVariants({ kind, layout: "grid" })` plus `tierFor()`.
    - Height: `max(20, dur*PX_PER_MIN - 2)`; lanes are 2px apart.
    - Done toggle: `DoneCheck size="sm"` at `absolute top-1 right-1`, with `opacity-0 group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100 data-[done]:opacity-100`.
    - Resize handle: `h-2`, with a centred `after:` grip (`w-6 h-0.5 rounded-full bg-foreground/30`), visible on hover and coarse pointers.
    - Drag source: `dragSource` (§6.2 surface.tsx).
  - **DragPreview:** the block preview matches the registered column width (not `width:140`) and uses `eventBlockVariants` plus `animate-dnd-lift`. The task preview is a `boardCard` plus `animate-dnd-lift`.
- **Remove:**
  - the `text-[10px]`/`[11px]` text
  - `bg-q1` as "now"
  - `opacity-30`/`50` states
  - the red tray and red over-capacity
  - the dashed saw box
  - inline role borders
- **Signature:** today's column wash with the teal now pill tying it to the gutter.

### Plan ritual (S3): `plan.$start.tsx`, `plan/*` except `step-schedule.tsx`

- **Chrome:** a sticky header `sticky top-12 z-20 border-b border-border-subtle bg-background/85 backdrop-blur-md backdrop-saturate-150`, inner `mx-auto flex h-14 max-w-8xl items-center gap-4 px-4 sm:px-6 lg:px-10`.
  - **Left:** eyebrow "Weekly planning" (`text-xs font-medium text-muted-foreground`) and h1 `text-sm font-semibold` "Plan Sep 28 – Oct 4". Both are `sr-only` below `md`.
  - **Centre:** `PlanStepper`.
  - **Right:** the elapsed-time `Chip` (neutral, with `Clock`; `warning` tone after 30 minutes, keeping the sessionStorage logic) and an `IconButton` X "Leave planning".
- **`PlanStepper`** (`plan/plan-chrome.tsx`, new): keep the `ol aria-label="Planning steps"`, `aria-current="step"` and click-to-jump.
  - **Step button:** `relative flex items-center gap-2 rounded-full py-1 pr-2 pl-1 text-sm focus-ring-inset pointer-coarse:after:absolute pointer-coarse:after:-inset-2`.
  - **Disc:** `grid size-6 place-items-center rounded-full text-2xs font-semibold tabular-nums transition-colors duration-180`.
    - Done: `bg-foreground text-background`, with `Check size-3`.
    - Current: `bg-card text-primary-ink ring-2 ring-primary`.
    - Future: `bg-muted text-muted-foreground`.
  - **Labels:** `hidden lg:inline`. The current step's label is always visible (`text-xs font-medium`).
  - **Connectors:** `relative h-px w-4 overflow-hidden bg-border sm:w-6`, with an inner `absolute inset-0 origin-left bg-primary transition-[scale] duration-320 ease-out` at `scale-x-100` before the current step and `scale-x-0` after.
  - **Hint:** the step hint moves from `title=` to a Tooltip.
  - **On commit:** the last disc fills.
- **Step content:** `mx-auto max-w-3xl px-4 py-8 sm:px-6`, with every step opening on `StepHeader`.
- **`ActionBar`** (`plan/plan-chrome.tsx`, new), used by **every** step including review and commit (those steps render their own instance with their existing handlers and disabled state):
  - Container: `sticky bottom-0 z-20 border-t border-border-subtle bg-background/85 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md backdrop-saturate-150`.
  - Inner: `mx-auto flex max-w-3xl items-center gap-3 px-4 sm:px-6`.
  - Contents: ghost Back with `ChevronLeft`, a hint (`hidden flex-1 text-sm text-muted-foreground sm:block`), and the primary `size="xl"` at `ml-auto`.
- **Compass step:**
  - Mission in a Card (`voice whitespace-pre-wrap max-h-80 overflow-y-auto`) with a ghost `sm` "Refine".
  - Affirmations as quotes: `border-l-2 border-border-strong pl-4 voice italic`, no box.
  - Role reflections: a `sm:grid-cols-2 gap-x-8 gap-y-6` list (RoleDot, name `font-medium`, description `voice-sm italic text-muted-foreground`, goals `text-sm`), not cards.
  - Intention: the same ghost voice Input look as Week, keeping its autosave, plus `SaveStatus`.
- **Roles step:** option cards (`plan/option-card.tsx`, new; also used by Review).
  - Checkbox semantics: `label` with `flex cursor-pointer items-start gap-3 rounded-xl bg-card p-4 shadow-xs ring-1 ring-edge transition-shadow duration-120 hover:ring-border-strong has-[[data-checked]]:ring-2 has-[[data-checked]]:ring-primary`.
  - Unselected cards keep full contrast (no `opacity-70`).
  - The saw card is disabled and checked, with `Chip` "Always on".
  - Add role: `QuickAdd`.
- **Goals step:**
  - One `Card` per role in `grid gap-6 lg:grid-cols-2`. Rocks are `Row`s holding an `Input variant="ghost"` title (Enter-blur and blur-save kept) and `EstimateSelect size="sm" variant="ghost"`.
  - Carry: a neutral `Chip` with `Repeat`, **not amber**.
  - Details and Remove: `IconButton`s in `RowActions`.
  - Suggestions: `AddChip`s. The too-many nudge is `text-xs text-warning` with `TriangleAlert`.
  - **SawCard:** a Card spanning two columns with "Always on", plus a 2×2 `grid sm:grid-cols-2 gap-px overflow-hidden rounded-lg bg-border-subtle` of dimension cells (`bg-card p-4`: label `text-sm font-medium`, prompt `text-xs text-muted-foreground`, rows, inline `QuickAdd`). This turns four nesting levels into one.
- **Review step:**
  - `StatStrip cols={3}`.
  - **Kept:** `SectionHeader` plus rows (`CircleCheck text-success`, RoleDot, title) entering once with `useEnterOnce()`. Remove `bg-primary/5`.
  - **Each open rock:** a `Row` with a `Segmented` "Done after all / Not done", replacing the variant-switching buttons; same handlers, and `aria-pressed` now works.
    - **Reasons:** `OptionCard` buttons (`button type="button" aria-pressed`, `flex items-start gap-3 rounded-lg bg-card px-3 py-2.5 text-left text-sm ring-1 ring-edge hover:ring-border-strong aria-pressed:bg-selected aria-pressed:ring-2 aria-pressed:ring-foreground`) with a radio-style indicator (`mt-0.5 grid size-4 place-items-center rounded-full border-[1.5px] border-control`, plus an inner `size-2 rounded-full bg-foreground` when pressed), inside `role="group"`.
    - "I chose a higher value" shows `CircleCheck text-success`, because it counts as kept.
  - **Rating 1–5:** a default `Segmented aria-label="Rating"` (five 36px options).
  - **Fresh start:** `Callout tone="neutral"` with `Sparkles` and an outline action.
  - **Balance strip:** a `Card variant="flush"` with `overflow-x-auto`. Covered roles are filled dots, uncovered are hollow; saw bars `bg-q2`.
- **Commit step:**
  - `StatStrip`; the warning `Callout tone="warning"` (the page's one callout).
  - "Week at a glance": role sections as `dl`s in `sm:grid-cols-2`, not cards. "Not scheduled" becomes neutral "Not placed yet" with `CircleDashed`.
  - If-then: `ChoiceChip selection="multi"`, with the 3-pick cap and `disabled` kept.
  - **On successful commit:** no bloom. The commit navigates away as soon as the request succeeds, and navigation is never delayed for decoration (decided in §11d). The stepper filling to the last disc is the moment.
- **Remove:**
  - the pill stepper
  - inline CTA rows
  - `rounded-2xl` cards
  - `compass-text !text-*`
  - `bg-muted/40` inner boxes
  - variant-switch toggles
  - `opacity-70` cards
- **Signature:** the stepper rail filling teal.

### Matrix (S4): `matrix.tsx`

- **Header:** `PageHeader habit={3} eyebrow="Put first things first"`. Actions: a `label` with `Switch` "Big rocks only" plus `RoleSelect size="sm"`.
- **Distribution:** `flex h-2 gap-0.5 overflow-hidden rounded-full` of `bg-q{n}` segments (widths inline, no track, no `title=`).
  - Legend: `flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground tabular-nums`, with `QuadrantDot` plus "Q2 · 38%".
    - *As built (§11d):* the legend keeps the original content, the count and the hours ("QII 16 · 15h"), because a percentage alone would drop both (§12). The bar widths already show the share.
- **Board:** `grid grid-cols-1 gap-4 xl:grid-cols-[18rem_minmax(0,1fr)]` when the inbox has items.
  - Quadrants: `grid grid-cols-1 gap-4 md:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)]`.
  - Axis labels: `text-xs font-medium text-muted-foreground`, sentence case, vertical only at `md+`, hidden below.
- **Inbox:** `BoardColumn` with `Inbox` icon, "Inbox" and count, no bar (the dashed border goes). Keep the droppable id `"inbox"`.
- **Quadrants:** `BoardColumn bar={n} dot title="Q2 · Schedule" label count` with a guidance line (`px-2 text-xs text-muted-foreground`). Q2 gets `lit`. Keep the ids `` `q${q}` ``, `data`, `accept` and `collisionDetector`. The drop state comes from `isDropTarget` and `useDragOperation()`.
- **Cards:** `boardCard` plus `flex items-start gap-2 cursor-grab`:
  - RoleDot `mt-1.5`
  - title `line-clamp-2`
  - `RowMeta`
  - `RowActions` wrapper **keeps `data-no-drag`**, with `IconButton`s (Prevent, Schedule, Make big rock, Delegate, Drop)

  Drag source: `dragSource` (§6.2 surface.tsx).
- **CardPreview:** the identical card (role dot and meta) plus `animate-dnd-lift`. `dropAnimation` per §7.2.
- **Inline add:** `QuickAdd variant="inline"` at each well's foot.
- **Remove:**
  - `c.border` coloured column borders
  - the dashed inbox
  - uppercase axes
  - `text-[11px]`
  - the inline legend dots
- **Signature:** **Q2 is the only lit well**, with its green top rule.

### Tasks (S4): `tasks.tsx`, `task-row.tsx`

- **Page:** `width="medium"`. `PageHeader` action: `default` "Capture & triage".
- **Toolbar:** `mb-6 flex flex-wrap items-center gap-x-4 gap-y-3`.
  - Tabs (underline) for Open, Inbox, Backlog, Done and Said no. Inbox gets a `CountBadge` (`attention` when greater than 0).
  - Right: `ml-auto flex w-full items-center gap-2 sm:w-auto`, holding `Segmented size="sm" aria-label="Group by"` and the search `InputGroup` (`w-full sm:w-60`, leading `Search`). Drop the absolutely positioned icon hack.
- **Quick add** (open and inbox views): `QuickAdd variant="field" className="mb-6"`.
- **Groups:** `space-y-8`.
  - **Sticky `SectionHeader`:** `sticky top-12 z-10 -mx-3 mb-1 bg-background/90 px-3 py-2 backdrop-blur-md`, holding the RoleDot and name or `QuadrantBadge withLabel`, plus the count. Show the quadrant's descriptive label once, in `text-xs text-muted-foreground`.
  - **Rows sit on paper**, with no card: `Row divided`.
- **`TaskRow`** (keep the props and the `actions` slot):
  - `DoneCheck` (role colour, existing labels)
  - a title-and-meta column (`min-w-0 flex-1`): `RowTitle`, then `RowMeta` with role (dot and name), carry (`Repeat` and count) and status reason
  - at `sm+`: `MetaSlot day` (planned, plain muted), `MetaSlot due` (**past due in `text-warning` with `CalendarClock`**, replacing `text-destructive`) and `MetaSlot estimate`. Below `sm`, these values join `RowMeta`.
  - `QuadrantBadge size="xs"`
  - `RowActions`

  The 10px `Repeat` becomes `size-3.5`.
- **Empty:** `EmptyState` with `ListChecks`, the existing title and description, and an outline "Capture" action (the existing `openCapture`).
- **Loading:** six `h-10` row skeletons.
- **Signature:** the completion sequence (fill, tick, strike) on paper-flat rows with aligned tabular columns.

### Task sheet (S5): `task-sheet.tsx`, `quadrant-picker.tsx`

- **Frame:** the floating `SheetContent` (§6.1). Keep `key={taskId}` and the `isFetchedAfterMount` gating.
- **Sticky header:** `sticky top-0 z-10 border-b border-border-subtle bg-popover/95 px-5 pt-5 pb-4 backdrop-blur-md` (keep the sr-only `SheetTitle`).
  - **Row:** `DoneCheck size="lg"` (replaces `Checkbox`, same handler), then the title `Textarea variant="ghost" className="text-xl font-semibold"` with visible focus (**remove `focus-visible:ring-0`**).
  - **Chip row:** `QuadrantBadge withLabel`; "Big rock" as `Chip neutral` with `Mountain` (not teal); urgent as `Chip outline`; carried as `Chip neutral` with `Repeat`; `SaveStatus` at `ml-auto`.
  - **Status note:** `Callout tone="info"` with "Reopen" as `Button variant="link" size="inline"` (replaces the raw button).
- **Body:** `space-y-6 px-5 py-5`, sections headed by `GroupLabel`s: Triage, When, Why, Notes.
  - **Property grid:** `grid grid-cols-1 gap-x-3 gap-y-1 sm:grid-cols-[7rem_minmax(0,1fr)] sm:items-center`. Rows are `min-h-9`; labels `Label size="sm" htmlFor`.
  - **Controls:** ghost `RoleSelect`, `GoalSelect`, `DateField` and `EstimateSelect` (a border shows on hover and focus). The priority is `Segmented size="sm" aria-label="Daily priority"`.
  - **Text fields** (why, if-then, notes) stay bordered, with the existing autosave and LanguageHint.
- **`QuadrantPicker`:** `grid grid-cols-2 gap-2`. Buttons: `flex min-h-14 flex-col items-start gap-0.5 rounded-lg bg-card px-3 py-2 text-left ring-1 ring-edge transition-shadow hover:ring-border-strong aria-pressed:ring-2 aria-pressed:ring-q{n} aria-pressed:bg-q{n}/12`.
  - Contents: `QuadrantDot` plus "Q2" `text-sm font-semibold`, and the label `text-xs text-muted-foreground` at both sizes.
  - Axis labels: `text-2xs font-medium text-muted-foreground`, sentence case, `sm+` only. Remove `text-[10px]`/`[11px]` and `uppercase`.
- **Footer:** `sticky bottom-0 flex flex-wrap items-center gap-2 border-t border-border-subtle bg-popover/95 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md`.
  - Focus: `default sm`. Big rock and Delegate: `outline sm`.
    - *As built (§11d):* below `sm`, where the sheet is full-screen, the footer is one row: a full-width Focus plus the `⋯` menu, which then also holds Big rock, Prevent it recurring and Delegate (same handlers).
  - A `⋯` `IconButton` DropdownMenu holds "Say no" and "Delete" (destructive item). **Delete opens the existing AlertDialog through local `confirmOpen` state**, with identical content and handlers.
  - The delegation panel renders above the footer, as `rounded-lg bg-muted p-3`.
- **Loading:** a skeleton (a title line and six property rows), not "Loading…".
- **Signature:** a quiet property grid under a live header.

### Capture dialog (S5): `capture-dialog.tsx`

- **Frame:** `DialogContent size="lg" placement="top"`. Keep `key={JSON.stringify(capture.prefill)}` and `titleRef` focus.
- **Header:** title with `Hand` (muted, not teal) plus description.
- **Title:** `Input size="lg"`, then `LanguageHint`.
- **Role and Goal:** `grid grid-cols-1 gap-3 sm:grid-cols-2` with `Label size="sm" htmlFor`, default-size selects.
- **Questions** (no box): `grid gap-4 border-t border-border-subtle pt-4`. Each row: `flex flex-wrap items-center justify-between gap-3`.
  - Left: question `text-sm font-medium` and help `text-xs text-muted-foreground`.
  - Right: `Segmented` (default size, `aria-label`). The urgent row adds a `DateField` at the same 36px.
- **Verdict (`QuadrantGuidance`):** `relative overflow-hidden rounded-xl bg-card px-4 py-3.5 shadow-xs ring-1 ring-edge before:absolute before:inset-x-0 before:top-0 before:h-0.75 before:bg-q{n}`.
  - Content: `QuadrantDot` and "Q2 · Schedule it" (`text-sm font-semibold text-foreground`), then the guidance `text-sm text-muted-foreground`.
  - The inner content is keyed by quadrant with `animate-rise-in`, so it cross-fades as the answers change. Remove `text-foreground/60–80`.
- **Q-panels:**
  - Q3 toggles become `ChoiceChip selection="multi"` (with `aria-pressed`).
  - Delegate becomes a `rounded-lg bg-muted p-3` sub-panel, `grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]`.
  - "Bigger yes" becomes `Callout tone="neutral"` (the one callout).
- **Footer:** `DialogFooter start={<span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex"><Kbd>Esc</Kbd> to cancel</span>}`, then ghost "Just save it" and the primary with `<Kbd>↵</Kbd>` inside (it adapts). **All `type="button"` attributes and the Enter-submits behaviour stay.**
- **Signature:** the verdict card changing quadrant as you answer.

### Focus mode (S5): `focus-mode.tsx`

- **Frame:** render inside a Base UI `Dialog` (modal, `open` from app state) whose popup is `fixed inset-0 z-50 flex flex-col bg-background animate-in fade-in-0 zoom-in-98 duration-240` (opaque; drop `/97` and the blur).
  - This gives a **focus trap**, **initial focus on Done** (`initialFocus` ref) and **focus returned to the trigger**.
  - `onOpenChange` ignores the `escape-key` reason, so the existing `useHotkeys("escape")` stays the single close path.
  - Keep `aria-label="Focus mode"`.
- **Top bar:** `flex h-14 items-center justify-between px-5`, with the eyebrow "Focus" (`text-xs font-medium text-muted-foreground`), `<Kbd>Esc</Kbd>` and a ghost `icon` Button X `aria-label="Leave focus mode"`. No tooltip: an open tooltip would take the first Esc from the hotkey.
- **Centre:** `mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-10 px-6 pb-16 text-center`.
  - **Why-chain:** mission `voice-sm italic line-clamp-2 text-muted-foreground`, then `flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground` holding RoleBadge, "toward {goal}" and `QuadrantBadge withLabel`.
  - **Title:** `voice-display text-4xl sm:text-5xl`.
  - **`MeterRing`:** `size` 200 (160 below `sm`), with the time `text-4xl font-semibold tabular-nums` (Geist, **not `font-mono`**) inside, and `valueText` set to the remaining time in words.
  - **Actions:** outline Pause/Resume, `default size="xl"` Done, ghost "Something came up".
- **Loading:** a skeleton, not "Loading…".
- **Signature:** the ring.

### Command palette (S5): `command-palette.tsx`

- Uses the §6.1 Command recipe.
- **Groups:** Actions (shortcut `Kbd`), Pages, Open tasks. Task items show `QuadrantBadge size="xs"` at `ml-auto`.
- Add a `CommandFooter` with `Kbd` ↑↓ "to move", ↵ "to open" and Esc "to close".
- Keep the item `value` format, the 200-item cap and `enabled: paletteOpen`.

### Stewardships (S7): `stewardships.tsx`

- **Layout:** `PageHeader` with the primary "New stewardship", then `WithRail`.
- **Agreement:** a `Card` (a real object).
  - **Header:** title `text-base font-semibold`; a meta line (`text-sm text-muted-foreground`: steward, `MetaSep`, "result by" date, `RoleBadge muted`).
  - **Check-in chip:** `Chip tone="primary"` with `CalendarClock` "Check-in due" when due (an invitation, **not amber**), otherwise `Chip tone="outline"`. Remove `border-primary/50`.
  - **Elements:** the five become a numbered `dl`, `grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2`.
    - Each item: `border-t border-border-subtle pt-3`, with a serif numeral (`font-serif text-lg leading-none text-faint-foreground tabular-nums`), `dt` `text-xs font-medium text-muted-foreground` and `dd` `text-sm`. The fifth is `sm:col-span-2`.
    - Empty: "Not agreed yet" in `text-muted-foreground`, plus `Button variant="link" size="inline"` "Add" (the existing Edit handler).
    - The inner muted boxes are removed.
  - **"Needs help":** `Chip tone="warning"` with `LifeBuoy`.
  - **Footer:** Check in (`soft` when due, matching the primary-soft "Check-in due" chip, so "New stewardship" stays the page's one solid primary; else `outline`), Edit `outline`, Result achieved `ghost`, and Cancel in a `⋯` DropdownMenu (same handler).
- **Closed:** a `details` section: `summary` as a `Row` with a rotating chevron (`[&[open]>summary_svg]:rotate-90 transition-transform`), then `Row` items with ghost `xs` "Open".
- **Rail:** `PrincipleNote`; `RailSection` "Adjust to maturity"; `RailSection` candidates (`Users`) as rows with `outline xs` "Delegate".
- **Dialogs:** `size="lg" placement="top"`, footer `start` for destructive actions. The check-in dialog is `size="md"`.
- **Empty:** `EmptyState` with `HeartHandshake` and the "New stewardship" action.
- **Signature:** the numbered agreement ledger.

### Compass (S6): `compass.tsx`, `compass/*`

- **Page:** `width="wide"`, `PageHeader habit={2} eyebrow="Begin with the end in mind"`. URL tabs keep their values. Tab panels use `WithRail`.
- **Mission:** the **paper editor**.
  - Container: `Card variant="flush" className="has-[textarea:focus-visible]:outline-2 has-[textarea:focus-visible]:outline-offset-2 has-[textarea:focus-visible]:outline-ring"`.
  - Toolbar row: `flex items-center justify-between gap-3 border-b border-border-subtle px-5 py-2.5`, with `SaveStatus` left and ghost `sm` "Insert role outline" right.
  - Editor: `Textarea variant="paper" voice="lg" className="mx-auto block w-full max-w-[65ch] px-6 py-8 sm:px-12 sm:py-10"`. Keep `aria-label`, `key` and the 1000ms autosave. No resize handle.
  - **Rail** (`RailSection`s):
    - Review.
    - Writing it: a styled list `list-disc space-y-1.5 pl-4 text-sm marker:text-faint-foreground` (no `· `).
    - Tribute material: `voice-sm text-muted-foreground max-h-56 overflow-y-auto`.
    - Versions: `Row`s with the date `text-xs text-muted-foreground tabular-nums`.
  - **Version dialog:** `size="xl"`, body `voice whitespace-pre-wrap max-h-[55vh] overflow-y-auto rounded-lg bg-muted p-4`.
- **Affirmations:**
  - **Composer:** a Card with `CardTitle`, a description, `Textarea voice="md"`, and the five-ingredient checklist as an inline row, `flex flex-wrap gap-x-4 gap-y-2 text-xs`. Each item: `inline-flex items-center gap-1.5`, with `CircleCheck size-4 text-success` when met or `Circle size-4 text-faint-foreground` when not, and ink or muted text. No dashed tiles.
  - **Saved affirmations:** a list on paper of quote rows (`group/row border-l-2 border-border-strong py-1 pl-4`, `voice italic`). Inactive rows are `text-muted-foreground`, not opacity. Meta: `RoleBadge muted`, "n/5 ingredients". The `Switch` labelled "Active" and the delete `IconButton` sit in `RowActions`.
  - **Rail:** `PrincipleNote` and `RailSection` "Five ingredients" (styled list).
- **Exercises:**
  - Four sections in `divide-y divide-border-subtle`, each `py-10 first:pt-0`, h2 `voice-display text-2xl`.
  - **Tribute:** speakers in `grid gap-x-10 gap-y-8 lg:grid-cols-2`. Each speaker has an h3 `text-sm font-semibold` and fields with `Label size="sm" htmlFor` plus `Textarea voice="sm"`. Remove the muted tiles.
  - **Free-write:** timer `text-3xl font-semibold tabular-nums` (Geist; `text-primary-ink` at zero), `IconButton` play/pause/reset, and lenses as `grid gap-4 sm:grid-cols-3` (label `text-xs font-medium text-muted-foreground` plus prompt `text-sm`). `Textarea voice="md"`, **plus `SaveStatus`** (autosave exists; the status was missing). Past items: a styled `details`.
  - **Questions:** `Label htmlFor` (fixes the association) in `voice-sm`, with `Textarea`.
  - **Resources:** the add form keeps its two inputs; items are quote rows with a `RowActions` delete (fixes the invisible delete).
- **Your center:**
  - One `Card variant="flush"` with a `divide-y divide-border-subtle` scale list. Rows: `flex flex-wrap items-center justify-between gap-3 px-5 py-3.5`, label `text-sm font-medium` (no teal text), note `text-xs text-muted-foreground`, `Segmented` default with `aria-label`.
  - Notes: `Label htmlFor` plus `Textarea`.
  - Rail "Last time": a `Meter` per row.
- **Remove:**
  - all `compass-text !text-*`
  - the resize handle
  - `rounded-2xl` sections
  - `bg-muted/40` tiles
  - `font-mono`
  - `· ` bullets
  - opacity-60 inactive items
- **Signature:** the mission as a sheet of paper at a 65-character measure.

### Roles and goals (S6): `roles.tsx`

- **Page:** `PageHeader habit={2}` with the primary "New long-term goal".
- **Role Card:**
  - **Header:** `flex items-center gap-3`.
    - Colour swatch button: `relative size-4 rounded-full ring-2 ring-card ring-offset-1 ring-offset-border-strong after:absolute after:-inset-2 pointer-coarse:after:-inset-3.5`, with the inline colour and `aria-label` kept.
    - Name: `Input variant="ghost" className="text-lg font-semibold"` (blur-save kept).
    - `RowActions`-style `IconButton`s for up, down and archive, keeping the disabled logic.
  - **Body:** `mt-4 grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]`. *As built:* the Card is an `@container` and the two columns start at `@xl` (576px of card), so a sidebar-narrowed tablet stays one column.
    - Statement: `Label size="sm" htmlFor` "Who I want to be", plus `SaveStatus` inline, plus `Textarea voice="sm"`.
    - Goals: `SectionHeader as="h3" size="sm"` "Long-term goals" with ghost `sm` "+ Goal".
  - **GoalList:** `Row as="button"` items (not `bg-background` boxes):
    - `Flag size-4` (`text-success` when achieved, else muted)
    - title `text-sm font-medium` with `strike` when achieved
    - end-in-mind `text-xs text-muted-foreground line-clamp-1`
    - `RowMeta` with `MetaSep`s
    - `Pencil` in `RowActions`

    Empty: `EmptyState size="compact"`.
- **Saw card:** a Card with `Chip` "Always on", and dimensions in a `grid gap-px overflow-hidden rounded-lg bg-border-subtle sm:grid-cols-2 lg:grid-cols-4` hairline grid (cells `bg-card p-3`). No dashes.
- **Goals without a role:** a Card.
- **Add role:** `QuickAdd submitLabel="Add role"`.
- **Archived:** a `details` section of `Row`s with outline `sm` Restore. No dashed box.
- **Goal dialog:** `size="lg" placement="top"`, with `footer start` holding `destructive-ghost` Delete. Keep `key` and `autoFocus`.
- **Signature:** role statements set in the serif, so identity reads as prose.

### Influence (S7): `influence.tsx`

- **Page:** `PageHeader habit={1} eyebrow="Be proactive"`. URL tabs.
- **Circle tab:** `grid grid-cols-1 items-center gap-8 md:grid-cols-[16rem_minmax(0,1fr)]`. *As built (§11d):* the tab wrapper is an `@container` and the grid splits at `@2xl:` (672px), so between 768 and ~1000px with the sidebar open the diagram stacks above the controls instead of squeezing them into a 190px column.
  - **Diagram:** outer circle `fill-inset stroke-border-strong`; inner circle `fill-primary-soft stroke-primary [stroke-width:1.5]`. Keep the growth mechanism, now 480ms `ease-out` with an explicit property (no `transition-all`).
    - Labels: `text-2xs font-medium fill-muted-foreground`, sentence case (no `uppercase`, no `text-[9px]`/`[10px]`).
    - Counts: `font-serif text-2xl fill-foreground`.
    - Keep `role="img"` and the `aria-label`.
  - **Controls:** `QuickAdd` (keep the handler that opens the new concern), `LanguageHint`, `PrincipleNote`, and a Switch label.
  - **Columns:** `grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4` of `BoardColumn`s with an icon and label (no colour). Unsorted is hidden when empty (kept).
  - **Concern card:** `boardCard` as a `button`:
    - title `text-sm font-medium`
    - reframe `voice-sm italic text-foreground` with `border-l-2 border-border-strong pl-2` (**ink, not teal**)
    - first step `text-xs text-muted-foreground` with `ArrowRight size-3.5`
    - status `text-xs text-muted-foreground`

    Empty column: `EmptyState size="compact"` "Nothing here yet." (full muted, not `/70`).
  - **Concern dialog:** `size="lg" placement="top"`. The method is `Segmented wrap` (long labels wrap at 375px), and method chips are `ChoiceChip`.
- **Challenge tab:**
  - **Inactive:** h2 `voice-display text-2xl`, a check list with `CircleCheck text-success`, and the `lg` primary start. **Keep the `return null` guard, but render a skeleton while `!data`.**
  - **Active:** header "Day n of 30" `voice-display text-3xl`, then a grid `grid grid-cols-6 gap-2 sm:grid-cols-10`.
    - Day button: `grid aspect-square min-h-10 place-items-center rounded-full text-sm font-medium tabular-nums transition-colors duration-120 pointer-coarse:min-h-11`.

    | Day state | Classes |
    |---|---|
    | Kept | `bg-primary text-primary-foreground`, with `Check size-4` and an sr-only day number |
    | Missed | `text-muted-foreground ring-1 ring-inset ring-border [background-image:repeating-linear-gradient(135deg,transparent_0_4px,var(--selected)_4px_5px)]` (hatched, neutral; **never amber**) |
    | Today | `ring-2 ring-primary ring-offset-2 ring-offset-background` |
    | Future | `text-muted-foreground ring-1 ring-inset ring-border-subtle`, disabled |

    - The native `title` becomes a Tooltip plus an `aria-label` with the date and state.
  - **DayEditor:** `size="sm"`.
- **Language tab:** `WithRail`; `Textarea voice="md" rows={8}`; a results Card with matches as rows (`MessageSquareQuote` muted, reframes in ink).
- **Signature:** the inner circle breathing wider as you act.

### Journal (S7): `journal.tsx`

- **Page:** `width="narrow"`, `PageHeader habit={1}`.
- **Composer:** a Card holding `Textarea variant="ghost" voice="md" rows={3}` (keep `aria-label` and placeholder), then a footer row with `LanguageHint` and a `default sm` "Save note" with `NotebookPen` at `ml-auto`.
- **"Why plans changed":** `SectionHeader`, then a sentence-style inline list, not chips: `text-sm text-muted-foreground`, with values `font-semibold text-foreground tabular-nums` joined by `MetaSep`. It is visibly not a filter.
- **Filters:** `ChoiceChip selection="single"` in `role="group" aria-label="Filter entries"`, `flex gap-2 overflow-x-auto no-scrollbar scroll-fade-x sm:flex-wrap`.
- **Timeline:**
  - Month heading: `sticky top-12 z-10 -mx-2 bg-background/90 px-2 py-2 voice-display text-xl backdrop-blur-md`.
  - Entries: `ol` of `li.group/row grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-4`. The rail is `relative before:absolute before:top-7 before:-bottom-4 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-border-subtle` on the marker cell; this replaces `-left-[21px]`.
  - Marker: `grid size-6 place-items-center rounded-full bg-card ring-1 ring-edge [&_svg]:size-3.5 [&_svg]:text-muted-foreground`, with the kind icon from §5.
  - Entry:
    - meta `flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground` (date, `MetaSep`, kind as `Chip size="sm" tone="outline"`, reason, rating)
    - title `text-sm font-medium`
    - body `voice-sm max-w-[65ch] whitespace-pre-wrap`
    - delete `IconButton` in `RowActions`, only for deletable kinds (as today)
- **Empty:** `EmptyState` with `NotebookPen`.
- **Signature:** sticky serif month headings over a hairline rail with kind pebbles.

### Insights (S8): `insights.tsx`, `insights/*`

- **Page:** `width="wide"`, `PageHeader habit={1}` (keep the eyebrow copy "Self-awareness"). URL tabs.
- **Overview:**
  - The range `Segmented size="sm" aria-label="Range"` stays inside the panel (its state is local), right-aligned: `mb-4 flex justify-end`. Keep the `opacity-60` `isPlaceholderData` transition (a loading state, not content styling).
  - **KPIs:** `StatStrip cols={4}`. The weeks-planned pips are `MeterSegments`, keeping three levels: `bg-primary`, `bg-primary/45`, `bg-muted`.
- **`ChartCard`** (`viz.tsx`): a Card with `CardHeader` (`CardTitle` `text-base`, `CardDescription` `text-xs`) and a `Segmented size="sm" aria-label="View"` Chart/Table with `ChartColumn` and `Table2` icons (replaces the ghost-button toggle). Add a `bare` prop (no card) for use inside `AuditResult`.
- **Chart styling:**
  - Ticks and labels: `text-2xs fill-muted-foreground tabular-nums` (replaces every `text-[10px]`/`[11px]`).
  - Grid: `var(--viz-grid)`. Baseline: `var(--viz-axis)`.
  - Bars: at most 24px wide, 2px gaps, 4px top radius; hover dims others to .45; first-mount `animate-grow-y` with ``style={{ animationDelay: `${Math.min(i, 12) * 12}ms` }}`` and `[transform-box:fill-box] origin-bottom`.
  - Line: `animate-draw` with `pathLength=1`.
  - Hit rects keep `tabIndex=0`, `aria-label` and focus handlers, and add `focus-visible:stroke-ring focus-visible:[stroke-width:2]` (fixes the invisible IntegrityLine focus).
  - **ChartTooltip:** `pointer-events-none absolute z-10 w-44 rounded-lg bg-popover px-3 py-2 text-xs shadow-lg ring-1 ring-edge transition-opacity duration-120 starting:opacity-0`. Keep `role="status"`.
  - **Reserve height** before measuring: `style={{ minHeight: PLOT_H + X_BAND }}`.
  - **Heatmap:** remove the `Math.max(10, …)` clipping. Render at natural width (cells ≥12px) inside `overflow-x-auto scroll-fade-x`.
  - **Legends:** the shared `Legend` with `size-2.5 rounded-xs` swatches.
- **FinishedBy:** moves into a `ChartCard` with the shared `Legend` and a `DataTable` twin.
- **Drift:** due dates use `fmtDate`, rows are `Row`s.
- **`StatTile`** (`viz.tsx`): becomes `StatCell standalone` (or re-exports it).
- **Time audit:**
  - `StartAudit`: a Card and `WithRail`. The serif h2 and lede sit on paper above the Card (sliders and footer only), the same shape as Urgency check and Your center.
  - Day switch: `Segmented` (replaces the Button toggles; same handler).
  - Brush: keep `role="radiogroup"`/`role="radio"`/`aria-checked`, styled as ChoiceChip geometry with `QuadrantDot` and `aria-checked:bg-selected aria-checked:border-foreground/40`.
  - Slots: `h-7 rounded-sm`, filled `bg-q{n}`, empty `bg-muted` (no dashes), `hover:ring-1 hover:ring-border-strong focus-ring-inset`. Hour labels `text-2xs`.
  - Keep all pointer-painting handlers and `select-none`.
  - Finish button: `justify-self-end`, not full width.
  - `AuditResult`: one Card with `md:grid-cols-[minmax(0,1fr)_18rem]` using `ChartCard bare` (no card inside a card). The reflection is `voice-sm`.
- **Urgency check:** a `Card variant="flush"` divided scale list (same recipe as Your center) and a `StatCell standalone` score ("/ 30" as the unit).
- **Signature:** bars grow in once, in order.

### Settings (S9): `settings.tsx`

- **Page:** `width="narrow"`, `PageHeader`.
- **Groups:** each is a `SectionHeader` (h2), then `Card variant="flush" className="divide-y divide-border-subtle"`.
- **Rows:** `flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between`.
  - Label: `Label htmlFor` (or the Segmented's `aria-label` = the row label) in `text-sm font-medium`.
  - Hint: `mt-0.5 max-w-sm text-xs text-muted-foreground`.
  - Controls: default size (`SelectTrigger className="w-44"`, `Segmented` default).
- **Theme:** `Segmented` with `Sun`, `Moon` and `Monitor` icons plus labels.
- **`DaySelect` and `HourSelect`:** import from `pickers.tsx` and delete the local copies.
- **Data:** a paragraph with `Database`; counts `text-xs text-muted-foreground` with `MetaSep`; outline `sm` Export and Import; ghost dev-only sample.
- **Import:** keep the exact flow (AlertDialog → export → import). The confirm uses `variant="destructive"`; the safe action gets initial focus.

### Welcome (S9): `welcome.tsx`

- **Page:** `min-h-svh bg-background`, column `mx-auto flex min-h-svh max-w-2xl flex-col px-5 pt-8 pb-[max(1.5rem,env(safe-area-inset-bottom))]`.
- **Top:** `BrandMark size="md" withName`.
  - Progress text: "Step 2 of 5 · {step name}" (`text-xs font-medium text-muted-foreground tabular-nums`).
  - Above a 5-segment track: `flex gap-1.5`, each segment `h-1 w-8 overflow-hidden rounded-full bg-muted` with an inner `h-full origin-left bg-primary transition-[scale] duration-320 ease-out` at `scale-x-100`/`scale-x-0`.
  - Keep the `ol`, `aria-current` and sr-only step names.
- **Steps:** each step's wrapper gets `animate-rise-in` (conditional rendering remounts it).
- **Step 0:**
  - Hero: `voice-display text-4xl sm:text-5xl` "Put first things first."
  - Lede: `max-w-xl text-md text-muted-foreground`.
  - Three habit cards, `Card size="sm"`, each with a serif numeral (`font-serif text-3xl leading-none text-faint-foreground tabular-nums`), the habit label `text-xs font-medium text-muted-foreground` (replaces the `text-[11px] uppercase` eyebrow), the name `text-sm font-semibold` and the body `text-sm text-muted-foreground`. No icon tiles.
  - The name field is `Input size="lg"` (keep `id="name"` and `autoFocus`).
- **Steps 1–4:**
  - Headings: `voice-display text-3xl sm:text-4xl`.
  - Selects: default size, full width.
  - Roles: a `Card variant="flush" className="divide-y divide-border-subtle"` of rows, each holding the colour swatch (Roles recipe), `Input variant="ghost"` (**visible focus**) and an `IconButton` X. Keep `key={i}`.
  - Saw row: `RoleDot color={SAW_ROLE_COLOR}` plus text plus `Chip` "Always on".
  - Add: `QuickAdd`. Suggestions: `AddChip`s.
  - Guidance lists: styled `ul` (no `· `).
  - Voice fields: `Input`/`Textarea voice`.
- **Footer:** `sticky bottom-0 -mx-5 mt-10 flex items-center justify-between border-t border-border-subtle bg-background/90 px-5 py-4 backdrop-blur-md`, with ghost Back and `size="xl"` Continue / Begin / "Plan my first week".
- **Data constant:** add `export const SAW_ROLE_COLOR = "#0f766e";` to `shared/content.ts`. It mirrors the server default in `server/db/schema.ts:102`; it is data, not a theme token. Use it at `welcome.tsx:186`.
- **Signature:** the hero serif and the progress rail filling.

### Sign-in and splash (S9): `lib/auth.tsx` (JSX of `Splash` and `SignInScreen` only)

- **Sign-in:**
  - Page: `grid min-h-svh place-items-center bg-background px-5`; inner `w-full max-w-sm space-y-8 text-center`.
  - Contents: `BrandMark size="lg"` centred, `voice-display text-4xl` "Compass", the existing lede in `text-md text-muted-foreground`, and `Button size="xl" className="w-full"`.
  - **Error:** `Callout tone="danger"` with `TriangleAlert` (replaces the `bg-destructive/5` box; the text stays).
- **Splash:** `BrandMark size="lg" className="animate-breathe"`. Keep `aria-busy` and the `aria-label`. Static under reduced motion.
- **Keep AuthGate's branch order exactly.**

### 404 and error (S9): `__root.tsx`

- **Layout:** `grid min-h-svh place-items-center p-6`, inner `max-w-md text-center`.
- **Icon:** `mx-auto mb-5 grid size-12 place-items-center rounded-full`.
  - NotFound: `bg-muted`, with `Compass size-5 text-muted-foreground`.
  - RootError: `bg-warning-soft`, with `TriangleAlert size-5 text-warning`. Errors are not red.
- **Text:** h1 `voice-display text-3xl`; one line `mt-2 text-md text-muted-foreground`.
- **Actions:** the existing buttons, `default` plus `outline` (`render={<Link/>}` kept), in `mt-6 flex justify-center gap-2`.
- **Copy:** replace the stale "the local server may still be starting… local database" wording at `__root.tsx:36` with original wording for a hosted app, for example: "Something went wrong on our side. Try again in a moment."

---

## 11. Implementation plan

### 11a. Foundation: phase 1, four groups in parallel

**Rules for this phase:**
- Each group owns only its listed files.
- Keep every existing export, prop, variant name and `data-slot`, so all current call sites still compile and render. New props are additive.
- A foundation group uses only **existing** props of another group's components (new props are consumed in phase 2).
- `pnpm typecheck`, `pnpm build` and `pnpm test` stay green.

| Group | Files (exclusive) | Deliverable |
|---|---|---|
| **F1 Tokens, global and shell** | `src/index.css`, `index.html`, `src/main.tsx`, `src/components/theme.tsx`, `src/lib/mutations.ts` (**only** `duration: 10_000` on the Undo toast), `src/routes/_app.tsx`, `src/components/app-sidebar.tsx`, `src/components/nav.ts` (read-only), `src/components/ui/sidebar.tsx`, NEW `src/components/brand-mark.tsx`, NEW `src/lib/platform.ts` | §2 verbatim; the theme-color metas; `LucideProvider`; `defaultViewTransition`; §6.3 shell; the sidebar recipe and cookie read. Runtime-verify the dnd lift and the placeholder ghost on Today priorities; delete only the placeholder rule if it misbehaves. |
| **F2 Controls** | `src/components/ui/button.tsx`, `button-group.tsx`, `input.tsx`, `textarea.tsx`, `input-group.tsx`, `label.tsx`, `field.tsx`, `select.tsx`, `checkbox.tsx`, `radio-group.tsx`, `switch.tsx`, `slider.tsx`, `toggle.tsx`, `toggle-group.tsx`, `kbd.tsx`, `badge.tsx`, `spinner.tsx`, `separator.tsx`, `calendar.tsx`, `progress.tsx`; `src/components/segmented.tsx`, `src/components/pickers.tsx` (plus `DaySelect`/`HourSelect`), NEW `src/components/icon-button.tsx` | §6.1 controls; §6.2 Segmented, pickers, IconButton. QA fixed heights at 13px. |
| **F3 Surfaces and overlays** | `src/components/ui/card.tsx`, `dialog.tsx`, `alert-dialog.tsx`, `sheet.tsx`, `popover.tsx`, `dropdown-menu.tsx`, `tooltip.tsx`, `command.tsx`, `sonner.tsx`, `tabs.tsx`, `skeleton.tsx`, `empty.tsx`, `item.tsx`, `scroll-area.tsx`, `collapsible.tsx`, NEW `src/components/ui/overlay-motion.ts` (`ui/chart.tsx`: do not touch) | §6.1 overlays, Tabs, Card, Skeleton, Empty. Dialog and AlertDialog change together. Verify the mobile sidebar still hides the Sheet close button. |
| **F4 Shared app components** | `src/components/page.tsx`, `src/components/badges.tsx`, `src/components/language-hint.tsx`, NEW `src/components/chip.tsx`, `done-check.tsx`, `row.tsx`, `surface.tsx`, `meter.tsx`, `stat.tsx`, `empty-state.tsx`, `quick-add.tsx`, `save-status.tsx`, `event-block.tsx`, `motion.ts` | §6.2. `QUADRANT_CLASSES` keeps its keys and literals. `PrincipleNote` restyle lands on all 13 call sites automatically. |

### 11b. Screens: phase 2, nine groups in parallel

- Each file is owned by exactly one group.
- A group may import any foundation component but must not edit foundation files or another group's files.
- Shared imports across groups keep their current props:
  - `BlockDialog` (S2) is used by S1.
  - `WeekStats` and `WeekPlanner` (S2) are used by `step-schedule` (S2).
  - `LanguageHint` (F4) is used by S1, S5 and S7.

| Group | Files (exclusive) |
|---|---|
| **S1 Today** | `src/routes/_app/today.tsx`, `src/components/today/timeline.tsx`, `today/priorities.tsx`, `today/panels.tsx`, `today/reflection.tsx` |
| **S2 Week** | `src/routes/_app/week.$start.tsx`, `src/routes/_app/week.index.tsx` (no change expected), `src/components/week/week-planner.tsx`, `week/week-grid.tsx`, `week/layout.ts`, `week/goal-tray.tsx`, `week/week-stats.tsx`, `week/block-dialog.tsx` (also rendered by Today; test both), `src/components/plan/step-schedule.tsx` (owns the `--week-h` calc for the plan route) |
| **S3 Plan ritual** | `src/routes/_app/plan.$start.tsx`, `src/components/plan/steps.ts`, `plan/step-compass.tsx`, `plan/step-roles.tsx`, `plan/step-goals.tsx`, `plan/step-review.tsx`, `plan/step-commit.tsx`, NEW `plan/plan-chrome.tsx` (PlanStepper, ActionBar), NEW `plan/option-card.tsx` |
| **S4 Matrix and Tasks** | `src/routes/_app/matrix.tsx`, `src/routes/_app/tasks.tsx`, `src/components/task-row.tsx` |
| **S5 Task overlays** | `src/components/task-sheet.tsx`, `capture-dialog.tsx`, `quadrant-picker.tsx`, `focus-mode.tsx`, `command-palette.tsx` |
| **S6 Habit 2** | `src/routes/_app/compass.tsx`, `src/components/compass/mission-tab.tsx`, `compass/affirmations-tab.tsx`, `compass/exercises-tab.tsx`, `compass/center-tab.tsx`, `compass/journal-singleton.ts` (no change expected), `src/routes/_app/roles.tsx` |
| **S7 Habit 1 and delegation** | `src/routes/_app/influence.tsx`, `src/routes/_app/journal.tsx`, `src/routes/_app/stewardships.tsx` |
| **S8 Insights** | `src/routes/_app/insights.tsx`, `src/components/insights/charts.tsx`, `insights/viz.tsx`, `insights/time-audit.tsx`, `insights/urgency-check.tsx` |
| **S9 Entry and settings** | `src/routes/welcome.tsx`, `src/routes/__root.tsx`, `src/routes/index.tsx` (no change expected), `src/lib/auth.tsx` (Splash and SignInScreen JSX only), `src/routes/_app/settings.tsx`, `shared/content.ts` (add `SAW_ROLE_COLOR` only) |

**Files nobody edits:**
- `src/routeTree.gen.ts`
- `src/components/app-state.tsx`
- `src/hooks/use-mobile.ts`
- `src/lib/{api,api-fetch,dnd,format,hooks,queries,utils}.ts`
- everything under `server/`, `api/` and `tests/`

### 11c. Banned patterns: grep before every PR

Run these from the repo root, scoped to the files you own. Every command must return nothing, except the "review" items (#15 and #30), where you check each hit by hand.

```sh
rg -n 'text-\['                                              src   #  1 arbitrary font size
rg -n '![a-z:-]*text-|text-[a-z0-9.-]+!'                     src   #  2 !important text overrides
rg -n 'text-(muted-)?foreground/[0-9]'                       src   #  3 opacity on text
rg -n '\buppercase\b|tracking-wide'                          src   #  4 uppercase / letter-spaced labels
rg -n 'font-mono|font-bold|font-\[[0-9]'                     src   #  5 wrong font / weight
rg -n 'compass-text|compass-display|font-variation-settings' src   #  6 legacy serif classes
rg -n '\brounded\b[^-]|rounded-\[|rounded-md|rounded-3xl|rounded-4xl' src   #  7 off-scale radius
rg -n 'rounded-2xl' src --glob '!src/components/ui/**'             #  8 2xl is for overlays only
rg -n 'border-dashed|outline-dashed' src --glob '!src/components/surface.tsx'   #  9 dashed lines
rg -n '#[0-9a-fA-F]{3,8}\b' src --glob '*.tsx'                     # 10 raw hex colours
rg -n 'shadow-\[|shadow-black|drop-shadow' src --glob '!src/components/ui/kbd.tsx'   # 11 off-token shadows
rg -n 'transition-all'                                        src   # 12
rg -n 'outline-none|ring-ring/50|ring-3|focus-visible:ring' src --glob '!src/components/ui/textarea.tsx'   # 13 focus
rg -n 'ring-foreground/10|bg-card/60|bg-muted/(30|40|50)'     src   # 14 legacy surfaces
rg -n 'title=' src --glob '*.tsx' | rg -v 'PageHeader|StepHeader|SectionHeader|RailSection|EmptyState|Callout|BoardColumn|StatCell|CardTitle|GroupLabel|Title'   # 15 review: native title= on elements
rg -n 'bg-destructive([^-]|$)'                                src   # 16 destructive used as a fill
rg -n 'text-destructive' src/components/task-row.tsx src/components/today src/components/week   # 17 lateness/capacity in red
rg -n 'text-primary([^-]|$)'                                  src   # 18 teal fill token used as text
rg -n 'bg-q1' src/components/week                                  # 19 Q1 used as "now"
rg -n 'opacity-(25|30|50|60|70)' src --glob '!src/components/ui/**'   # 20 opacity as state (Insights isPlaceholderData opacity-60 is the one exception)
rg -n 'max-w-\[1500px\]|min-w-\[760px\]'                      src   # 21 old widths
rg -n 'top-\[[0-9]+vh\]|sm:justify-between' src --glob '!src/components/ui/**'   # 22 dialog hacks
rg -no 'grid-cols-\[[^]]*\]' src | rg '[_\[][0-9.]*fr'             # 23 grid track without minmax(0,…)
rg -n '<kbd' src --glob '!src/components/ui/kbd.tsx'               # 24 raw kbd
rg -n 'animate-in|zoom-in|slide-in-from|fade-in-0' src/components/ui   # 25 tw-animate on overlays
rg -n 'shimmer|animate-pulse'                                 src   # 26 skeleton effects
rg -n 'size-2\.5|size-3([^.0-9]|$)' src --glob '!src/components/{chip,done-check,badges}.tsx'   # 27 review: icons may not use these (dots may)
rg -nP '\bvoice(-sm|-lg)?(?![-\w])[^"]*\btext-(2xs|xs|sm|md|base|lg|xl)\b|\btext-(2xs|xs|sm|md|base|lg|xl)\b[^"]*\bvoice(-sm|-lg)?(?![-\w])' src   # 28 voice + size together
rg -n 'color-mix\(in[ _]oklch'                                src   # 29 hue-rotating mixes
rg -n 'size="icon' src --glob '!src/components/ui/**' | rg -v 'aria-label|IconButton'   # 30 review: icon-only buttons need a name
```

| # | Replace with |
|---|---|
| 1, 2 | a scale step (`text-2xs` is the 12px floor), or the Input/Textarea `voice` prop |
| 3 | `text-foreground`, `text-muted-foreground` or `text-faint-foreground` |
| 4 | sentence case, `text-xs font-medium text-muted-foreground` |
| 5 | Geist with `tabular-nums`; `font-semibold`; `voice-display` |
| 6 | `voice-sm`, `voice`, `voice-lg`, `voice-display` (the aliases are deleted in 11d) |
| 7, 8 | the radius jobs in §4.2 (`rounded-xl` for in-page cards) |
| 9 | `dropZone()`, `dragSource`, or nothing |
| 10 | tokens; `SAW_ROLE_COLOR`; stored role colours come from data |
| 11 | `shadow-xs…2xl` |
| 12 | an explicit `transition-[…]` |
| 13 | the global focus outline, `focus-ring-inset` or `focus-field` |
| 14 | `ring-edge`, or a surface per §4.3 |
| 15 | `IconButton`, or a Tooltip plus `aria-label` (SVG `<title>` and component `title` props are fine) |
| 16 | `bg-destructive-solid` (fill) or `bg-destructive-soft` (tint) |
| 17 | `text-warning` plus an icon |
| 18 | `text-primary-ink` (links, icons) or ink |
| 19 | `bg-primary` |
| 20 | tokens; opacity is allowed only as `disabled:opacity-45` and inside `dragSource` |
| 21 | `max-w-8xl`; the `--week-cols` template |
| 22 | `placement="top"`; `DialogFooter start` |
| 23 | `minmax(0,1fr)` |
| 24 | `Kbd` |
| 25 | `popupMotion` / `tooltipMotion` |
| 26 | `Skeleton` (`animate-skeleton`) |
| 27 | icon sizes per §5 |
| 28 | never both on one element |
| 29 | `in oklab` / `in_oklab`, or mix with `white`, `black` or `transparent` |
| 30 | add `aria-label`, or use `IconButton` |

**Allowed durations:** 80, 100 (command palette only), 120, 150, 180, 240, 320, 480. Timers driven by `useNow` are not CSS and are unaffected.

### 11d. Phase 3: sweep and QA (one engineer, after phase 2)

1. Delete the `.compass-text`/`.compass-display` aliases from `index.css` once `rg -n 'compass-text|compass-display' src` is empty.
2. Run every §11c grep across the whole of `src`.
3. Walk the QA matrix for every route: light and dark × 1440, 768 and 375 (and 320) × mouse and touch emulation × reduced motion × keyboard only. Check the §9 checklist.
4. Retune any fixed-height container broken by `text-xs` = 13px.
5. Verify the dnd lift, placeholder ghost and drop animations on Today, Week and Matrix.

---

## 12. Product rules and "do not change behaviour"

### Product rules this system enforces

- **Quadrant colours** are for fills, dots, bars, top rules and selected rings only. Text on or beside them stays ink (`text-foreground`/`text-muted-foreground`). The validated hexes (`#eb6834 #1baf7a #eda100 #4a3aa7`, dark `#d95926 #199e70 #c98500 #9085e9`) never change. Every dot of 12px or less has `ring-dot-ring` and a label.
- **A planned day is never "overdue".**
  - `scheduledDate` renders as neutral meta ("Thu"), never warning or red, and has no opacity or "late" styling.
  - Only a **due date** can show lateness: `text-warning` plus `CalendarClock` with the existing copy.
- **No guilt:**
  - Red (`destructive*`) is only for delete, remove and errors.
  - Missed challenge days are hatched neutral. Carried rocks, "not done", unscheduled ("Not placed yet") and skipped blocks are neutral. Over-capacity and the 30-minute plan timer are amber.
  - "I chose a higher value" shows as **kept**, with the same success check as done.
  - A due check-in is an invitation (`primary-soft`), not lateness.
- **Teal is never a category colour. Q2 green is never an action colour.** The only green reward is the rare bloom.
- **Role colours stay as stored.** Legibility adjustments happen only at render time through `role-scope` (`--role-ink`, `--role-tint`).
- **All guidance, empty-state and hint copy is original wording.** Never paste text from the book. This spec adds only structural labels ("Step 2 of 5", "Not agreed yet", "Not placed yet", "Drag a task here, or add one below.", the RootError line).
- **Data safety flows are unchanged:** import runs in one transaction behind AlertDialog → export first → import. Restyle only.

### Do not change behaviour

This is a visual overhaul. For every file you touch:

- **Drag and drop:**
  - Keep every dnd id, `type`, `accept`, `data`, `collisionDetector` and `collisionPriority`, and every `ref`, `handleRef` and `sourceRef` placement:
    - `prio:${date}`, `grid:${date}`, `"tray"`, `goal:`/`dayitem:`/`block:` prefixes
    - `"inbox"`, `` `q${q}` ``
    - the priority group keys `"A" | "B" | "C" | "none"`
  - Keep `cardSensors`, every `data-no-drag`, the `draggingId` comparisons, the column registry (`registerColumn`), the grab-offset maths, `SNAP_MIN`, `layoutLanes`, click-to-create on empty time (`e.target === e.currentTarget`, so decorations stay `pointer-events-none`), the resize handlers and optimistic `patchBoard`/`setQueryData`.
  - The registered day-column element stays exactly the timed area (no padding or offset), and the sticky week header stays inside the scroll container.
- **ARIA and keyboard:**
  - Keep every existing `aria-label`, `aria-current`, `aria-pressed`, `role`, `sr-only` title and `type="button"`.
  - Keep hotkeys (`n`, `mod+k`, Escape in Focus mode, Ctrl/⌘+B), Enter-to-submit in Capture, and Enter-blur-to-save fields.
  - Additions this spec requires (labels, `htmlFor`, tooltips) are allowed. Removals are not.
- **Data flow:**
  - Keep every mutation, query, handler and condition, and the `useApiMutation` invalidation.
  - Keep `useAutosave` delays and keys; editors still mount only after `isFetchedAfterMount`.
  - Keep remount keys (`key={taskId}`, `key={date}`, `` key={`${challenge.id}-${date}`} ``, `key={draft.id ?? …}`, `key={JSON.stringify(capture.prefill)}`, `key={i}` in Welcome).
  - Tab panels stay unmounted when hidden (no `keepMounted`).
- **Routes:**
  - Keep routes, `validateSearch`, URL tab values, redirects and `beforeLoad` guards.
  - `SidebarMenuBadge` stays the next sibling of `SidebarMenuButton`, and `closeOnMobile` stays on every link.
- **Scope:** don't add dependencies (everything here uses the installed stack). Don't add features beyond the named accessibility fixes (§7.6). Don't touch `server/`, `api/`, `shared/` (except `SAW_ROLE_COLOR`) or `tests/`.
- **When in doubt,** style the existing element instead of restructuring it, and ask the lead before changing anything a user can observe other than its look.
