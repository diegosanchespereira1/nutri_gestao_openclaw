---
name: Vitality Clinical
colors:
  surface: '#F7F9F2'
  surface-dim: '#d7dadf'
  surface-bright: '#f7f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f4f9'
  surface-container: '#ebeef3'
  surface-container-high: '#e5e8ee'
  surface-container-highest: '#e0e3e8'
  on-surface: '#181c20'
  on-surface-variant: '#44483a'
  inverse-surface: '#2d3135'
  inverse-on-surface: '#eef1f6'
  outline: '#757968'
  outline-variant: '#c5c8b5'
  surface-tint: '#4b6709'
  primary: '#4b6709'
  on-primary: '#ffffff'
  primary-container: '#8cad4c'
  on-primary-container: '#2b3e00'
  inverse-primary: '#b0d36d'
  secondary: '#45664b'
  on-secondary: '#ffffff'
  secondary-container: '#c4e9c7'
  on-secondary-container: '#4a6a4f'
  tertiary: '#566342'
  on-tertiary: '#ffffff'
  tertiary-container: '#99a781'
  on-tertiary-container: '#313c1f'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cbef86'
  primary-fixed-dim: '#b0d36d'
  on-primary-fixed: '#141f00'
  on-primary-fixed-variant: '#364e00'
  secondary-fixed: '#c7ecca'
  secondary-fixed-dim: '#abd0af'
  on-secondary-fixed: '#02210c'
  on-secondary-fixed-variant: '#2e4e35'
  tertiary-fixed: '#dae8be'
  tertiary-fixed-dim: '#becca3'
  on-tertiary-fixed: '#141f05'
  on-tertiary-fixed-variant: '#3f4b2c'
  background: '#f7f9ff'
  on-background: '#181c20'
  surface-variant: '#e0e3e8'
  muted: '#64748B'
  accent-red: '#840D0E'
  border: '#E2E8F0'
typography:
  headline-xl:
    fontFamily: Manrope
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: DM Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: DM Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: DM Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  section-gap: 80px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

The design system establishes a professional, health-focused identity that bridges the gap between clinical expertise and natural vitality. It is designed for patients and institutions seeking authoritative nutritional guidance.

The visual style is **Corporate Modern with a Minimalist lean**, drawing inspiration from contemporary UI frameworks like shadcn/ui. It prioritizes clarity, high legibility, and a sense of cleanliness. By utilizing generous whitespace and a refined color palette, the system evokes a "clinical-fresh" atmosphere—trustworthy and regulated, yet welcoming and organic. 

Key attributes include:
- **Precision:** Clean lines and structured grids reflecting regulatory compliance (ANVISA/CRN-3).
- **Vitality:** Soft green accents that reference nature, health, and fresh produce.
- **Accessibility:** High-contrast text and intuitive navigation paths for a diverse demographic.

## Colors

The palette is rooted in botanical greens and clean neutrals. 

- **Primary Green (#8CAD4C):** Used for primary actions, success states, and key brand highlights. It represents growth and nutritional health.
- **Secondary/Deep Green (#3A5A40):** Provides professional weight and contrast, used for navigation headers or deep-background components.
- **Neutral/Surface:** The background relies on a near-white, warm neutral (#F7F9F2) to avoid the harshness of pure white while maintaining a sterile, professional feel.
- **Text:** Primary body text uses a deep charcoal (#212529) to ensure AAA accessibility standards.
- **Accent Red:** Reserved strictly for critical alerts or specific regulatory highlights where attention is mandatory.

## Typography

This design system uses a dual-font approach to balance modernity with readability.

- **Manrope** is used for headlines. Its geometric yet humanist characteristics provide a technical, professional appearance that feels contemporary.
- **DM Sans** is used for body copy and labels. Its low-contrast strokes and open apertures ensure maximum legibility for long-form educational content and clinical descriptions.

Typography scales are optimized for a clear information hierarchy. "Kickers" or section labels should always use the `label-sm` style with increased letter spacing to clearly categorize content sections.

## Layout & Spacing

The layout follows a **Fixed Grid** philosophy on desktop to maintain a structured, editorial feel, transitioning to a fluid model on mobile devices.

- **Desktop:** 12-column grid with a 1280px max-width.
- **Sectioning:** Content blocks are separated by significant vertical padding (`section-gap`) to allow the design to "breathe" and prevent information overload.
- **Rhythm:** An 8px base unit governs all spatial relationships. Elements within a group (e.g., an icon and its label) use `stack-sm`, while related components (e.g., a heading and its paragraph) use `stack-md`.
- **Reflow:** On tablet and mobile, the 12 columns collapse into 4, and lateral margins are reduced to `margin-mobile`.

## Elevation & Depth

To maintain a clean and modern aesthetic inspired by shadcn/ui, the design system utilizes **Tonal Layers** supplemented by **Ambient Shadows**.

- **Surface Tiers:** The main background is the `surface` color. Interactive cards or "floating" containers use pure `#FFFFFF` to subtly lift them from the background.
- **Shadows:** Avoid heavy, dark shadows. Use a "Soft Bloom" effect: a very wide blur (20-30px) with extremely low opacity (4-8%) using a slight green tint from the primary palette to maintain harmony.
- **Borders:** Subtle `1px` borders in the `border` color are preferred over shadows for defining input fields and static containers, keeping the UI crisp and clinical.

## Shapes

The shape language is **Rounded**, striking a balance between the friendliness of organic health and the precision of medical consultancy.

- **Standard Radius:** 0.5rem (8px) for buttons, inputs, and small cards.
- **Large Radius:** 1rem (16px) for main content containers or image carousels.
- **Circular/Pill:** Used exclusively for tags, status chips, or specialized "Schedule" buttons to make them stand out as the primary call to action.

## Components

### Buttons
- **Primary:** Solid `primary_color_hex` with white text. Rounded (8px) or Pill-shaped for CTAs. 
- **Secondary:** Ghost style with `primary_color_hex` border and text.
- **Hover States:** Subtle darkening of the background color (5-10%) and a slight upward translation (1px) for tactile feedback.

### Cards
- White background, `border` color stroke, and soft ambient shadow. 
- Used for service descriptions and testimonials. Padding should be generous (`stack-lg`).

### Input Fields
- Flat background (`#FFFFFF`), `1px` border, and 8px corner radius.
- Labels sit above the field using `label-sm` typography in `muted` color.

### Chips & Badges
- Used for categories (e.g., "Segurança Alimentar"). Small font size, uppercase, with a light primary-tinted background and dark green text.

### Statistics Highlights
- Large numeric values in `primary_color_hex` using `headline-xl` to emphasize social proof and experience metrics.

### Lists
- Use custom checkmark icons in `primary_color_hex` rather than standard bullets to reinforce the health/success narrative.