# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

冰箱笔记 (Fridge Notes) — a WeChat mini-program for tracking items stored in a fridge, their locations (zone/layer), and expiry dates. The core goal is reducing food waste by alerting users before items expire. Supports multi-user collaboration via QR code sharing with role-based permissions (owner/readwrite/readonly).

## Tech Stack

- **Frontend**: WeChat Mini Program with TypeScript (`miniprogram/`)
- **UI Library**: TDesign Weixin (`tdesign-miniprogram` ^1.15.3), installed via npm and built to `miniprogram/miniprogram_npm/`
- **Backend**: WeChat CloudBase (云开发) — cloud functions in `cloudfunctions/`, database collections (`fridges`, `items`, `users`, `user_fridge`), cloud storage for images/QR codes
- **App ID**: `wx993ca26a9925bc1b`
- **Cloud Env**: `cloud1-d4gl9uf3tb8659c31`
- **Base Library**: 3.17.1+, compiled with `skylineRenderEnable: true`

## Development

Open the project root in WeChat DevTools (微信开发者工具). The IDE handles TypeScript compilation and npm package building.

- **Build npm**: In WeChat DevTools: Tools → Build npm (required after `npm install` or when `node_modules` changes)
- **npm install**: `npm install` at project root, then "Build npm" in DevTools
- **Cloud functions**: Each cloud function in `cloudfunctions/<name>/` is deployed independently through WeChat DevTools (right-click → "Upload and Deploy"). They run on Node.js and use `wx-server-sdk`.
- **No test/lint scripts** are configured in `package.json`. Development relies on the DevTools simulator and console.

## Architecture

### Frontend (`miniprogram/`)

```
miniprogram/
├── app.ts / app.json / app.wxss     # App entry, global component registration, 4-theme CSS
├── pages/
│   ├── index/          # Home: fridge entry card + expiring items list
│   ├── fridge/         # Fridge view: visual zones/layers grid, expand items, swipe-delete
│   ├── fridge-create/  # Create/edit fridge config (door type, zones, constant-temp zone)
│   ├── fridge-settings/# Fridge settings: edit, members, share QR, delete
│   ├── item-edit/      # Add/edit item form (name, icon/image, qty, expiry, location)
│   ├── item-detail/    # Item detail view with edit/delete
│   ├── member-manage/  # Manage fridge members (change role, remove, transfer ownership)
│   ├── share-qrcode/   # Generate and display invite QR code with permission selection
│   ├── scan-result/    # Handle QR code scan → join fridge flow
│   └── mine/           # Profile, theme switcher, notification settings, fridge management
├── utils/
│   ├── cloud.ts        # Unified `call(name, data)` wrapper for cloud function invocation
│   ├── theme.ts        # `refreshTheme()` — propagates theme to all active pages via data-theme
│   └── icons.ts        # Item icon category map (emoji-based, 8 categories)
└── assets/images/      # Refrigerator PNGs (4 variants)
```

Each page follows WeChat's 4-file convention: `.wxml` (template), `.wxss` (styles), `.ts` (logic), `.json` (page config + `usingComponents`).

**Page navigation**: Bottom tab bar (首页 / 我的). No other pages are in the tab bar. Navigation depth should stay ≤ 5.

### Cloud Functions (`cloudfunctions/`)

All database access goes through cloud functions — **clients never connect directly to the database**.

| Function | Purpose |
|---|---|
| `login` | Get/upsert user record, return theme preference |
| `createFridge` / `updateFridge` / `deleteFridge` | Fridge CRUD (create also inserts `user_fridge`; delete cascades items + files) |
| `getFridgeList` / `getFridgeDetail` | Query fridges with item counts and expiry status |
| `updateDefaultFridge` | User's default fridge preference |
| `addItem` / `updateItem` / `deleteItem` | Item CRUD with write-permission check |
| `getExpiringItems` | Item queries with expiry status computed server-side |
| `generateQRCode` | Generate `wxacode.getUnlimited` QR code, upload to cloud storage |
| `joinFridge` | Process scanned QR → validate → create `user_fridge` record |
| `manageMember` | Change role / remove member / transfer ownership (owner only) |
| `updateUserTheme` | Persist theme preference to `users` collection |
| `checkExpiry` | Timer-triggered daily scan for expiring items, sends subscription messages |

**Auth pattern**: `_shared/auth.js` exports `checkFridgePermission(fridgeId, allowedRoles)` which validates the user via `cloud.getWXContext().OPENID` and checks their role in `user_fridge`. Each cloud function imports this as needed.

**Data model**: See [docs/prd-v1.3.2.md](docs/prd-v1.3.2.md) Section 8.2.3 for authoritative field definitions.

### Theme System

4 themes: `warm` (default), `fresh`, `modern`, `cute`. Each defines a primary color, background, and border-radius via `page[data-theme="..."]` CSS selectors in `app.wxss`. Pages set `data-theme` in `onShow()` from `app.globalData.theme`. Theme changes persist via `updateUserTheme` cloud function.

### State Colors (status tags)

Applied per-layer/item based on expiry date relative to today:
- **Green** (safe): all items expire > today + 3 days
- **Yellow** (warning/temp-expiry): any item expires ≤ today + 3 days, > today
- **Red** (danger/expired): any item expires < today

These colors are consistent across all themes.

## Critical Constraints

### TDesign Component Rules (from PRD §2)

- **Whitelist only**: Only use TDesign components listed in `app.json` `usingComponents` or registered in individual page JSON files. The full official component list (65 components) is in the PRD §2.
- **❌ NO `t-card`** — use `<view class="card">` + internal TDesign components + `.card` CSS (see PRD §2.3).
- **❌ NO `t-list`** — use `<t-cell-group>` + `<t-cell>`.
- **❌ NO `t-select`** — use `t-dropdown-menu`/`t-picker`/`t-action-sheet`/`t-radio-group` depending on context.
- **Card pattern**: All card-like containers are native `<view class="card">` styled with border-radius, margin, box-shadow. Theme-specific border-radius overrides use `page[data-theme="..."] .card` selectors.

### Data Layer Rules

- All database reads/writes go through `wx.cloud.callFunction` → cloud functions. Never use `wx.cloud.database()` directly in client code.
- Cloud function results follow `{ code: 0, data: ... }` convention. `code !== 0` is an error, `result.msg` contains the error message.
- The frontend `utils/cloud.ts` `call()` wrapper handles this convention — resolves with `data` on success, shows toast + rejects on failure.

### UI/UX Rules (from PRD §5)

- Every async operation must have feedback: `t-loading`/`t-skeleton` for page loads, button `loading` prop for submits, `t-toast` for success/error, `t-dialog` for confirmations, `t-empty` for empty states.
- Confirmations (delete, leave, etc.) always use `t-dialog` with explicit confirm/cancel buttons.
- Right-swipe delete uses `<t-swipe-cell>` with a red "删除" button, followed by `t-dialog` confirmation.

## Key Documentation

- [docs/prd-v1.3.2.md](docs/prd-v1.3.2.md) — latest PRD with complete feature specs, component whitelist, cloud implementation guide
- [prototype/](prototype/) — static HTML prototypes for each page
