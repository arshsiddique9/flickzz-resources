# 🎮 FlickZZ Resources

> A modern Minecraft resources download platform — plugins, mods, modpacks, configs, and tools.

**Owner:** Arsh Siddique
**© 2026 FlickZZ Resources. All rights reserved.**

![Stack](https://img.shields.io/badge/Stack-HTML%20%7C%20CSS%20%7C%20JS-6366f1?style=flat-square)
![Backend](https://img.shields.io/badge/Backend-Firebase-f59e0b?style=flat-square)
![Deploy](https://img.shields.io/badge/Deploy-Vercel-000000?style=flat-square)

---

## 🌟 Project Overview

FlickZZ Resources is a sleek, fast, and beginner-friendly platform where users sign up, browse, and download Minecraft-related resources. Admins manage all content via a dedicated panel. The entire stack is frontend + Firebase — no servers to maintain.

> 🇮🇳 **Hinglish users:** Step-by-step deployment guide in Hinglish — [**SETUP-HINGLISH.md But this file was deleted for some reason**](./SETUP-HINGLISH.md)

### ✨ Completed Features

#### 👤 User Side
- ✅ Modern animated landing page with hero, categories, featured section, CTA
- ✅ **Brand logo** (image-based) on navbar, footer, auth pages, and as favicon
- ✅ **Real-time live stats** on home page — Resources / Downloads / Members are **fetched live from Firestore** (no hardcoded demo numbers)
- ✅ Email/Password + Google sign-up & login (Firebase Auth)
- ✅ Resource browsing with **search**, **category filter**, and **sorting** (newest / popular / rating / A-Z)
- ✅ Resource detail page with description, version, Minecraft compatibility, file size
- ✅ **Gated downloads** (must be logged in; every download tracked)
- ✅ **5-star rating system** per resource
- ✅ **❤️ Like / Unlike** system per resource (signed-in users)
- ✅ **Threaded Comments** with **reply support** (YouTube-style nested replies)
- ✅ Comment moderation (delete own; admins can delete any)
- ✅ **🏆 Community Leaderboard page** — Top Downloaders / Raters / Likers / Commenters (live)
- ✅ **👑 Owner Badge** — owner's comments, replies & leaderboard entry are auto-highlighted in gold
- ✅ **Feedback section on home page** — logged-in users only, with star rating + text (admin-moderated)
- ✅ **YouTube channel promo banner** with click-to-open (URL hidden from HTML markup)
- ✅ **Discord community banner** with click-to-open (URL hidden from HTML markup)
- ✅ Branded social icons in footer (Discord blue / YouTube red on hover)
- ✅ **User dashboard** with personal stats + recent downloads
- ✅ **Dark / Light theme** toggle (persisted)
- ✅ Fully responsive (mobile, tablet, desktop)
- ✅ Smooth animations: fade-in, hover-lift, scroll-reveal, animated counters
- ✅ Toast notification system

#### 🔑 Owner-Only Admin Panel (Hidden)
- ✅ **Hidden URL:** `/flickzz-control-panel-x7k.html` (no public link anywhere)
- ✅ **4-Layer security:** Hidden URL + Owner Email + Optional UID lock + Secret Access Code + Server rules
- ✅ **5-attempt lockout** (5 min) on wrong access code
- ✅ `<meta noindex>` so search engines never list it
- ✅ **8-tab sidebar layout:**
  1. **Dashboard** — live stats + top resources + recent users
  2. **Upload Resource** — file upload with progress bar
  3. **Manage Resources** — edit / delete / feature toggle
  4. **Users** — ban / unban / make-admin / delete
  5. **Comments** — moderate all comments site-wide (collectionGroup)
  6. **Feedback** — hide / show / delete testimonials
  7. **Downloads Analytics** — user-wise & resource-wise stats
  8. **Site Settings (LIVE)** — edit Discord/YouTube URLs, hero text, announcement banner, maintenance mode — changes apply to all users in real-time via Firestore `onSnapshot`

#### 📄 Legal & Policy
- ✅ Terms of Service page (ownership, content policy, restrictions)
- ✅ Privacy Policy page
- ✅ About page
- ✅ Legal notice in footer (© 2026 FlickZZ Resources. Owned by Arsh Siddique.)
- ✅ Custom 404 page

#### 🔒 Basic Protection (UI-level deterrents)
- ✅ Right-click disabled
- ✅ F12 / Ctrl+Shift+I / Ctrl+U / Ctrl+S blocked
- ✅ Image dragging disabled
- ✅ Console branding warning
- ✅ Large-copy warning hook

> ⚠️ These are **deterrents**, not real security. Real security is enforced via Firebase rules.

---

## 📁 Folder Structure

```
flickzz-resources/
├── index.html                  # Home page (with feedback + YouTube + Discord)
├── resources.html              # Browse all resources
├── resource-detail.html        # Single resource page (downloads, ratings, comments)
├── login.html                  # User login
├── signup.html                 # User signup
├── dashboard.html              # Logged-in user dashboard
├── flickzz-control-panel-x7k.html  # 🔐 Hidden admin panel (owner-only)
├── leaderboard.html            # 🏆 Public leaderboard page
├── about.html                  # About page
├── terms.html                  # Terms of Service
├── privacy.html                # Privacy Policy
├── 404.html                    # Custom not-found page
│
├── images/
│   └── logo.png                # FlickZZ logo (favicon + navbar + footer)
│
├── css/
│   ├── style.css               # Main stylesheet (minimal, dark+light, branded)
│   ├── animations.css          # Reusable animations
│   ├── features.css            # Likes, owner badge, threaded replies, leaderboard
│   └── admin.css               # Owner admin panel layout
│
├── js/
│   ├── firebase-config.js      # 🔧 Firebase init + admin email list  ← EDIT THIS
│   ├── site-config.js          # 🔧 Social links (Discord/YouTube) + brand
│   ├── auth.js                 # Auth state, sign-up, sign-in, logout
│   ├── main.js                 # Theme, navbar, toast, scroll reveal
│   ├── home.js                 # Home page (REAL live stats + featured)
│   ├── resources.js            # Listing/search/filter
│   ├── resource-detail.js      # Detail page (download, likes, rating, threaded comments)
│   ├── resources-api.js        # Firestore CRUD + Storage uploads + live stats
│   ├── likes-api.js            # ❤️ Like/unlike + count
│   ├── leaderboard-api.js      # 🏆 Top users aggregation (collectionGroup)
│   ├── leaderboard.js          # Leaderboard page logic (4 tabs)
│   ├── feedback-api.js         # Feedback submission + moderation
│   ├── feedback.js             # Home page feedback widget
│   ├── settings-api.js         # Live site-settings Firestore sync
│   ├── users-api.js            # Admin user management + collectionGroup queries
│   ├── dashboard.js            # User dashboard
│   ├── admin.js                # Owner admin panel (4-layer security)
│   ├── login.js / signup.js    # Auth page scripts
│   └── protection.js           # Right-click / devtools deterrents
│
├── firestore.rules             # 🔐 Firestore security rules (incl. feedback)
├── storage.rules               # 🔐 Storage security rules
├── firebase.json               # Firebase CLI config
├── vercel.json                 # Vercel deployment config
├── .gitignore
├── README.md                   # English documentation (you are here)
└── SETUP-HINGLISH.md           # 🇮🇳 Hinglish step-by-step deployment guide
```

---

## 🚀 Quick Start (Beginner-Friendly)

### 1. Clone or download this project

```bash
git clone <your-repo-url>
cd flickzz-resources
```

### 2. Preview locally

Because Firebase uses ES modules, you must serve the files over HTTP (not `file://`).
Pick any of these:

```bash
# Option A — Python (no install)
python3 -m http.server 5500

# Option B — Node.js
npx serve .

# Option C — VS Code Live Server extension
# Right-click index.html → "Open with Live Server"
```

Then visit `http://localhost:5500` (or whatever port your server prints).

> 💡 The site will load with **demo resources** until you configure Firebase.

---

## 🔥 Firebase Setup (Step-by-Step)

### Step 1 — Create a Firebase project

1. Go to <https://console.firebase.google.com/>
2. Click **Add project**
3. Name it `flickzz-resources` (or anything you like)
4. Disable Google Analytics (optional) → Create project

### Step 2 — Register a Web App

1. On the project overview, click the **`</>` (Web)** icon
2. App nickname: `flickzz-web`
3. **Do NOT** enable Firebase Hosting here (we use Vercel)
4. Click **Register app**
5. Copy the `firebaseConfig` object shown

### Step 3 — Paste config into the project

Open `js/firebase-config.js` and replace the placeholders:

```js
const firebaseConfig = {
    apiKey: "AIzaSy...",                      // ← paste yours
    authDomain: "flickzz-xxxx.firebaseapp.com",
    projectId: "flickzz-xxxx",
    storageBucket: "flickzz-xxxx.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:1234...:web:abcdef..."
};
```

Also update the **admin email list** in the same file:

```js
export const ADMIN_EMAILS = [
    "youradmin@gmail.com"   // ← your admin accounts
];
```

### Step 4 — Enable Authentication

1. Firebase Console → **Build** → **Authentication** → **Get started**
2. **Sign-in method** tab:
   - Enable **Email/Password**
   - Enable **Google** (optional but recommended)
3. Save.

### Step 5 — Create Firestore Database

1. Firebase Console → **Build** → **Firestore Database** → **Create database**
2. Start in **production mode**
3. Pick the closest region (e.g. `asia-south1`)
4. Click **Enable**

#### Apply Firestore rules

Open `firestore.rules` in this project and:
- Replace the `ADMIN_EMAILS` list inside the `isAdmin()` function with your real admin emails
- Copy the entire file's content
- Go to Firestore → **Rules** tab → paste → **Publish**

### Step 6 — Enable Storage

1. Firebase Console → **Build** → **Storage** → **Get started**
2. Start in **production mode** → Next → Done

#### Apply Storage rules

Open `storage.rules`:
- Again replace the admin email list with yours
- Copy the contents
- Go to Storage → **Rules** tab → paste → **Publish**

### Step 7 — Create your first admin account

1. Run the site locally (`python3 -m http.server 5500`)
2. Go to `/signup.html`
3. Sign up with the **exact email** you listed in `ADMIN_EMAILS`
4. Log in → you'll see the **Admin** link in the navbar
5. Upload your first resource 🎉

---

## ☁️ Deploy to Vercel (Free, 24/7)

### Option A — One-click via GitHub

1. Push this project to a **GitHub repository**
2. Go to <https://vercel.com/new>
3. Click **Import Git Repository** → select your repo
4. **Framework Preset:** `Other`
5. **Root Directory:** `./` (default)
6. **Build command:** leave blank
7. **Output directory:** leave blank (serves files as-is)
8. Click **Deploy**
9. Your site is live at `https://flickzz-resources.vercel.app` 🚀

### Option B — Vercel CLI

```bash
npm i -g vercel
vercel login
vercel            # follow prompts
vercel --prod     # deploy to production
```

### Option C — Firebase Hosting (alternative)

```bash
npm i -g firebase-tools
firebase login
firebase init             # choose Hosting; public dir = "."; single-page = No
firebase deploy
```

### Adding your Vercel domain to Firebase Auth

After deployment, Firebase will block Google sign-in from unknown domains.

1. Firebase Console → Authentication → **Settings** → **Authorized domains**
2. Add your Vercel domain (e.g. `flickzz-resources.vercel.app`)
3. Add any custom domain you attach later

---

## 🗂️ Data Models (Firestore Collections)

| Collection | Docs keyed by | Fields |
|---|---|---|
| `users` | `uid` | `email`, `displayName`, `photoURL`, `isAdmin`, `createdAt` |
| `resources` | auto ID | `title`, `tagline`, `description`, `category`, `version`, `mcVersion`, `thumbnail`, `fileUrl`, `filePath`, `fileName`, `fileSize`, `featured`, `downloads`, `ratingSum`, `ratingCount`, `createdAt`, `updatedAt` |
| `resources/{id}/ratings` | `userId` | `value` (1-5), `updatedAt` |
| `resources/{id}/comments` | auto ID | `userId`, `userName`, `text`, `createdAt` |
| `downloads` | auto ID | `userId`, `resourceId`, `downloadedAt` |
| `feedback` | auto ID | `userId`, `userName`, `userEmail`, `rating` (1-5), `text`, `hidden`, `createdAt` |

### Storage Buckets

| Path | Purpose |
|---|---|
| `resources/{timestamp}_{filename}` | Uploaded plugin/mod files |

---

## 🧭 Functional Routes (URIs)

| Path | Description | Query Params | Auth Required |
|---|---|---|---|
| `/` or `/index.html` | Landing page | — | No |
| `/resources.html` | Browse all resources | `?category=plugin\|mod\|modpack\|config\|tool`, `?q=search` | No |
| `/resource-detail.html` | View single resource | `?id={resourceId}` | No (download = yes) |
| `/login.html` | Log in | — | — |
| `/signup.html` | Create account | — | — |
| `/dashboard.html` | Personal dashboard | — | ✅ Yes |
| `/admin.html` | Admin panel | — | ✅ Admin only |
| `/about.html` | About page | — | No |
| `/terms.html` | Terms of Service | — | No |
| `/privacy.html` | Privacy Policy | — | No |

---

## 🎨 Tech Stack

- **Frontend:** Vanilla HTML5 + CSS3 + JavaScript (ES Modules, no framework)
- **Icons:** Font Awesome 6 (via jsDelivr CDN)
- **Fonts:** Inter (Google Fonts)
- **Auth:** Firebase Authentication (Email/Password + Google)
- **Database:** Cloud Firestore
- **Storage:** Firebase Storage
- **Hosting:** Vercel (primary) or Firebase Hosting

---

## 🛠️ Customization Tips

- **Branding:** Change the logo / colors in `css/style.css` under `:root` (CSS variables)
- **Admins:** Edit `ADMIN_EMAILS` in `js/firebase-config.js` AND the same list in `firestore.rules` + `storage.rules`
- **File size limit:** Default 50 MB. Change in `js/admin.js` (`50 * 1024 * 1024`) and `storage.rules`
- **Featured count:** Home page shows 6 featured items — change in `js/home.js` (`max: 6`)
- **Disable protection:** Remove the `<script src="js/protection.js"></script>` line from every page

---

## 🔒 Security Notes

- All admin-only operations are enforced by **Firestore / Storage rules** (server-side), not just UI
- Client-side email check in `isAdminEmail()` is only for UI convenience
- Firebase API keys in the config file are **public by design** — security depends on rules, not on hiding keys
- Never commit secrets or service-account JSON files
- Review the rules files carefully before going live

---

## ❌ Features Not Yet Implemented (Future Ideas)

- [ ] Email verification flow
- [ ] Password reset page (Firebase supports it natively — just add a link)
- [ ] Resource version history / changelogs
- [ ] Comment replies / threading
- [ ] User profile pages (public)
- [ ] Favorites / bookmarks
- [ ] Tags / multi-category
- [ ] Analytics dashboard with charts (Chart.js) for admins
- [ ] Email notifications for new uploads
- [ ] Bulk upload tool
- [ ] Dark/Light system theme auto-detect
- [ ] Internationalization (i18n)

---

## 🧪 Recommended Next Steps

1. **Right after setup:** Test signup, login, admin upload, download, rating, comment flows end-to-end
2. **Before going live:** Review `firestore.rules` & `storage.rules`; test with the Firebase Rules Simulator
3. **SEO:** Add `og:` / Twitter meta tags, favicon (replace the `<i class="fas fa-cube">` logo with a real SVG/PNG)
4. **Performance:** Set up a CDN for Storage (Firebase Storage already uses Google's CDN); enable Firestore offline persistence if needed
5. **Monitoring:** Enable Firebase Analytics and Performance Monitoring
6. **Backups:** Schedule periodic Firestore exports (Cloud Scheduler → `gcloud firestore export`)
7. **Custom domain:** Connect your domain via Vercel → Settings → Domains

---

## 📞 Support & Contact

For questions about this project or to report a takedown:

- **Owner:** Arsh Siddique
- **Platform:** FlickZZ Resources

---

## 📜 License & Ownership

© 2026 FlickZZ Resources. All rights reserved.
**Owned exclusively by Arsh Siddique.**

All content, branding, design, and codebase are protected intellectual property.
Unauthorized copying, redistribution, cloning, or reuse of any part of this platform is strictly prohibited.

**Minecraft disclaimer:** FlickZZ Resources is not affiliated with, endorsed by, or connected to Mojang AB, Microsoft, or Minecraft. "Minecraft" is a trademark of Mojang AB.
