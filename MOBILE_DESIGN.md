# MasterH Mobile Design System (Expo)

This document serves as the master source of truth for the UI/UX design and styling of the MasterH operational staff mobile application built with React Native (Expo). Because this app is used by field staff (drivers, collectors) outdoors and on the move, it prioritizes **high contrast, massive tap targets, and crystal-clear typography** over subtle aesthetic gradients.

## 1. Color Palette

We are inheriting the brand identity from the web dashboard but optimizing it for mobile screen readability under direct sunlight.

### Brand Colors
- **Brand Primary (`#D97706` / Amber 600)**: Used for primary actions (Start Trip, Collect Payment). High visibility.
- **Brand Secondary (`#F59E0B` / Amber 500)**: Used for highlights and active states.
- **Brand CTA (`#7C3AED` / Violet 600)**: Used for special secondary actions (e.g., "Scan Barcode").

### Backgrounds & Surfaces (Light Mode Default)
- **Background (`#F8FAFC` / Slate 50)**: The core app background.
- **Surface (`#FFFFFF` / White)**: For cards, modals, and list items. Gives a crisp separation from the background.
- **Surface Highlight (`#F1F5F9` / Slate 100)**: For pressed states or subtle dividers.

### Text Colors
- **Text Primary (`#0F172A` / Slate 900)**: Maximum contrast for all main text.
- **Text Secondary (`#475569` / Slate 600)**: For descriptions and labels.
- **Text Disabled (`#94A3B8` / Slate 400)**: For inactive states.

### Semantic Colors
- **Success (`#059669` / Emerald 600)**: Synced successfully, Payment completed.
- **Error (`#DC2626` / Red 600)**: Conflict errors, Invalid data.
- **Warning (`#EA580C` / Orange 600)**: Offline mode active (Sync pending).

---

## 2. Typography

Since React Native does not use `rem`, we use absolute pixel values. The font must be large enough to read while holding the phone at a distance.

- **Font Family**: System Default (San Francisco on iOS, Roboto on Android) to keep the app feeling native and fast.
- **H1 (Screen Title)**: 28px, Bold (700)
- **H2 (Card Title)**: 20px, SemiBold (600)
- **H3 (Section Header)**: 16px, SemiBold (600), Uppercase tracking
- **Body Large**: 18px, Regular (400) - *Use for primary data (e.g., Customer Name)*
- **Body Base**: 16px, Regular (400) - *Standard text*
- **Body Small**: 14px, Medium (500) - *Labels and metadata*

---

## 3. Layout & Spacing

React Native uses flexbox heavily. We will use an 8-point grid system.

- **Screen Padding**: `16px` horizontally.
- **Card Spacing**: `12px` between list items.
- **Inner Padding**: `16px` inside cards for comfortable breathing room.
- **Border Radius**: 
  - `sm`: 6px (Inputs, Badges)
  - `md`: 12px (Cards, Modals)
  - `lg`: 24px (Bottom sheets)

---

## 4. Core UI Components

### Buttons
Field staff shouldn't have to precisely tap small areas.
- **Primary Button**: 
  - Height: `56px` (Massive tap target)
  - Background: `Brand Primary`
  - Text: `18px`, Bold, White
  - Border Radius: `12px`
- **Secondary Button**: 
  - Height: `56px`
  - Background: `Surface Highlight`
  - Text: `18px`, SemiBold, `Text Primary`
  - Border Radius: `12px`

### Offline Status Banner
A persistent UI element that sits below the header to inform the user of their sync status.
- **State: Offline (Changes pending)**: Amber background, "Offline - 3 changes waiting to sync".
- **State: Syncing**: Blue background, spinner, "Syncing to server...".
- **State: Online (Synced)**: Hidden entirely to save screen real estate.

### Action Cards (List Items)
Used for Customers and Inventory items.
- **Background**: `Surface` (White)
- **Shadow**: Extremely subtle native shadow (`elevation: 2` on Android, `shadowOpacity: 0.05` on iOS).
- **Layout**: Flex row with a chevron (`>`) icon on the right to indicate tapability.

---

## 5. Mobile UX Principles (The "Driver First" Rules)

> [!CAUTION]
> **Rule 1: No Spinners for Core Actions**
> Because this is an Offline-First app, tapping "Save" or "Collect" MUST resolve instantly on the UI. Show a green checkmark immediately. Let the Sync Queue do the waiting in the background.

> [!IMPORTANT]
> **Rule 2: Thumb Reachability**
> All primary actions (Start Trip, End Trip, Add Payment, Scan) must be anchored to the **bottom** of the screen so they are easily reachable with one thumb while holding a steering wheel or clipboard in the other hand.

> [!TIP]
> **Rule 3: High Contrast in Sunlight**
> Do not use light grey text on a white background. Drivers wearing sunglasses in bright sunlight will not be able to read it. Use `Text Secondary` (`#475569`) as the absolute lightest text color.
