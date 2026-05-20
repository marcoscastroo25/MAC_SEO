---
name: Antigravity Precision
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#bacac5'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#859490'
  outline-variant: '#3c4a46'
  surface-tint: '#3cddc7'
  primary: '#57f1db'
  on-primary: '#003731'
  primary-container: '#2dd4bf'
  on-primary-container: '#00574d'
  inverse-primary: '#006b5f'
  secondary: '#bdc2ff'
  on-secondary: '#131e8c'
  secondary-container: '#2f3aa3'
  on-secondary-container: '#a8afff'
  tertiary: '#ffd47b'
  on-tertiary: '#402d00'
  tertiary-container: '#efb515'
  on-tertiary-container: '#634900'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#62fae3'
  primary-fixed-dim: '#3cddc7'
  on-primary-fixed: '#00201c'
  on-primary-fixed-variant: '#005047'
  secondary-fixed: '#e0e0ff'
  secondary-fixed-dim: '#bdc2ff'
  on-secondary-fixed: '#000767'
  on-secondary-fixed-variant: '#2f3aa3'
  tertiary-fixed: '#ffdf9f'
  tertiary-fixed-dim: '#f9bd22'
  on-tertiary-fixed: '#261a00'
  on-tertiary-fixed-variant: '#5c4300'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-padding: 24px
  gutter: 16px
  stack-sm: 12px
  stack-md: 24px
  stack-lg: 48px
---

## Brand & Style

The design system is engineered for the **Growth Optimizer Agent**, an authoritative AI marketing consultant. It embodies a "Strategic Tech" aesthetic—blending the high-performance feel of a command center with the refined clarity of modern enterprise SaaS. 

The visual direction is **Precision Glassmorphism**. It utilizes multi-layered semi-transparent surfaces to create a sense of depth and intelligence, suggesting that the AI is processing vast layers of data in real-time. The interface should feel proactive and data-driven, evoking trust through structural rigor and crisp, luminous details. whitespace is used strategically to maintain focus on high-density information without overwhelming the user.

## Colors

The palette is optimized for a deep-space environment that reduces eye strain during long periods of strategic analysis. 

- **Primary (Electric Teal):** Reserved for growth metrics, success states, and primary action paths. It represents "ascent" and positive momentum.
- **Secondary (Indigo/Violet):** Used for AI-generated insights, automation triggers, and "smart" components. It distinguishes machine intelligence from raw data.
- **Alert (Amber):** A high-visibility warning color for technical bottlenecks or budget overages.
- **Base (Midnight Blue):** The foundation (#0F172A), providing a low-contrast backdrop that allows glass layers to pop.
- **Surfaces:** Containers use a semi-transparent hex (#1E293B) with a 60-80% alpha and a background blur to maintain legibility over gradients.

## Typography

This design system utilizes **Inter** for all primary UI and body text to ensure maximum readability of complex marketing data. For specialized AI interactions and technical labels, **JetBrains Mono** is introduced to provide a "command-line" feel that reinforces the agent's technical authority.

- **Headlines:** Use tight letter spacing and bold weights to ground the interface.
- **Body:** Standard weights for high legibility against dark backgrounds.
- **Labels/Data:** Monospaced fonts are used for numbers in data tables and status badges to prevent "jitter" when values update in real-time.

## Layout & Spacing

The layout follows a **12-column fluid grid** for desktop, collapsing to a single column on mobile. 

- **Grid:** 16px gutters with 24px side margins. 
- **Density:** Information density is high, but components are separated by generous "stack" spacing (48px) to define distinct logical modules.
- **Rhythm:** An 8px base unit governs all padding and margins to ensure mathematical harmony.
- **Mobile Reflow:** On mobile, data cards transition from horizontal layouts to vertical stacks, with sparklines expanding to fill the width of the screen.

## Elevation & Depth

Hierarchy is established through **optical layering** rather than traditional heavy shadows.

- **Level 0 (Base):** Deep Slate (#0F172A) solid background.
- **Level 1 (Surface):** Semi-transparent glass panels with a 20px backdrop blur and a subtle 1px border (#FFFFFF10) to define edges.
- **Level 2 (Active):** High-interaction elements utilize a subtle inner glow (Electric Teal at 10% opacity) to suggest they are "powered on."
- **Gradients:** Use very subtle, large-radius radial gradients in the background (Indigo/Teal at 5% opacity) to prevent the dark UI from feeling flat or "dead."

## Shapes

The design system employs a **Rounded (8px base)** corner language. This provides a balance between the "hard" precision of a technical tool and the "soft" accessibility of a proactive assistant.

- **Cards & Panels:** Use 16px (rounded-lg) for main containers to create a distinct framing effect.
- **Buttons & Inputs:** Use 8px (standard) for a crisp, functional feel.
- **Badges:** Use pill-shaped (full rounding) to differentiate status indicators from functional buttons.

## Components

- **Data Cards:** Features a glass background, 1px top-light border, and an integrated sparkline. The sparkline uses the Electric Teal color with a soft glow effect.
- **AI Interaction Panels:** Styled as "Command Line Lite." Use a darker, more opaque background (#0B1120) with monospaced text input. The cursor should be a blinking Teal block.
- **Progress Rings:** Use a thick stroke for the background track (#FFFFFF10) and a glowing Electric Teal stroke for the value. Center the percentage in JetBrains Mono.
- **Status Badges:** Compact pill shapes. Priority levels are color-coded: High (Amber), Normal (Indigo), Optimized (Teal).
- **Buttons:** 
    - *Primary:* Solid Electric Teal with dark text for maximum contrast.
    - *Secondary:* Ghost style with 1px Electric Teal border and subtle hover fill.
- **Input Fields:** Dark background, 1px border that glows Electric Teal on focus. Use monospaced font for data entry fields.