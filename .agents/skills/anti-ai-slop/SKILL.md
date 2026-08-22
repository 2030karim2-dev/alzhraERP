---
name: anti-ai-slop
description: |
  Enforces strict, high-craft web design rules to eliminate generic AI-generated aesthetic clichés ("AI Slop").
  Use when designing or building production web interfaces, landing pages, dashboards, CSS styles, or frontend components.
  Eliminates overused gradients, sparkles, floating shadows, bloated typography, generic buzzwords, and template layouts.
---

# Anti-AI Slop Skill / Production Design Constraints

You are building a production web interface. The rules below are constraints, not suggestions.
When a rule conflicts with what you were about to generate, the rule wins.

The goal is not "avoid a list of things." It is to make a deliberate choice in each place where the default would be decoration. If you remove a banned element and put nothing considered in its place, the result is worse, not better.

---

## 1. Colour

* **Choose ONE accent colour.** Everything else is neutral, a single family of greys with a consistent temperature (all warm or all cool, never mixed).
* **A second colour is allowed only when it carries meaning:** destructive, success, warning. Never for variety.
* **Banned: blue→purple and indigo→violet gradients**, anywhere. That means backgrounds, buttons, headings, logos, icons, borders, blurred "blobs", mesh backgrounds.
* **Banned: gradient text (`background-clip: text`).** Headings are one solid colour.
* **Banned: giving each feature, category, or section its own hue.** A feature grid uses the same colour for every card. Colour encodes meaning; it is not decoration.
* **Do not ship a framework's default palette untouched** (Tailwind `indigo`/`violet`/`slate` is the single most recognisable generated-site signature). Define your own tokens.
* **Accent usage target:** under 10% of the visible surface. If the page looks colourful, you have overused it.

---

## 2. Depth and Separation

* **Banned: a drop shadow on anything that is not genuinely floating above the page.** Cards, sections, images, inputs, badges, and static buttons get no shadow.
* **Shadows are permitted only on elements that truly overlay:** dropdowns, popovers, modals, toasts. Keep them tight and low-opacity. A real one reads as `0 1px 2px rgba(0,0,0,.06)`, not a 40px purple bloom.
* **Separate blocks with a 1px border, a background step, or whitespace**, in that order of preference. Whitespace is the best separator and costs nothing.
* **Do not stack multiple shadows** on one element to simulate depth.
* **Pick one `border-radius` value and one border colour**, and use them everywhere.

---

## 3. Icons and Emoji

* **Banned: the sparkle icon ✨ ✦ ✧ 🪄** and every "AI shimmer" glyph, in buttons, badges, logos, nav, headings, or beside a product name. The sparkle-as-AI is the single clearest tell there is. If a feature uses AI, say so in words.
* **Banned: emoji used as UI.** No emoji in headings, buttons, feature lists, badges, navigation, or empty states. Not 🚀, not ⚡, not 🎯, not 🔥. Emoji are user content, never interface.
* **Banned: any container around an icon.** No tinted rounded square, no circle, no bordered box, no coloured chip behind it. The icon sits directly on the background at text size. The icon-in-a-soft-tinted-square is a template signature.
* **Use one real icon set** (Lucide, Heroicons, Phosphor) at one stroke weight. Monochrome, inheriting `currentColor`, sized to the text beside it.
* **If a feature is clear from its label, it does not need an icon at all.**

---

## 4. Typography and Copy

* **Banned words, in copy and in headings:** *unleash, supercharge, elevate, transform, revolutionise, empower, seamless, effortless, effortlessly, cutting-edge, game-changing, next-level, unlock, harness, robust, leverage, powerful, delve, paradigm, synergy*. If a sentence survives deleting the adjective, delete the adjective.
* **Banned: the em dash (—) in UI copy.** It is the strongest text-level tell. Write two sentences, or use a comma. This applies to headings, body, tooltips, and empty states.
* **Say what the product does**, in concrete nouns and real numbers. *"Export to CSV in one click"* beats *"Seamlessly unlock your data's potential."*
* **One type family** (two at most: UI and mono). A real scale, roughly `12 / 14 / 16 / 20 / 24 / 32 / 48`. No sizes between steps.
* **Body text is left-aligned** (or right-aligned for RTL). Centre only short headings. Never centre a paragraph over three lines. Cap measure at ~65–70 characters.
* **Sentence case for headings and buttons.** No Title Case Everywhere, no ALL-CAPS except tiny labels with tracking.

---

## 5. Motion

