# Agent Instructions for MasterH ERP

## UI / UX Guidelines
Whenever you are generating, modifying, or reviewing frontend UI code (React, CSS, etc.), you **MUST** strictly follow our design system.

1. **Read the Skill**: Before writing any UI code, you must use the `view_file` tool to read `c:\Users\Admin\Documents\lushanth_Pvt_Ltd\remasterprojects\masterh\.agent\skills\ui-ux-pro-max\SKILL.md`.
2. **Strict Adherence**: Follow all pre-delivery checklists in that skill document.
3. **No Hardcoded Dark Colors**: Do not hardcode dark hex colors or slate colors for backgrounds. Always use CSS variables from `global.css` (e.g., `var(--bg-tertiary)`) so that Light Mode and Dark Mode work flawlessly.
4. **Icons**: Use `lucide-react` for all icons. No emojis.

## Tech Stack
- Frontend: React + Vite + TypeScript + React Router + TanStack Query + Zustand + Tailwind/Vanilla CSS + React Hook Form + Zod
- Backend: Express + Drizzle ORM + MySQL + Zod

## Feature Architecture
- Always build frontend features using the Feature-Sliced Design pattern inside `apps/web/src/features/`.
