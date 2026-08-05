# OrderNest

A restaurant table & order management app built with React Native and Expo. OrderNest lets restaurant managers set up their menu and tables, staff take and track orders, chefs manage kitchen-side menu availability, and customers place orders directly from their table via a self-service ordering screen.

## Tech Stack

- **Framework:** [Expo](https://expo.dev) SDK 54, [Expo Router](https://docs.expo.dev/router/introduction/) (file-based routing, typed routes)
- **Runtime:** React 19, React Native 0.81, React DOM (web target via `react-native-web`)
- **Language:** TypeScript
- **Backend:** Firebase (Auth, Firestore, Storage, Analytics) — no separate API server; the client talks to Firebase directly
- **Data/state:** TanStack React Query (Firebase data fetching/caching), MobX (lightweight user store)
- **Analytics:** PostHog (web + native), Firebase Analytics
- **Package manager:** Yarn Berry (`yarn@4.11.0`)
- **Build & deploy:** EAS Build/Submit/Update (native apps), Vercel (static web export)

## Project Structure

```
app/                       Expo Router screens (file-based routing)
├── (auth)/                 login, signUp, forgotPassword, onboarding
├── (manager)/(tabs)/       manager dashboard, users, settings (+ orders, tables, menuItem)
├── (staff)/(tabs)/         staff home, order taking, settings
├── (chef)/(tabs)/          chef home, kitchen menu items, settings
├── (customer)/             public/QR self-service ordering screen
├── index.tsx                splash/router — redirects by auth state & user role
├── delete-account.tsx       public account-deletion page (Play Store requirement)
└── _layout.tsx               root providers (React Query, PostHog, SafeArea)

components/                 Shared UI components & modals (orders, menu, tables, users, bills)
firebase/
├── config.ts                Firebase app/auth/firestore/storage/analytics init
├── types.ts                  Domain TypeScript types
├── services/                 Firestore CRUD service classes (one per collection)
├── hooks/                     React Query hooks wrapping the services
└── stores/userStore.ts        Cached user/session store (AsyncStorage)

posthog/                    PostHog screen-tracking hook
theme/                      App theme/colors
assets/                     Icons, splash screens
google-services.json         Firebase Android config
GoogleService-Info.plist     Firebase iOS config
app.json / eas.json          Expo app config & EAS build profiles
vercel.json                  Web export hosting config
```

## Prerequisites

- Node.js and [Yarn Berry](https://yarnpkg.com/) (this repo pins `yarn@4.11.0` via `packageManager`)
- A Firebase project with **Auth**, **Firestore**, and **Storage** enabled
- A [PostHog](https://posthog.com) project (for analytics)
- For native builds: Android Studio (Android SDK 35) and/or Xcode with CocoaPods, or an [EAS](https://docs.expo.dev/eas/) account to build in the cloud

## Setup Guide

### 1. Install dependencies

```bash
yarn install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in your Firebase and PostHog credentials:

```bash
cp .env.example .env
```

```
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=
EXPO_PUBLIC_POST_HOG_API_KEY=
```

### 3. Add native Firebase config (for native builds)

Place your Firebase console-generated config files at the project root:
- `google-services.json` (Android)
- `GoogleService-Info.plist` (iOS)

### 4. Run the app

```bash
# Start the Metro dev server (Expo Go / dev client)
yarn start

# Run on a connected Android device/emulator
yarn android

# Run on a connected iOS device/simulator (macOS only)
yarn ios

# Run in a browser
yarn web
```

### 5. Build & deploy

```bash
# Build a static web export into dist/
yarn web:export

# Deploy the web export via EAS
yarn web:deploy

# Native builds/submissions are configured in eas.json (development, preview, production profiles)
eas build --profile production --platform android
eas submit --profile production --platform android
```

### Linting & formatting

```bash
yarn lint     # eslint + prettier check
yarn format   # eslint --fix + prettier --write
```

## Database Structure (Cloud Firestore)

OrderNest has no traditional SQL database — all data lives in **Cloud Firestore**, a NoSQL document store. Each top-level collection below has a matching TypeScript type in `firebase/types.ts` and a CRUD service class in `firebase/services/`.

### `users`
| Field | Type | Notes |
|---|---|---|
| id | string | Document ID = Firebase Auth UID |
| name | string | |
| email | string | |
| photoURL | string | |
| isOnboarded | boolean | Drives the onboarding redirect |
| type | `'manager' \| 'staff' \| 'chef'` | Role, determines which tab group the user lands in |
| fcmToken | string[] | Push notification tokens |
| restaurantId | string | → `restaurants.id` |
| createdAt / updatedAt | Timestamp | |

### `restaurants`
| Field | Type | Notes |
|---|---|---|
| id | string | |
| userId | string | Owning manager's UID |
| name | string | |
| address | string | |
| photoURL | string? | Restaurant logo/photo |
| gst_number | string? | |
| gst_percentage | number | Tax rate applied to orders |
| service_charge | number | |
| legal_docs | string[] | Uploaded document URLs (Storage) |

### `menu_items`
| Field | Type | Notes |
|---|---|---|
| id | string | |
| restaurant_id | string | → `restaurants.id` |
| name | string | |
| category | string | |
| description | string | |
| price | number | |
| image_url | string | |
| available | boolean | Toggled by chef/manager |

### `tables`
| Field | Type | Notes |
|---|---|---|
| id | string | |
| restaurant_id | string | → `restaurants.id` |
| table_number | number | Used for ordering/sorting |
| table_name | string | |
| status | string | e.g. Empty / Occupied / Billed / Paid |
| assigned_waiter_id | string? | → `users.id` |

### `orders`
| Field | Type | Notes |
|---|---|---|
| id | string | |
| table_id | string | → `tables.id` |
| waiter_id | string | → `users.id` |
| order_items | `OrderItem[]` | Embedded array (see below) |
| total_amount | number | |
| gst_amount | number | |
| service_charge_amount | number | |
| final_total | number | Computed server-side by the order service |
| status | string | Pending / Preparing / Served / Paid |

**`OrderItem`** (embedded in `orders.order_items`): `menu_item_id`, `qty`, `price`, `delivered: boolean`.

### `bills`
| Field | Type | Notes |
|---|---|---|
| id | string | |
| order_id | string | → `orders.id` |
| total | number | |
| gst | number | |
| discount | number | |
| grand_total | number | `total + gst - discount` |
| payment_status | string | Pending / Paid / Failed |

### `invite`
| Field | Type | Notes |
|---|---|---|
| id | string | `${userId}-${random}` |
| name | string | |
| email | string | |
| type | `'staff' \| 'chef'` | |
| restaurantId | string | → `restaurants.id` |
| password | string | Pre-provisioned password for the invited user |
| createdAt | Timestamp | |

All service classes strip `undefined` fields before writing, stamp `createdAt`/`updatedAt` with `serverTimestamp()`, and most expose both one-shot fetch methods and real-time `onSnapshot` subscriptions (e.g. live order/table status updates).

## Functionality

### Roles & routing
On launch, `app/index.tsx` checks Firebase Auth state and the user's Firestore `users.type`, then routes accordingly:
- Not signed in → login
- Signed in but not onboarded → onboarding (create restaurant profile)
- `manager` → manager dashboard
- `staff` → staff dashboard
- `chef` → chef dashboard

### Authentication (`app/(auth)/`)
- Email/password login and sign-up, with role selection (manager/staff/chef) at sign-up
- Forgot password flow
- Onboarding: create the restaurant profile (name, address, GST number/percentage, service charge, logo upload)

### Manager
- **Dashboard** — restaurant overview
- **Users** — invite and manage staff/chef accounts
- **Orders** — full order lifecycle: create, edit, update status, bill
- **Tables** — create tables, assign waiters, track table status
- **Menu items** — add/edit menu items (name, category, price, image, availability)
- **Settings** — restaurant profile editing, password change, account deletion

### Staff
- Take and manage orders for assigned tables, update order/table status

### Chef
- View and toggle availability of kitchen-facing menu items, view incoming order details

### Customer (self-service)
- Public ordering screen (typically reached via a per-table QR code) where a customer browses the live restaurant menu and adds items to the table's active order in real time

### Account deletion
`app/delete-account.tsx` is a standalone public web page (re-authenticates with email/password, then deletes the Firestore user document and Firebase Auth account) — required by Google Play Console's account-deletion policy.

### Notifications & analytics
- FCM tokens are stored per-user (`users.fcmToken`) for push notifications
- Screen views and user activity are tracked via both PostHog and Firebase Analytics

## Third-Party Integrations

- **Firebase** — Auth, Firestore, Storage, Analytics (web SDK + native `@react-native-firebase` modules)
- **PostHog** — product analytics and screen tracking
- **EAS (Expo Application Services)** — native builds, store submission, and OTA updates
- **Vercel** — hosts the static web export
- **Google Play Console** — account-deletion compliance page

## License

Proprietary — Brilworks Software
