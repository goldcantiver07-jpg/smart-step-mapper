# Navbar Redesign & Profile/Settings Page

**Date:** 2026-07-27
**Project:** Smart Step Mapper
**Status:** Approved Design

## Overview

Redesign the app navigation into a single unified top bar (replacing the current separate Header + BottomNav) and transform the profile page into a tabbed Profile + Settings experience.

---

## 1. Unified Top Navbar

### Desktop (≥768px)

- Fixed top bar, full width, `border-b border-neutral-800`, `bg-surface-950/90` with backdrop blur
- **Left:** Small map icon SVG + "Smart Step Mapper" in Sora font
- **Center:** Nav links — Home, Maps, Create, Progress — with active state (blue text + subtle bottom border indicator)
- **Right:** User avatar circle (48px, shows first initial, blue-600 bg) → dropdown menu:
  - Profile (link)
  - Settings (link)
  - Divider
  - Logout (button, red on hover)
- **Unauthenticated:** Brand left, "Sign In" link/button right (blue-600)
- z-index above content, no overlap with main padding

### Mobile (<768px)

- Fixed top bar: Brand left, hamburger icon (3-line SVG) right
- Hamburger toggles a slide-out drawer from the left side
- Drawer: `w-72` max, dark surface bg, backdrop overlay (`bg-black/50`)
- Drawer contents (stacked vertically):
  - **User section** (top, padded):
    - Avatar circle (48px) + display name
    - "Not signed in" + Sign In link when unauthenticated
  - **Nav links**: Home, Maps, Create, Progress, Profile, Settings — each with SVG icon + label, active state blue
  - **Spacer**
  - **Logout** at bottom (only when signed in)
- Close drawer on nav link click or backdrop tap
- `pb-safe` for notched devices

### Shared Behavior

- Active nav link determined by `$page.url.pathname`
- SVG icons for each nav item (simple outline style, 20x20, currentColor)
- Nav link hover: `text-neutral-300`, transition-colors
- Dropdown/drawer close on Escape key

---

## 2. Profile / Settings Page

**Route:** `/profile`
**Layout:** Tabbed page, `mx-auto max-w-2xl px-4 py-8`

### Tab Bar

- Two tabs: **Profile** | **Settings**
- Horizontal layout, border-bottom with active tab indicator (sliding underline)
- Active: `text-blue-400 border-b-2 border-blue-400`
- Inactive: `text-neutral-500 hover:text-neutral-300`

### Profile Tab

**Hero Section:**
- Large circular avatar (96px, blue-600 gradient bg, 2xl bold white initial)
- Hover overlay: "Change photo" label, opacity transition, file input (accept="image/*")
  - ⚠️ UI-only affordance: shows file picker on click, but actual image upload/storage is out of scope for this spec (avatar falls back to initial-based display)
- Display name (`text-2xl font-display font-semibold`)
- Email (`text-sm text-neutral-400`)
- Join date (`text-xs text-neutral-500`)

**Stats Row:**
- 3 cards in a row: **Maps Created** | **Steps Completed** | **Joined**
- Each card: count/value in bold, label below in small muted text
- `grid grid-cols-3 gap-4`

**Action Button:**
- "View My Maps" → navigates to `/maps`
- Outline style button

**Unauthenticated:**
- Clean card: "Not signed in" message + Sign In button (blue-600)

### Settings Tab

**Display Name:**
- Label + input field (dark bg, border-neutral-700)
- Save button (blue-600, disabled when unchanged)
- Calls `orpc.auth.updateProfile.mutate({ displayName })` — needs new backend procedure

**Email:**
- Display only (muted text)
- "(verified)" badge if applicable

**Change Password (expandable section):**
- Summary/label that toggles form visibility
- Current Password, New Password, Confirm New Password
- Save button (blue-600)
- Calls `orpc.auth.changePassword.mutate({ currentPassword, newPassword })` — needs new backend procedure

**Danger Zone:**
- Section with red border/warning
- "Delete Account" button (red-600/20 bg, red-400 text)
- Opens confirmation modal (type account name to confirm)
- Calls `orpc.auth.deleteAccount.mutate()` — needs new backend procedure

### Layout
- Card container: `rounded-lg border border-neutral-800 bg-neutral-900/50 p-6`
- Spacing between sections: `space-y-6`
- Form inputs: `w-full rounded border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm`

---

## 3. Files to Modify / Create

### Modify
- `src/lib/components/Header.svelte` → Rewrite as unified top navbar
- `src/routes/profile/+page.svelte` → Rewrite as tabbed profile/settings
- `src/routes/+layout.svelte` → Remove BottomNav import/usage
- `packages/api/src/routers/auth.ts` → Add `updateProfile`, `changePassword`, `deleteAccount` procedures
- `src/app.css` → No changes needed (uses existing theme)

### Delete
- `src/lib/components/BottomNav.svelte` — no longer needed

### Create
- `src/lib/components/Navbar.svelte` — unified navbar component (replaces Header + BottomNav)
- SVG icon components (inline in Navbar)

---

## 4. State & Auth Handling

- User data comes from `orpc.auth.me` query (existing)
- Navbar shows auth-appropriate state (signed in vs not)
- Logout: clears session cookie, redirects to `/login`
- Profile page shows error/redirect if not authenticated (Settings tab requires auth)