* **Banned: an arrow inside a button that slides on hover.** Also banned: arrows that animate on their own, bouncing chevrons, and any looping idle motion.
* **Banned: hover glow.** No `box-shadow` bloom, no coloured halo, no `scale()` above 1.02, no lift on hover for cards or buttons.
* **Hover states change background or border colour only**, at 120–160ms `ease-out`.
* **Animate opacity and transform only.** Duration 120–200ms for UI feedback, up to 300ms for something entering. Nothing eases for half a second.
* **No scroll-triggered fade-ins on every section.** No parallax. No typewriter, no counters ticking up, no marquee of logos.
* **Honour `prefers-reduced-motion`:** reduce and disable non-essential motion inside it.

---

## 6. Scale and Proportion

Nothing is oversized. Everything is sized to its content and fits neatly. Inflated type, padding and buttons are how a generated page announces itself before you read a word.

* **Hero headline:** 40–56px on desktop, 28–34px on mobile. Never 72px+. A headline does not need to fill the screen to be the headline.
* **Body text:** 15–16px. Secondary text 13–14px. Nothing below 12px.
* **Buttons:** 36–44px tall, with padding sized to the label, not to make a statement. Never full-width on desktop. A primary and a secondary button are enough.
* **Section padding:** 64–96px vertical on desktop, 40–56px on mobile. Not 160px+.
* **Content max-width:** 1100–1280px. Text columns capped at ~65–70 characters. Do not let a line of text run the full width of a 1920px monitor.
* **Inline icons:** 16–20px, standalone icons 24px. No 48px+ decorative icons.
* **No section is a full viewport tall just for impact.** The hero should show that content continues below it.
* **Cards are sized by their content.** Force equal heights only when the content really is equal; otherwise let them differ.
* **Every spacing value is a multiple of 4.** Elements in a row share their top and bottom edges. Related items align to the same edge. Neatness is alignment plus consistent spacing, nothing more.

---

## 7. Layout and Structure

* **Banned: the eyebrow badge.** No pill above the hero reading *"Introducing v2.0"*, *"AI-Powered"*, *"New"*, or *"Trusted by developers"*. If it were important it would be in the headline.
* **Do not reproduce the default template order** (hero → logo strip → three features → testimonial → three pricing tiers → FAQ → repeated CTA). Build only the sections this product actually needs, in the order a real user needs them.
* **Feature grids do not have to be three columns of equal-length cards.** Let real content set the shape; uneven is fine, and reads as human.
* **Not everything is centred. Not everything is a card. Not every corner is fully rounded.**
* **One spacing scale (4px base).** Vertical rhythm should be visibly consistent; a generated page usually has arbitrary gaps between every section.

---

## 8. Placeholder Content

* **Mockup content is fine.** Logo strips, "Trusted by 10,000+ teams", sample testimonials and example metrics all belong in a demo build. Do not leave sections empty waiting for real copy.
* **What gives a page away is not that the content is placeholder, it is that the placeholder is generic.** Make it specific: named companies rather than "Company A", a testimonial that mentions an actual feature, a number that is oddly precise rather than a round 10,000+.
* **Placeholder copy still obeys section 4.** No hype adjectives, no em dashes, no emoji.
* **Write real empty states, error states, and loading states.** Their absence is what makes a build feel unfinished.

---

## 9. Code Craft

* **Semantic HTML:** `<header>`, `<nav>`, `<main>`, `<section>`, `<button>`, `<a>`. A clickable `<div>` is a bug.
* **Real, visible `:focus-visible` styles.** Keyboard order must match visual order.
* **Every image has meaningful `alt`;** decorative images get `alt=""`.
* **Colour contrast at least 4.5:1 for body text, 3:1 for large text.**
* **Reuse components** instead of pasting a block with different text. If the same markup appears three times, extract it.
* **Use design tokens or theme values**, not one-off arbitrary values scattered per element.
* **No dead code, no commented-out blocks, no unused imports, no placeholder TODOs in a delivered file.**

---

## Quality Checklist Before Finalizing

Go through every line and fix what fails:
1. Any `blue→purple` or `indigo→violet` gradient left, anywhere?
2. Any gradient text?
3. Does anything that is not floating still have a shadow?
4. Any sparkle glyph (`✨`, `🪄`, etc.), anywhere?
5. Any emoji used as interface?
6. Does any icon sit inside a tinted square, circle, or box?
7. Any em dash (`—`) in the copy?
8. Any hits from the banned word list?
9. Does each feature or category have its own colour?
10. Does any button contain a moving arrow?
11. Does anything glow, lift, or scale on hover?
12. Is there a badge above the hero that says nothing?
13. Is the hero headline above 56px, or any section over 96px of vertical padding?
14. Does any element look oversized next to the text beside it?
