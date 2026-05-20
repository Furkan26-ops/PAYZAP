# PAYZAP Project Instructions

## Theme System (Arc Theme)
The project uses a custom theme system based on CSS variables prefixed with `--arc-`. 

### Preferred Aesthetic: White Theme
- The user prefers a clean, high-contrast **white theme**. 
- **Light Mode Defaults:** Pure white backgrounds (`#FFFFFF`), subtle slate borders (`#E2E8F0`), and Slate-900 text.
- **Glass Utility:** Use the `.glass-panel` class for containers, which provides a light-themed frosted look with soft shadows.
- **Avoid:** Dark translucent overlays or aggressive gradients. Use solid white or very light blue (`#EFF6FF`) for backgrounds.

### Implementation
- CSS variables are defined in `src/app/globals.css`.
- Tailwind configuration in `tailwind.config.ts` maps these variables to `arc-*` classes (e.g., `bg-arc-bg`, `text-arc-text`).
- Components should use these semantic classes to ensure consistency across the application.
