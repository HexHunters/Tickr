# 🎨 Tickr Frontend

**Stack:** React 19 + TypeScript + Vite + TailwindCSS

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 📦 Tech Stack

- **Framework:** React 19 with TypeScript
- **Build Tool:** Vite 7.x
- **Styling:** TailwindCSS + HeadlessUI
- **State Management:** Zustand + React Query
- **Routing:** React Router DOM
- **Forms:** React Hook Form + Zod
- **HTTP Client:** Axios
- **Icons:** Heroicons
- **Testing:** Vitest + Testing Library

---

## 📂 Project Structure

```
frontend/
├── src/
│   ├── app/                    # App configuration & routing
│   ├── components/             # Reusable UI components
│   ├── pages/                  # Page components
│   ├── hooks/                  # Custom React hooks
│   ├── services/               # API services
│   ├── store/                  # Zustand stores
│   ├── types/                  # TypeScript types
│   ├── utils/                  # Utility functions
│   └── assets/                 # Static assets
│
├── public/                     # Public assets
├── .env.local                  # Local environment (git-ignored)
├── tailwind.config.js          # Tailwind configuration
├── vite.config.ts              # Vite configuration
└── package.json
```

---

## 🔧 Environment Variables

File: `.env.local` (created from `.env.example`)

```env
VITE_API_URL=http://localhost:3000
VITE_API_TIMEOUT=30000
VITE_APP_NAME=Tickr
VITE_APP_VERSION=1.0.0
```

---

## 📝 Available Scripts

```bash
npm run dev           # Dev server (http://localhost:5173)
npm run build         # Build for production
npm run preview       # Preview production build
npm run test          # Run tests
npm run lint          # Run ESLint
npm run format        # Format code with Prettier
```

---

**Ready to build! 🎉**
