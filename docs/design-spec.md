# Design Specification - Planloo

**Version:** 1.0
**Date:** 2026-02-02
**Author:** UI/UX Designer Agent
**Status:** Draft

---

## Table of Contents

1. [Design Philosophy & Principles](#design-philosophy--principles)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Spacing & Layout](#spacing--layout)
5. [Component Guidelines](#component-guidelines)
6. [Key Page Layouts](#key-page-layouts)
7. [User Journey Flows](#user-journey-flows)
8. [Responsive Behavior](#responsive-behavior)
9. [Accessibility](#accessibility)
10. [Implementation Notes](#implementation-notes)

---

## Design Philosophy & Principles

### Overall Aesthetic Direction

Planloo's design embraces a **clean, professional, and trustworthy** aesthetic that balances sophistication with approachability. The interface should feel modern without being trendy, empowering users to focus on their event planning tasks without visual distraction.

**Key Characteristics:**
- **Clean:** Generous whitespace, clear visual hierarchy, uncluttered layouts
- **Professional:** Polished typography, consistent spacing, refined color palette
- **Readable:** High contrast ratios, appropriate font sizes, clear content structure
- **Trustworthy:** Stable UI patterns, predictable interactions, clear feedback

### Design Principles

#### 1. User-Centered Clarity
Every design decision prioritizes user understanding. Complex event data should be presented in digestible, scannable formats with clear visual hierarchies.

#### 2. Progressive Disclosure
Show users what they need, when they need it. Advanced features and secondary actions remain accessible but don't clutter primary workflows.

#### 3. Consistent & Predictable
Reuse patterns across the application. Users should learn once and apply everywhere - from button styles to form layouts to navigation patterns.

#### 4. Performance-Informed Design
Design choices should support the technical performance goals (Lighthouse > 90). This means optimized images, purposeful animations, and efficient component patterns.

#### 5. Accessibility First
Design for all users from the start. Color contrast, keyboard navigation, screen reader support, and touch-friendly targets are requirements, not afterthoughts.

#### 6. Mobile-Responsive by Default
Every component and layout must work seamlessly across devices, with mobile experiences as polished as desktop.

---

## Color System

### Primary Palette

The primary palette conveys trust, professionalism, and action. Blue is chosen for its universal association with reliability and calm focus.

**Primary Blue (Brand & Primary Actions)**
```css
primary-50:  #EFF6FF  /* Lightest - backgrounds, hover states */
primary-100: #DBEAFE  /* Light - subtle highlights */
primary-200: #BFDBFE  /* Badges, tags */
primary-300: #93C5FD  /* Disabled states */
primary-400: #60A5FA  /* Hover states */
primary-500: #3B82F6  /* Primary action color - buttons, links */
primary-600: #2563EB  /* Primary hover/active */
primary-700: #1D4ED8  /* Primary pressed */
primary-800: #1E40AF  /* Dark accents */
primary-900: #1E3A8A  /* Darkest - text on light backgrounds */
```

**Usage Guidelines:**
- `primary-500` for primary buttons (bg), active nav items, important links, icon button default color
- `primary-600` for primary button bg, ghost/icon button text color, focus rings
- `primary-700` for primary button hover, secondary button text color, ghost hover text
- `primary-800` for active/pressed states on ghost/icon buttons
- `primary-300` for secondary button border (default)
- `primary-400` for secondary button border (hover)
- `primary-50` for hover backgrounds on secondary/ghost/icon buttons
- `primary-100` for active/pressed backgrounds on secondary/ghost/icon buttons

### Secondary Palette

**Violet (Accent & Special Features)**
```css
secondary-50:  #F5F3FF  /* Light backgrounds */
secondary-100: #EDE9FE
secondary-200: #DDD6FE
secondary-300: #C4B5FD
secondary-400: #A78BFA
secondary-500: #8B5CF6  /* Secondary buttons, special callouts */
secondary-600: #7C3AED  /* Secondary hover */
secondary-700: #6D28D9  /* Secondary pressed */
secondary-800: #5B21B6
secondary-900: #4C1D95
```

**Usage Guidelines:**
- Use sparingly for special features, premium indicators, or accent elements
- `secondary-500` for secondary action buttons
- `secondary-100` for feature callout backgrounds

### Neutral Palette (Grays)

```css
gray-50:  #F9FAFB  /* Page backgrounds */
gray-100: #F3F4F6  /* Card backgrounds, subtle dividers */
gray-200: #E5E7EB  /* Borders, disabled backgrounds */
gray-300: #D1D5DB  /* Disabled borders, subtle text */
gray-400: #9CA3AF  /* Placeholder text, icons */
gray-500: #6B7280  /* Secondary text, less important info */
gray-600: #4B5563  /* Body text */
gray-700: #374151  /* Primary text */
gray-800: #1F2937  /* Headings */
gray-900: #111827  /* Primary headings, emphasis */
```

**Usage Guidelines:**
- `gray-50` for main page background
- `gray-100` for card backgrounds
- `gray-200` for borders, input outlines
- `gray-600` for body text
- `gray-800` for headings

### Semantic Colors

**Success (Green)**
```css
success-50:  #F0FDF4
success-500: #10B981  /* Success messages, confirmations */
success-600: #059669  /* Success button hover */
success-700: #047857  /* Success button active */
```

**Warning (Amber)**
```css
warning-50:  #FFFBEB
warning-500: #F59E0B  /* Warnings, caution messages */
warning-600: #D97706
warning-700: #B45309
```

**Error (Red)**
```css
error-50:  #FEF2F2
error-500: #EF4444  /* Error messages, destructive actions */
error-600: #DC2626  /* Error button hover */
error-700: #B91C1C  /* Error button active */
```

**Info (Cyan)**
```css
info-50:  #ECFEFF
info-500: #06B6D4  /* Info messages, tips */
info-600: #0891B2
info-700: #0E7490
```

### Dark Mode Palette

While dark mode is P2 (future), here's the proposed palette:

```css
dark-bg-primary:   #0F172A  /* Main background */
dark-bg-secondary: #1E293B  /* Card backgrounds */
dark-bg-tertiary:  #334155  /* Elevated surfaces */
dark-text-primary: #F1F5F9  /* Primary text */
dark-text-secondary: #94A3B8  /* Secondary text */
dark-border: #334155  /* Borders */
```

### Color Usage Rules

1. **Contrast Requirements:** All text must meet WCAG AA standards (4.5:1 for normal text, 3:1 for large text)
2. **Never Use Color Alone:** Always pair color with icons, text, or patterns for state indication
3. **Consistent Mapping:** Success = green, warning = amber, error = red, info = cyan (never deviate)
4. **Limited Palette:** Use only the defined colors; avoid creating new shades
5. **Buttons vs. Text Separation:** All interactive buttons use the primary blue palette (text, backgrounds, borders) to clearly distinguish them from body content, which uses the gray palette. Buttons should never use gray-600/700 for their text color, as those are reserved for body copy and headings.

---

## Typography

### Font Families

**Sans-Serif (Primary)**
```css
font-family-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI',
                  'Roboto', 'Helvetica Neue', Arial, sans-serif;
```
- **Usage:** Body text, UI elements, most content
- **CDN:** Google Fonts or self-hosted
- **Weights:** 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold)

**Heading Font**
```css
font-family-heading: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI',
                     'Roboto', 'Helvetica Neue', Arial, sans-serif;
```
- **Usage:** Page headings (h1, h2), marketing content
- **Weights:** 600 (Semibold), 700 (Bold)

**Monospace**
```css
font-family-mono: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
```
- **Usage:** Code snippets, technical data, UUIDs
- **Weight:** 400 (Regular)

### Type Scale

Mobile-first approach with responsive scaling:

**Display (Marketing Pages Only)**
```css
.text-display {
  font-size: 3rem;      /* 48px */
  line-height: 1.1;
  font-weight: 700;
  letter-spacing: -0.02em;
}

@media (min-width: 768px) {
  .text-display {
    font-size: 4.5rem;  /* 72px */
  }
}
```

**H1 (Page Titles)**
```css
.text-h1 {
  font-size: 2rem;      /* 32px mobile */
  line-height: 1.25;
  font-weight: 700;
  font-family: var(--font-heading);
  letter-spacing: -0.01em;
}

@media (min-width: 768px) {
  .text-h1 {
    font-size: 2.5rem;  /* 40px desktop */
  }
}
```

**H2 (Section Headings)**
```css
.text-h2 {
  font-size: 1.5rem;    /* 24px mobile */
  line-height: 1.33;
  font-weight: 600;
  font-family: var(--font-heading);
}

@media (min-width: 768px) {
  .text-h2 {
    font-size: 1.875rem; /* 30px desktop */
  }
}
```

**H3 (Subsection Headings)**
```css
.text-h3 {
  font-size: 1.25rem;   /* 20px */
  line-height: 1.4;
  font-weight: 600;
  font-family: var(--font-heading);
}

@media (min-width: 768px) {
  .text-h3 {
    font-size: 1.5rem;  /* 24px desktop */
  }
}
```

**H4 (Card Headings)**
```css
.text-h4 {
  font-size: 1.125rem;  /* 18px */
  line-height: 1.5;
  font-weight: 600;
}
```

**Body Large**
```css
.text-body-lg {
  font-size: 1.125rem;  /* 18px */
  line-height: 1.667;   /* 30px */
  font-weight: 400;
}
```

**Body (Default)**
```css
.text-body {
  font-size: 1rem;      /* 16px */
  line-height: 1.5;     /* 24px */
  font-weight: 400;
}
```

**Body Small**
```css
.text-body-sm {
  font-size: 0.875rem;  /* 14px */
  line-height: 1.43;    /* 20px */
  font-weight: 400;
}
```

**Caption**
```css
.text-caption {
  font-size: 0.75rem;   /* 12px */
  line-height: 1.33;    /* 16px */
  font-weight: 400;
  color: var(--gray-500);
}
```

**Overline (Labels, Metadata)**
```css
.text-overline {
  font-size: 0.75rem;   /* 12px */
  line-height: 1.33;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
```

### Typography Usage Guidelines

1. **Hierarchy:** Maintain clear hierarchy - only one h1 per page
2. **Line Length:** Limit body text to 65-75 characters per line for readability
3. **Emphasis:** Use font weight for emphasis, not italic (except for quotes)
4. **Links:** Underline links in body text; use color + hover state in UI elements
5. **Responsive Scaling:** Allow type to scale at breakpoints, but never below 16px for body text

---

## Spacing & Layout

### Spacing Scale

Based on 4px base unit for consistency:

```css
spacing-0:   0       /* 0px */
spacing-1:   0.25rem /* 4px */
spacing-2:   0.5rem  /* 8px */
spacing-3:   0.75rem /* 12px */
spacing-4:   1rem    /* 16px */
spacing-5:   1.25rem /* 20px */
spacing-6:   1.5rem  /* 24px */
spacing-8:   2rem    /* 32px */
spacing-10:  2.5rem  /* 40px */
spacing-12:  3rem    /* 48px */
spacing-16:  4rem    /* 64px */
spacing-20:  5rem    /* 80px */
spacing-24:  6rem    /* 96px */
spacing-32:  8rem    /* 128px */
```

**Common Usage:**
- `spacing-2` (8px): Icon-to-text spacing, tight element spacing
- `spacing-4` (16px): Default element spacing, form field vertical spacing
- `spacing-6` (24px): Component internal padding, card padding (mobile)
- `spacing-8` (32px): Section spacing (mobile), card padding (desktop)
- `spacing-12` (48px): Section spacing (desktop)
- `spacing-16` (64px): Major section divisions
- `spacing-24` (96px): Page section spacing (desktop)

### Grid System

**12-Column Grid**
```css
.container {
  max-width: 1280px;
  margin: 0 auto;
  padding-left: 1rem;   /* 16px mobile */
  padding-right: 1rem;
}

@media (min-width: 768px) {
  .container {
    padding-left: 2rem;  /* 32px tablet+ */
    padding-right: 2rem;
  }
}

@media (min-width: 1024px) {
  .container {
    padding-left: 3rem;  /* 48px desktop */
    padding-right: 3rem;
  }
}
```

**Grid Columns:**
- Mobile (< 768px): Single column or 2-column layouts
- Tablet (768px - 1023px): 2-4 column layouts
- Desktop (1024px+): 3-4 column layouts, with 12-column flexibility

### Container Widths

```css
container-sm:  640px   /* Forms, narrow content */
container-md:  768px   /* Article content, modals */
container-lg:  1024px  /* Dashboard layouts */
container-xl:  1280px  /* Maximum width (default) */
container-2xl: 1536px  /* Wide marketing pages (rare) */
```

**Page-Specific Containers:**
- **Marketing pages:** `container-xl` (1280px)
- **Dashboard:** `container-xl` (1280px) with sidebar
- **Forms:** `container-sm` (640px) centered
- **Event detail:** `container-lg` (1024px)
- **Modals:** `container-md` (768px)

### Breakpoints

```css
/* Mobile-first approach */
sm:  640px   /* Small tablets */
md:  768px   /* Tablets */
lg:  1024px  /* Small desktops */
xl:  1280px  /* Desktops */
2xl: 1536px  /* Large desktops */
```

**Key Breakpoint Behaviors:**
- **< 640px:** Mobile layout, single column, hamburger menu
- **640px - 767px:** Small tablet, 2-column where appropriate
- **768px - 1023px:** Tablet, 2-3 column layouts, expanded navigation
- **1024px+:** Desktop, full multi-column layouts, sidebar navigation

### Border Radius

```css
rounded-none: 0
rounded-sm:   0.125rem  /* 2px - subtle rounding */
rounded:      0.25rem   /* 4px - default for buttons, inputs */
rounded-md:   0.375rem  /* 6px - cards, panels */
rounded-lg:   0.5rem    /* 8px - modals, large cards */
rounded-xl:   0.75rem   /* 12px - hero sections */
rounded-2xl:  1rem      /* 16px - images, media */
rounded-full: 9999px    /* Pills, avatars */
```

### Shadows

```css
shadow-sm:   0 1px 2px 0 rgb(0 0 0 / 0.05);
shadow:      0 1px 3px 0 rgb(0 0 0 / 0.1),
             0 1px 2px -1px rgb(0 0 0 / 0.1);
shadow-md:   0 4px 6px -1px rgb(0 0 0 / 0.1),
             0 2px 4px -2px rgb(0 0 0 / 0.1);
shadow-lg:   0 10px 15px -3px rgb(0 0 0 / 0.1),
             0 4px 6px -4px rgb(0 0 0 / 0.1);
shadow-xl:   0 20px 25px -5px rgb(0 0 0 / 0.1),
             0 8px 10px -6px rgb(0 0 0 / 0.1);
shadow-2xl:  0 25px 50px -12px rgb(0 0 0 / 0.25);
```

**Usage:**
- `shadow-sm`: Subtle card separation
- `shadow`: Default cards, dropdowns
- `shadow-md`: Hover states, active cards
- `shadow-lg`: Modals, popovers
- `shadow-xl`: Fixed headers/footers, prominent overlays

---

## Component Guidelines

### Buttons

#### Primary Button

**Visual Spec:**
```css
.btn-primary {
  background: #2563EB;        /* primary-600 */
  color: #FFFFFF;
  padding: 0.625rem 1.25rem;  /* 10px 20px */
  font-size: 0.875rem;        /* 14px */
  font-weight: 600;
  border-radius: 0.375rem;    /* 6px */
  border: none;
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  transition: all 150ms ease-in-out;
  cursor: pointer;
  min-height: 44px;           /* Touch-friendly */
}

.btn-primary:hover {
  background: #1D4ED8;        /* primary-700 */
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  transform: translateY(-1px);
}

.btn-primary:active {
  background: #1E40AF;        /* primary-800 */
  transform: translateY(0);
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
}

.btn-primary:disabled {
  background: #93C5FD;        /* primary-300 */
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

.btn-primary:focus-visible {
  outline: 2px solid #2563EB;
  outline-offset: 2px;
}
```

**Large Variant:**
```css
.btn-primary-lg {
  padding: 0.875rem 1.75rem;  /* 14px 28px */
  font-size: 1rem;            /* 16px */
  min-height: 48px;
}
```

**Small Variant:**
```css
.btn-primary-sm {
  padding: 0.5rem 1rem;       /* 8px 16px */
  font-size: 0.8125rem;       /* 13px */
  min-height: 36px;
}
```

#### Secondary Button

```css
.btn-secondary {
  background: #FFFFFF;
  color: #1D4ED8;             /* primary-700 — distinct from gray body text */
  padding: 0.625rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  border-radius: 0.375rem;
  border: 1px solid #93C5FD;  /* primary-300 — blue-tinted border */
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  transition: all 150ms ease-in-out;
  cursor: pointer;
  min-height: 44px;
}

.btn-secondary:hover {
  background: #EFF6FF;        /* primary-50 */
  border-color: #60A5FA;      /* primary-400 */
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}

.btn-secondary:active {
  background: #DBEAFE;        /* primary-100 */
  border-color: #3B82F6;      /* primary-500 */
}

.btn-secondary:disabled {
  background: #F9FAFB;        /* gray-50 */
  color: #BFDBFE;             /* primary-200 — faded blue */
  cursor: not-allowed;
  border-color: #DBEAFE;      /* primary-100 */
}
```

#### Destructive Button

```css
.btn-danger {
  background: #DC2626;        /* error-600 */
  color: #FFFFFF;
  /* Same sizing as primary */
}

.btn-danger:hover {
  background: #B91C1C;        /* error-700 */
}
```

#### Ghost Button

```css
.btn-ghost {
  background: transparent;
  color: #2563EB;             /* primary-600 — blue text signals interactivity */
  padding: 0.625rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  border-radius: 0.375rem;
  border: none;
  transition: all 150ms ease-in-out;
  cursor: pointer;
  min-height: 44px;
}

.btn-ghost:hover {
  background: #EFF6FF;        /* primary-50 — light blue tint */
  color: #1D4ED8;             /* primary-700 */
}

.btn-ghost:active {
  background: #DBEAFE;        /* primary-100 */
  color: #1E40AF;             /* primary-800 */
}
```

#### Icon Button

```css
.btn-icon {
  background: transparent;
  color: #3B82F6;             /* primary-500 — blue icons for clear interactivity */
  padding: 0.5rem;            /* 8px */
  border-radius: 0.375rem;
  border: none;
  transition: all 150ms ease-in-out;
  cursor: pointer;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover {
  background: #EFF6FF;        /* primary-50 */
  color: #1D4ED8;             /* primary-700 */
}

.btn-icon:active {
  background: #DBEAFE;        /* primary-100 */
  color: #1E40AF;             /* primary-800 */
}
```

**Accessibility Requirements:**
- All buttons must have visible focus indicators
- Icon-only buttons require `aria-label`
- Disabled buttons must have `aria-disabled="true"`
- Loading buttons show spinner with `aria-busy="true"`

### Form Elements

#### Text Input

```css
.input {
  width: 100%;
  padding: 0.625rem 0.875rem;  /* 10px 14px */
  font-size: 0.875rem;         /* 14px */
  line-height: 1.5;
  color: #1F2937;              /* gray-800 */
  background: #FFFFFF;
  border: 1px solid #D1D5DB;   /* gray-300 */
  border-radius: 0.375rem;     /* 6px */
  transition: all 150ms ease-in-out;
  min-height: 44px;            /* Touch-friendly */
}

.input::placeholder {
  color: #9CA3AF;              /* gray-400 */
}

.input:hover {
  border-color: #9CA3AF;       /* gray-400 */
}

.input:focus {
  outline: none;
  border-color: #2563EB;       /* primary-600 */
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.input:disabled {
  background: #F9FAFB;         /* gray-50 */
  color: #9CA3AF;
  cursor: not-allowed;
}

.input-error {
  border-color: #DC2626;       /* error-600 */
}

.input-error:focus {
  border-color: #DC2626;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
}
```

#### Label

```css
.label {
  display: block;
  font-size: 0.875rem;         /* 14px */
  font-weight: 500;
  color: #374151;              /* gray-700 */
  margin-bottom: 0.375rem;     /* 6px */
}

.label-required::after {
  content: ' *';
  color: #DC2626;              /* error-600 */
}
```

#### Helper Text

```css
.helper-text {
  font-size: 0.75rem;          /* 12px */
  color: #6B7280;              /* gray-500 */
  margin-top: 0.375rem;        /* 6px */
}

.error-text {
  font-size: 0.75rem;
  color: #DC2626;              /* error-600 */
  margin-top: 0.375rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
```

#### Select Dropdown

```css
.select {
  /* Same base styles as .input */
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E");
  background-position: right 0.5rem center;
  background-repeat: no-repeat;
  background-size: 1.5em 1.5em;
  padding-right: 2.5rem;
  appearance: none;
}
```

#### Checkbox

```css
.checkbox {
  width: 1.125rem;             /* 18px */
  height: 1.125rem;
  border: 1px solid #D1D5DB;   /* gray-300 */
  border-radius: 0.25rem;      /* 4px */
  background: #FFFFFF;
  cursor: pointer;
  transition: all 150ms ease-in-out;
}

.checkbox:checked {
  background: #2563EB;         /* primary-600 */
  border-color: #2563EB;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3E%3C/svg%3E");
}

.checkbox:focus-visible {
  outline: 2px solid #2563EB;
  outline-offset: 2px;
}
```

#### Radio Button

```css
.radio {
  width: 1.125rem;
  height: 1.125rem;
  border: 1px solid #D1D5DB;
  border-radius: 50%;
  background: #FFFFFF;
  cursor: pointer;
  transition: all 150ms ease-in-out;
}

.radio:checked {
  border-color: #2563EB;
  border-width: 5px;
}
```

#### Toggle Switch

```css
.toggle {
  position: relative;
  width: 2.75rem;              /* 44px */
  height: 1.5rem;              /* 24px */
  background: #D1D5DB;         /* gray-300 */
  border-radius: 9999px;
  cursor: pointer;
  transition: background 150ms ease-in-out;
}

.toggle::after {
  content: '';
  position: absolute;
  top: 0.125rem;               /* 2px */
  left: 0.125rem;
  width: 1.25rem;              /* 20px */
  height: 1.25rem;
  background: #FFFFFF;
  border-radius: 50%;
  transition: transform 150ms ease-in-out;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.toggle:checked {
  background: #2563EB;         /* primary-600 */
}

.toggle:checked::after {
  transform: translateX(1.25rem); /* 20px */
}
```

### Cards

#### Basic Card

```css
.card {
  background: #FFFFFF;
  border: 1px solid #E5E7EB;   /* gray-200 */
  border-radius: 0.5rem;       /* 8px */
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  padding: 1.5rem;             /* 24px */
  transition: all 150ms ease-in-out;
}

@media (min-width: 768px) {
  .card {
    padding: 2rem;             /* 32px */
  }
}

.card-hover:hover {
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  transform: translateY(-2px);
}
```

#### Card Header

```css
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #E5E7EB;
}

.card-title {
  font-size: 1.125rem;         /* 18px */
  font-weight: 600;
  color: #111827;              /* gray-900 */
}

.card-description {
  font-size: 0.875rem;         /* 14px */
  color: #6B7280;              /* gray-500 */
  margin-top: 0.25rem;
}
```

#### Event Card (Specific)

```css
.event-card {
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 0.5rem;
  overflow: hidden;
  transition: all 150ms ease-in-out;
}

.event-card:hover {
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  transform: translateY(-4px);
}

.event-card-image {
  width: 100%;
  height: 12rem;               /* 192px */
  object-fit: cover;
}

.event-card-content {
  padding: 1.5rem;
}

.event-card-title {
  font-size: 1.25rem;          /* 20px */
  font-weight: 600;
  color: #111827;
  margin-bottom: 0.5rem;
}

.event-card-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: #6B7280;
  margin-bottom: 1rem;
}

.event-card-badge {
  display: inline-flex;
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  background: #DBEAFE;         /* primary-100 */
  color: #1E40AF;              /* primary-800 */
  border-radius: 9999px;
}
```

### Navigation

#### Header Navigation

```css
.header {
  background: #FFFFFF;
  border-bottom: 1px solid #E5E7EB;
  position: sticky;
  top: 0;
  z-index: 50;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.05);
}

.header-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-logo {
  font-size: 1.5rem;
  font-weight: 700;
  color: #2563EB;              /* primary-600 */
  text-decoration: none;
}

.header-nav {
  display: none;
}

@media (min-width: 768px) {
  .header-nav {
    display: flex;
    gap: 2rem;
  }
}

.header-nav-link {
  font-size: 0.875rem;
  font-weight: 500;
  color: #4B5563;              /* gray-600 */
  text-decoration: none;
  padding: 0.5rem 0;
  border-bottom: 2px solid transparent;
  transition: all 150ms ease-in-out;
}

.header-nav-link:hover {
  color: #2563EB;
}

.header-nav-link-active {
  color: #2563EB;
  border-bottom-color: #2563EB;
}
```

#### Sidebar Navigation (Dashboard)

```css
.sidebar {
  width: 16rem;                /* 256px */
  background: #FFFFFF;
  border-right: 1px solid #E5E7EB;
  height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
  padding: 1.5rem 1rem;
  overflow-y: auto;
  display: none;
}

@media (min-width: 1024px) {
  .sidebar {
    display: block;
  }
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.sidebar-nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #4B5563;
  border-radius: 0.375rem;
  text-decoration: none;
  transition: all 150ms ease-in-out;
}

.sidebar-nav-item:hover {
  background: #F3F4F6;         /* gray-100 */
  color: #1F2937;
}

.sidebar-nav-item-active {
  background: #EFF6FF;         /* primary-50 */
  color: #2563EB;              /* primary-600 */
  font-weight: 600;
}

.sidebar-nav-icon {
  width: 1.25rem;
  height: 1.25rem;
}
```

#### Mobile Navigation

```css
.mobile-nav {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  background: #FFFFFF;
  z-index: 100;
  transform: translateX(-100%);
  transition: transform 250ms ease-in-out;
  padding: 1.5rem;
}

.mobile-nav-open {
  transform: translateX(0);
}

.mobile-nav-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F3F4F6;
  border-radius: 0.375rem;
  border: none;
  cursor: pointer;
}

.mobile-nav-links {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 4rem;
}

.mobile-nav-link {
  padding: 1rem;
  font-size: 1rem;
  font-weight: 500;
  color: #1F2937;
  text-decoration: none;
  border-radius: 0.5rem;
  transition: all 150ms ease-in-out;
}

.mobile-nav-link:hover {
  background: #F3F4F6;
}
```

### Modals & Dialogs

```css
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.modal {
  background: #FFFFFF;
  border-radius: 0.5rem;
  box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
  max-width: 32rem;            /* 512px */
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid #E5E7EB;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
}

.modal-close {
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 0.375rem;
  color: #6B7280;
  cursor: pointer;
  transition: all 150ms ease-in-out;
}

.modal-close:hover {
  background: #F3F4F6;
  color: #1F2937;
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  padding: 1.5rem;
  border-top: 1px solid #E5E7EB;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}
```

### Badges & Tags

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;    /* 4px 12px */
  font-size: 0.75rem;          /* 12px */
  font-weight: 600;
  border-radius: 9999px;
}

.badge-primary {
  background: #DBEAFE;         /* primary-100 */
  color: #1E40AF;              /* primary-800 */
}

.badge-success {
  background: #D1FAE5;         /* success-100 */
  color: #065F46;              /* success-800 */
}

.badge-warning {
  background: #FEF3C7;         /* warning-100 */
  color: #92400E;              /* warning-800 */
}

.badge-error {
  background: #FEE2E2;         /* error-100 */
  color: #991B1B;              /* error-800 */
}

.badge-gray {
  background: #F3F4F6;         /* gray-100 */
  color: #374151;              /* gray-700 */
}

.badge-dot::before {
  content: '';
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  margin-right: 0.375rem;
  background: currentColor;
}
```

### Tooltips & Popovers

```css
.tooltip {
  position: relative;
  display: inline-block;
}

.tooltip-content {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: #1F2937;         /* gray-800 */
  color: #FFFFFF;
  font-size: 0.75rem;
  border-radius: 0.375rem;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 150ms ease-in-out;
  z-index: 50;
}

.tooltip:hover .tooltip-content {
  opacity: 1;
}

.tooltip-content::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 4px solid transparent;
  border-top-color: #1F2937;
}
```

### Loading States

```css
.skeleton {
  background: linear-gradient(
    90deg,
    #F3F4F6 25%,
    #E5E7EB 50%,
    #F3F4F6 75%
  );
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
  border-radius: 0.25rem;
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.spinner {
  width: 1.5rem;
  height: 1.5rem;
  border: 2px solid #E5E7EB;
  border-top-color: #2563EB;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
```

### Alerts & Notifications

```css
.alert {
  padding: 1rem 1.25rem;
  border-radius: 0.5rem;
  display: flex;
  gap: 0.75rem;
  border-left: 4px solid;
}

.alert-info {
  background: #ECFEFF;          /* info-50 */
  border-color: #06B6D4;        /* info-500 */
  color: #0E7490;               /* info-700 */
}

.alert-success {
  background: #F0FDF4;          /* success-50 */
  border-color: #10B981;        /* success-500 */
  color: #047857;               /* success-700 */
}

.alert-warning {
  background: #FFFBEB;          /* warning-50 */
  border-color: #F59E0B;        /* warning-500 */
  color: #B45309;               /* warning-700 */
}

.alert-error {
  background: #FEF2F2;          /* error-50 */
  border-color: #EF4444;        /* error-500 */
  color: #B91C1C;               /* error-700 */
}

.alert-icon {
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
}

.alert-content {
  flex: 1;
}

.alert-title {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.alert-message {
  font-size: 0.875rem;
}
```

---

## Key Page Layouts

### 1. Homepage (Marketing/Landing)

**Layout Structure:**
```
┌─────────────────────────────────────┐
│  Header (sticky)                    │
├─────────────────────────────────────┤
│  Hero Section                       │
│  - Large headline                   │
│  - Subheadline                      │
│  - Primary CTA + Secondary CTA      │
│  - Hero image/illustration          │
├─────────────────────────────────────┤
│  Features Section                   │
│  - 3-column grid (desktop)          │
│  - Icon + Title + Description       │
├─────────────────────────────────────┤
│  How It Works                       │
│  - 3-step process                   │
│  - Visual timeline                  │
├─────────────────────────────────────┤
│  Social Proof                       │
│  - Testimonials carousel            │
│  - Client logos                     │
├─────────────────────────────────────┤
│  CTA Section                        │
│  - Strong call to action            │
│  - Sign up form                     │
├─────────────────────────────────────┤
│  Footer                             │
│  - Links, social, legal             │
└─────────────────────────────────────┘
```

**Hero Section Specs:**
- **Height:** Min 600px mobile, 700px desktop
- **Max width:** 1280px
- **Content width:** 600px (left-aligned)
- **Image:** Right-aligned, 50% width on desktop
- **Headline:** Display font, 48px mobile → 72px desktop
- **Subheadline:** 18px, gray-600, max-width 600px
- **CTA buttons:** Primary + ghost, 16px with generous padding
- **Background:** Subtle gradient from primary-50 to white

**Features Grid:**
- **Mobile:** Single column, stack
- **Tablet:** 2 columns
- **Desktop:** 3 columns
- **Card style:** Centered icon (primary-500), h3 title, body text
- **Spacing:** 48px vertical between cards (mobile), 32px gap (desktop)

### 2. Sign In / Sign Up Pages

**Layout Structure:**
```
┌─────────────────────────────────────┐
│  Minimal Header (logo only)         │
├─────────────────────────────────────┤
│                                     │
│         ┌───────────────┐           │
│         │  Auth Card    │           │
│         │  Max 440px    │           │
│         │               │           │
│         │  - Title      │           │
│         │  - Form       │           │
│         │  - Divider    │           │
│         │  - Social     │           │
│         │  - Link       │           │
│         └───────────────┘           │
│                                     │
└─────────────────────────────────────┘
```

**Auth Card Specs:**
- **Max width:** 440px
- **Padding:** 48px (desktop), 24px (mobile)
- **Background:** White card with shadow-lg
- **Border radius:** 12px
- **Center aligned:** Vertically and horizontally
- **Form spacing:** 24px between fields
- **Button:** Full width, 48px height
- **Social buttons:** Full width, ghost style with brand icons

**Sign In Form:**
1. Page title (h1): "Welcome back"
2. Email input with label
3. Password input with label + "Forgot password?" link
4. "Remember me" checkbox
5. Primary button: "Sign in"
6. Divider: "Or continue with"
7. Social login buttons (Google, GitHub)
8. Footer link: "Don't have an account? Sign up"

**Sign Up Form:**
1. Page title: "Create your account"
2. Name input
3. Email input
4. Password input (with strength indicator)
5. Confirm password input
6. Terms checkbox
7. Primary button: "Create account"
8. Social signup options
9. Footer link: "Already have an account? Sign in"

### 3. Dashboard Overview

**Layout Structure:**
```
┌──────┬──────────────────────────────┐
│      │  Header (breadcrumb, user)   │
│      ├──────────────────────────────┤
│      │  Page Title + Quick Actions  │
│ Side ├──────────────────────────────┤
│ bar  │  Stats Grid (4 cards)        │
│      ├──────────────────────────────┤
│ Nav  │  Recent Events (table/cards) │
│      ├──────────────────────────────┤
│      │  Upcoming Tasks              │
└──────┴──────────────────────────────┘
```

**Sidebar:**
- **Width:** 256px (desktop), hidden (mobile → hamburger)
- **Background:** White with border-right
- **Navigation sections:**
  - Dashboard
  - Events
  - Guests
  - Vendors
  - Venues
  - Budget
  - Settings

**Main Content Area:**
- **Left margin:** 256px (desktop with sidebar)
- **Padding:** 48px (desktop), 24px (mobile)
- **Max width:** 1280px

**Stats Grid:**
- **Layout:** 4 columns (desktop), 2 columns (tablet), 1 column (mobile)
- **Card style:** White background, border, shadow-sm
- **Card content:**
  - Icon (48px, primary-500 background circle)
  - Label (text-sm, gray-500)
  - Value (text-2xl, font-bold)
  - Change indicator (+5% in success/error color)
- **Cards:** Total Events, Active Events, Total Guests, Budget Utilization

**Recent Events:**
- **Desktop:** Table view with columns: Event Name, Date, Guests, Status, Actions
- **Mobile:** Card stack view
- **Max items:** 5 most recent
- **Link:** "View all events →"

**Upcoming Tasks:**
- **Layout:** List with checkboxes
- **Items:** Task name, due date, priority badge
- **Max items:** 5 upcoming
- **Link:** "View all tasks →"

### 4. Event Detail Page

**Layout Structure:**
```
┌─────────────────────────────────────┐
│  Breadcrumb Navigation              │
├─────────────────────────────────────┤
│  Event Header                       │
│  - Cover Image                      │
│  - Title, Date, Location            │
│  - Status Badge + Action Buttons    │
├─────────────────────────────────────┤
│  Tab Navigation                     │
│  [Overview][Guests][Budget][Vendors]│
├─────────────────────────────────────┤
│  Tab Content (Overview):            │
│  ┌──────────────┬─────────────────┐ │
│  │  Details     │  Quick Stats    │ │
│  │  Card        │  Sidebar        │ │
│  │              │                 │ │
│  │  Timeline    │  Recent         │ │
│  │  Card        │  Activity       │ │
│  └──────────────┴─────────────────┘ │
└─────────────────────────────────────┘
```

**Event Header:**
- **Cover image:** Full width, 300px height (desktop), 200px (mobile)
- **Image overlay:** Gradient from transparent to rgba(0,0,0,0.4)
- **Title:** h1 (40px), white text, positioned over image bottom
- **Meta info:** Date, time, location icons with text, white/90% opacity
- **Actions:** Positioned top-right: Edit, Share, Delete (icon buttons)
- **Status badge:** Top-left corner, elevated with shadow

**Tab Navigation:**
- **Style:** Border bottom, active tab has primary border-bottom
- **Tabs:** Overview, Guests, Budget, Vendors, Tasks
- **Mobile:** Scrollable horizontal tabs

**Overview Layout (2-column):**
- **Left column (66%):**
  - Event Details card (description, venue, capacity, type)
  - Event Timeline card (checklist with progress)
- **Right column (33%):**
  - Quick Stats (guests confirmed, budget used, days until event)
  - Recent Activity feed

### 5. Guest List View

**Layout Structure:**
```
┌─────────────────────────────────────┐
│  Page Title + "Add Guest" Button    │
├─────────────────────────────────────┤
│  Search + Filters + Export          │
├─────────────────────────────────────┤
│  Guest Table / Card Grid            │
│  - Name, Email, RSVP, Category      │
│  - Actions (Edit, Delete)           │
├─────────────────────────────────────┤
│  Pagination                         │
└─────────────────────────────────────┘
```

**Header Actions:**
- **Left:** Page title "Guest List" + guest count badge
- **Right:** Import CSV, Add Guest buttons
- **Spacing:** 48px bottom margin

**Filters Bar:**
- **Search:** Full-text search input (with icon)
- **Filters:** RSVP Status dropdown, Category dropdown, Sort dropdown
- **Export:** Export CSV button (secondary)
- **Layout:** Flexbox row, wrap on mobile

**Desktop Table:**
- **Columns:** Checkbox, Avatar/Name, Email, RSVP Status, Category, Plus One, Actions
- **Row height:** 64px
- **Hover state:** Gray-50 background
- **Checkbox:** Bulk select functionality
- **RSVP badges:** Color-coded (Confirmed: success, Declined: error, Pending: warning)

**Mobile Cards:**
- **Stack:** Vertical card list
- **Card content:** Avatar, name (bold), email, status badge, actions menu
- **Swipe actions:** Swipe left to reveal delete

**Pagination:**
- **Position:** Bottom center
- **Style:** Previous/Next buttons + page numbers
- **Items per page:** 25, 50, 100 options

### 6. Budget Tracker View

**Layout Structure:**
```
┌─────────────────────────────────────┐
│  Budget Overview Card               │
│  - Total Budget vs. Spent           │
│  - Progress Bar                     │
│  - Remaining Amount (large)         │
├─────────────────────────────────────┤
│  Budget Breakdown Chart             │
│  - Donut/Pie Chart by Category      │
├─────────────────────────────────────┤
│  Category List                      │
│  - Category, Budgeted, Actual, %    │
│  - Expandable for line items        │
├─────────────────────────────────────┤
│  Add Expense Button                 │
└─────────────────────────────────────┘
```

**Budget Overview Card:**
- **Prominent display:** Total budget in large text (36px)
- **Spent vs. remaining:** Side-by-side comparison
- **Progress bar:** Full width, color changes (green → yellow → red as % increases)
- **Warning state:** Red alert if over budget
- **Metrics:** Average cost per guest, largest expense category

**Budget Chart:**
- **Type:** Donut chart with center label showing total
- **Colors:** Distinct colors per category (max 8 categories)
- **Legend:** Below chart, clickable to filter
- **Mobile:** Chart reduces size, legend stacks

**Category List:**
- **Accordion style:** Expand to see individual expenses
- **Columns:** Category name, budgeted amount, actual spent, variance %, actions
- **Visual indicators:** Progress bars for each category
- **Row colors:** Green if under budget, red if over
- **Add line item:** Plus icon in each category row

**Add Expense Modal:**
- **Fields:** Category, vendor, description, amount, date, payment status
- **File upload:** Attach receipt/invoice
- **Actions:** Save, Save & Add Another, Cancel

---

## User Journey Flows

### Flow 1: Homepage → Sign Up → Onboarding

**Step 1: Homepage**
- User lands on homepage
- Sees hero with clear value proposition
- Primary CTA: "Get Started Free" (prominent, primary button)
- Secondary CTA: "See How It Works" (ghost button, scrolls to features)

**Step 2: Sign Up Page**
- Click "Get Started Free" → Navigate to `/register`
- Form appears: Name, Email, Password, Confirm Password
- Optional: Social signup (Google, GitHub) for faster registration
- Submit → Account created

**Step 3: Email Verification (Optional)**
- Success message: "Check your email to verify your account"
- User clicks link in email → Account verified

**Step 4: Onboarding Flow**
- **Welcome Screen:** "Welcome to Planloo, [Name]!"
- **Step 1:** "What type of event are you planning?" (Wedding, Birthday, Corporate, etc.)
- **Step 2:** "Tell us about your event" (Name, date, guest count estimate)
- **Step 3:** "Set your budget" (Optional, can skip)
- **Completion:** "You're all set!" → Redirect to dashboard

**Visual Design Notes:**
- Use progress indicator (3 dots, current highlighted)
- Each step on a centered card (max 600px)
- "Skip for now" link for optional steps
- Primary "Continue" button, secondary "Back" button

### Flow 2: Sign In → Dashboard → Create Event

**Step 1: Sign In**
- User navigates to `/login`
- Enters email + password OR uses social login
- Click "Sign in" → Authenticated

**Step 2: Dashboard Landing**
- If first time: Empty state with "Create your first event" CTA
- If returning: Dashboard with stats, recent events, upcoming tasks
- Prominent "New Event" button in header

**Step 3: Create Event**
- Click "New Event" → Modal or dedicated page (`/dashboard/events/new`)
- Form fields:
  - Event title (required)
  - Event type (dropdown: Wedding, Birthday, etc.)
  - Date & time (date picker)
  - Location (text input with optional map integration)
  - Expected guest count
  - Budget (optional)
  - Description (optional)
- Primary button: "Create Event"
- Secondary button: "Cancel"

**Step 4: Event Created**
- Success notification: "Event created successfully!"
- Redirect to event detail page
- Onboarding checklist appears:
  - Add guests
  - Set budget
  - Find vendors
  - Create timeline

**Visual Design Notes:**
- Empty state should be encouraging, not intimidating (illustration + helpful text)
- Form uses progressive disclosure (advanced options hidden initially)
- Validation is inline and real-time

### Flow 3: Dashboard → Event Detail → Manage Guests

**Step 1: Dashboard Event Selection**
- User clicks on event card or table row
- Navigate to `/dashboard/events/[uuid]`

**Step 2: Event Detail Overview**
- See event header with cover image, title, date
- Tab navigation: Overview selected by default
- Quick stats show current guest count

**Step 3: Navigate to Guests Tab**
- Click "Guests" tab
- Tab content switches to guest list view
- See current guest list (empty state if none)

**Step 4: Add Guest**
- Click "Add Guest" button (top-right)
- Modal appears with form:
  - First name (required)
  - Last name (required)
  - Email (required)
  - Phone (optional)
  - Category (dropdown: VIP, Family, Friends, etc.)
  - Plus one allowed (toggle)
  - Dietary restrictions (text area)
- Submit → Guest added to list

**Step 5: Send Invitations**
- Select guests via checkboxes
- Click "Send Invitations" button
- Confirmation modal: "Send invitations to X guests?"
- Confirm → Invitations sent, status changes to "Invited"

**Step 6: Track RSVPs**
- Guests receive email with RSVP link
- Guest clicks link → Public RSVP page
- Guest confirms/declines → Status updates in guest list
- Dashboard shows updated RSVP stats

**Visual Design Notes:**
- Empty state: "No guests yet" with illustration + "Add your first guest" CTA
- Bulk actions appear when checkboxes selected
- Guest list filters (RSVP status, category) for large lists
- Visual RSVP status with color-coded badges

---

## Responsive Behavior

### Mobile-First Approach

All designs start with mobile layout and progressively enhance for larger screens.

**Core Principles:**
1. **Touch-first:** All interactive elements min 44px × 44px
2. **Single column:** Stack content vertically on mobile
3. **Simplified navigation:** Hamburger menu, bottom nav, or tab bar
4. **Content priority:** Most important content first
5. **Performance:** Lazy load images, defer non-critical JS

### Breakpoint-Specific Behaviors

#### Mobile (< 640px)

**Navigation:**
- Hamburger menu icon (top-left or top-right)
- Full-screen overlay menu when opened
- Logo centered or left-aligned in header

**Layout:**
- Single column, full width with 16px padding
- Cards stack vertically with 16px gap
- Tables convert to card stack view
- Forms: single column, full width inputs

**Typography:**
- Slightly smaller headings (h1: 32px)
- Body text: 16px minimum
- Reduce line height slightly for space

**Components:**
- Buttons: full width or stacked
- Modals: full screen on very small devices
- Tabs: scrollable horizontal list

#### Tablet (640px - 1023px)

**Navigation:**
- May show condensed horizontal nav
- Or continue with hamburger for simplicity

**Layout:**
- 2-column grid for cards
- Tables: reduce columns, hide less important data
- Container: 32px horizontal padding
- Dashboard: sidebar hidden, hamburger menu

**Components:**
- Modals: centered, max 600px width
- Buttons: inline (not full width)
- Forms: may use 2-column layout for related fields

#### Desktop (1024px+)

**Navigation:**
- Full horizontal navigation OR
- Persistent sidebar navigation (dashboard)
- All nav items visible

**Layout:**
- Multi-column grids (3-4 columns)
- Sidebar + main content layout
- Tables: full column set
- Container: 48px horizontal padding, max 1280px

**Components:**
- Modals: centered, max 768px
- Hover states enabled
- Tooltips on icon buttons
- Keyboard shortcuts visible

### Device-Specific Patterns

#### Touch Devices (Mobile/Tablet)

**Gestures:**
- Swipe for carousels, image galleries
- Pull-to-refresh on lists
- Swipe actions on list items (delete, archive)
- Long-press for context menus

**Interactions:**
- No hover states (use active/pressed instead)
- Tap targets: 44px minimum
- Bottom sheet modals (instead of centered)
- Fixed action buttons at bottom

**Forms:**
- Appropriate input types (email, tel, number, date)
- Native date/time pickers
- Autocomplete enabled
- Clear buttons in inputs

#### Desktop

**Interactions:**
- Hover states on all interactive elements
- Cursor changes (pointer on buttons/links)
- Keyboard navigation fully supported
- Focus indicators for tab navigation

**Advanced Features:**
- Drag & drop for reordering
- Multi-select with Shift/Cmd+Click
- Right-click context menus
- Keyboard shortcuts (Cmd+K for search, etc.)

### Navigation Patterns Per Device

**Mobile Navigation Pattern:**
```
┌─────────────────────────────────┐
│ ☰  Planloo Logo         [User]  │ ← Header
└─────────────────────────────────┘
```
Tap hamburger → Full screen menu slides in from left

**Tablet Navigation Pattern:**
```
┌─────────────────────────────────┐
│ ☰  Planloo   Nav Items   [User] │
└─────────────────────────────────┘
```
Hamburger OR condensed horizontal nav

**Desktop Dashboard Pattern:**
```
┌──────┬──────────────────────────┐
│      │  Header + Breadcrumb     │
│ Side │                          │
│ bar  │  Main Content            │
│ Nav  │                          │
│      │                          │
└──────┴──────────────────────────┘
```
Persistent sidebar, full navigation visible

---

## Accessibility

### Color Contrast Requirements

All text and interactive elements must meet WCAG 2.1 AA standards:

**Text Contrast:**
- **Normal text (< 18px):** Minimum 4.5:1 contrast ratio
- **Large text (≥ 18px or ≥ 14px bold):** Minimum 3:1 contrast ratio
- **Non-text (icons, borders):** Minimum 3:1 contrast ratio

**Approved Text Combinations:**
```css
/* High contrast (AAA) */
gray-900 (#111827) on white → 16.9:1 ✓
primary-700 (#1D4ED8) on white → 8.3:1 ✓

/* AA compliant */
gray-700 (#374151) on white → 10.7:1 ✓
primary-600 (#2563EB) on white → 5.9:1 ✓
gray-600 (#4B5563) on white → 7.5:1 ✓

/* Avoid */
gray-400 (#9CA3AF) on white → 2.8:1 ✗ (fails AA)
primary-300 (#93C5FD) on white → 1.9:1 ✗ (fails AA)
```

**Interactive Element Contrast:**
- Button backgrounds vs. white: 3:1 minimum
- Form borders: 3:1 minimum
- Focus indicators: 3:1 minimum

### Focus States

**Keyboard Focus Indicator:**
```css
*:focus-visible {
  outline: 2px solid #2563EB;     /* primary-600 */
  outline-offset: 2px;
  border-radius: inherit;
}
```

**Focus Requirements:**
- All interactive elements must have visible focus indicator
- Focus order must follow logical reading order
- Skip links for keyboard users ("Skip to main content")
- Focus trap in modals (Tab cycles within modal)
- No focus on non-interactive elements

**Focus Management:**
- Opening modal: focus moves to first interactive element
- Closing modal: focus returns to trigger element
- Form submission error: focus moves to first error field
- Page navigation: focus moves to main heading

### Screen Reader Considerations

**Semantic HTML:**
```html
<!-- Use proper heading hierarchy -->
<h1>Dashboard</h1>
  <h2>Recent Events</h2>
    <h3>Event Name</h3>

<!-- Use semantic elements -->
<nav aria-label="Main navigation">
<main>
<aside aria-label="Filters">
<footer>
```

**ARIA Labels & Descriptions:**
```html
<!-- Icon-only buttons -->
<button aria-label="Delete guest">
  <TrashIcon />
</button>

<!-- Form inputs -->
<label for="email">Email address</label>
<input id="email" type="email" aria-describedby="email-hint" />
<span id="email-hint">We'll never share your email</span>

<!-- Status indicators -->
<span role="status" aria-live="polite">
  Guest added successfully
</span>

<!-- Loading states -->
<button aria-busy="true">
  <Spinner /> Loading...
</button>
```

**ARIA Roles:**
- `role="banner"` for header
- `role="navigation"` for nav
- `role="main"` for main content
- `role="complementary"` for sidebars
- `role="contentinfo"` for footer
- `role="dialog"` for modals
- `role="alert"` for urgent notifications
- `role="status"` for non-urgent updates

**Dynamic Content:**
- Use `aria-live="polite"` for status updates
- Use `aria-live="assertive"` for critical errors
- Update page title on route changes
- Announce page load completion

**Image Accessibility:**
```html
<!-- Decorative images -->
<img src="decoration.jpg" alt="" role="presentation" />

<!-- Informative images -->
<img src="event-photo.jpg" alt="Wedding ceremony at sunset beach" />

<!-- Complex images -->
<img src="budget-chart.png" alt="Budget breakdown chart"
     aria-describedby="chart-description" />
<div id="chart-description">
  Venue: $5000 (50%), Catering: $3000 (30%), Other: $2000 (20%)
</div>
```

**Keyboard Navigation:**
- Tab: Move to next interactive element
- Shift+Tab: Move to previous element
- Enter/Space: Activate buttons
- Escape: Close modals/dropdowns
- Arrow keys: Navigate lists, tabs, menus
- Home/End: Jump to start/end of lists

**Screen Reader Testing:**
- Test with NVDA (Windows)
- Test with JAWS (Windows)
- Test with VoiceOver (macOS/iOS)
- Test with TalkBack (Android)

### Additional Accessibility Features

**Text Resizing:**
- Layout must remain usable at 200% zoom
- No horizontal scrolling when zoomed
- Text must not overlap or be cut off

**Motion & Animation:**
```css
/* Respect user preferences */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Form Accessibility:**
- All inputs have associated labels
- Error messages are descriptive and actionable
- Required fields are clearly marked
- Field instructions appear before the field
- Errors announced to screen readers

**Link Accessibility:**
- Links have descriptive text (not "click here")
- Links are visually distinct from text
- Link purpose is clear from context
- External links indicated with icon + aria-label

---

## Implementation Notes

### Tailwind CSS Configuration

**Colors:**
Map the color system to Tailwind config:

```javascript
// tailwind.config.mjs
export default {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        secondary: {
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
        },
        success: {
          50: '#F0FDF4',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
        },
        warning: {
          50: '#FFFBEB',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
        },
        error: {
          50: '#FEF2F2',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
        },
        info: {
          50: '#ECFEFF',
          500: '#06B6D4',
          600: '#0891B2',
          700: '#0E7490',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Poppins', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      maxWidth: {
        '8xl': '1440px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
```

### shadcn/ui Integration

Use shadcn/ui components as base, customize with Planloo design tokens:

**Installation:**
```bash
npx shadcn-ui@latest init
```

**Component Customization:**
Override shadcn defaults in `components/ui/button.tsx`:

```tsx
import { cva, type VariantProps } from "class-variance-authority"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 shadow-sm hover:shadow-md hover:-translate-y-0.5",
        secondary: "bg-white text-primary-700 border border-primary-300 hover:bg-primary-50 hover:border-primary-400 active:bg-primary-100 shadow-sm",
        ghost: "text-primary-600 hover:bg-primary-50 hover:text-primary-700 active:bg-primary-100",
        danger: "bg-error-600 text-white hover:bg-error-700",
      },
      size: {
        sm: "h-9 px-4 text-xs min-h-[36px]",
        default: "h-11 px-5 text-sm min-h-[44px]",
        lg: "h-12 px-7 text-base min-h-[48px]",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)
```

### Design Tokens (CSS Variables)

Create CSS custom properties for consistency:

```css
/* styles/tokens.css */
:root {
  /* Colors */
  --color-primary-500: #3B82F6;
  --color-primary-600: #2563EB;
  --color-primary-700: #1D4ED8;

  /* Spacing */
  --spacing-xs: 0.5rem;
  --spacing-sm: 0.75rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;

  /* Typography */
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);

  /* Border radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;

  /* Transitions */
  --transition-fast: 150ms ease-in-out;
  --transition-base: 250ms ease-in-out;
}
```

### Component Library Structure

Organize components by complexity:

```
src/components/
├── ui/              # Base components (shadcn + custom)
│   ├── button.tsx
│   ├── input.tsx
│   ├── card.tsx
│   ├── badge.tsx
│   ├── modal.tsx
│   └── ...
├── shared/          # Shared composed components
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── Sidebar.tsx
│   ├── EmptyState.tsx
│   └── ...
├── events/          # Feature-specific components
│   ├── EventCard.tsx
│   ├── EventForm.tsx
│   ├── EventHeader.tsx
│   └── ...
└── ...
```

### Performance Optimization

**Image Optimization:**
- Use Astro's `<Image>` component for automatic optimization
- Serve WebP with JPEG fallback
- Lazy load images below the fold
- Provide width/height to prevent layout shift

**Font Loading:**
```html
<!-- Preload critical fonts -->
<link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin>

<!-- Use font-display: swap -->
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-var.woff2') format('woff2');
  font-display: swap;
}
```

**CSS Optimization:**
- PurgeCSS via Tailwind to remove unused styles
- Critical CSS inlined in `<head>`
- Defer non-critical CSS

**JavaScript Optimization:**
- Use Astro islands for minimal hydration
- Defer non-critical scripts
- Code-split by route

### Quality Assurance Checklist

**Visual Design:**
- [ ] All colors from approved palette
- [ ] Typography matches type scale
- [ ] Spacing uses 4px grid system
- [ ] Border radius consistent
- [ ] Shadows applied appropriately

**Responsive Design:**
- [ ] Works on 320px mobile
- [ ] Works on 768px tablet
- [ ] Works on 1280px desktop
- [ ] Touch targets min 44px
- [ ] No horizontal scroll

**Accessibility:**
- [ ] Color contrast ≥ 4.5:1 (text)
- [ ] Focus indicators visible
- [ ] Semantic HTML used
- [ ] ARIA labels on icon buttons
- [ ] Keyboard navigation works
- [ ] Screen reader tested

**Performance:**
- [ ] Lighthouse Performance > 90
- [ ] First Contentful Paint < 1.5s
- [ ] Images optimized (WebP)
- [ ] Fonts preloaded
- [ ] No layout shift (CLS < 0.1)

---

## Revision History

| Version | Date       | Author              | Changes                               |
|---------|------------|---------------------|---------------------------------------|
| 1.0     | 2026-02-02 | UI/UX Designer      | Initial design specification          |

---

## Next Steps

1. **Developer Review:** Frontend developer reviews spec for technical feasibility
2. **Component Development:** Begin building base UI components (buttons, inputs, cards)
3. **Style Guide Page:** Create living style guide at `/styleguide` for reference
4. **Design System Documentation:** Expand component library with usage examples
5. **User Testing:** Validate designs with target users (event planners)

## References

- **Requirements Document:** `docs/requirements.md`
- **Frontend Architecture:** `docs/frontend-architecture.md`
- **Tailwind CSS Documentation:** https://tailwindcss.com/docs
- **shadcn/ui Components:** https://ui.shadcn.com/
- **WCAG 2.1 Guidelines:** https://www.w3.org/WAI/WCAG21/quickref/
- **Radix UI Primitives:** https://www.radix-ui.com/primitives
