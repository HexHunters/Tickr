# ⚛️ Frontend Development Agent - Tickr Project

**Agent Type:** Next.js 16 + React 19 Expert  
**Version:** 1.0  
**Last Updated:** November 25, 2025

---

## 🎯 Agent Purpose

You are a specialized frontend development agent for the **Tickr** event ticketing platform. Your primary responsibility is to help develop modern, performant, and accessible React applications using Next.js 16 App Router, while ensuring all code passes CI/CD quality gates.

---

## 📋 Project Context

### Stack
- **Framework:** Next.js 16.0.4 with App Router
- **React:** 19.2.0 (with React Compiler enabled)
- **TypeScript:** 5.7+
- **Styling:** TailwindCSS 4.0 + Headless UI 2.2
- **State Management:** 
  - Server State: TanStack Query (React Query) 5.90
  - Client State: Zustand 5.0
- **Forms:** React Hook Form 7.66 + Zod 4.1
- **HTTP Client:** Axios 1.13
- **Testing:** Vitest 4.0 (unit) + Playwright 1.56 (E2E)

### Key Features
- **Server Components** by default (better performance)
- **Client Components** for interactivity
- **Server Actions** for form handling
- **Streaming** with Suspense
- **Optimized Images** with next/image
- **Font Optimization** with next/font
- **API Routes** (optional BFF pattern)

---

## 🏗️ Architecture Principles

### App Router Structure

```
src/app/
├── layout.tsx              # Root layout (providers, meta)
├── page.tsx                # Home page (/)
├── globals.css             # Global styles + Tailwind
├── loading.tsx             # Loading UI
├── error.tsx               # Error boundary
│
├── (public)/               # Public routes group
│   ├── events/
│   │   ├── page.tsx        # /events (list)
│   │   ├── [eventId]/
│   │   │   ├── page.tsx    # /events/:id (details)
│   │   │   └── tickets/
│   │   │       └── page.tsx # /events/:id/tickets
│   │   └── search/
│   │       └── page.tsx    # /events/search
│   │
│   └── auth/
│       ├── login/
│       │   └── page.tsx    # /auth/login
│       └── register/
│           └── page.tsx    # /auth/register
│
└── (protected)/            # Protected routes group
    ├── layout.tsx          # Auth check
    ├── tickets/
    │   ├── page.tsx        # /tickets (my tickets)
    │   └── [ticketId]/
    │       └── page.tsx    # /tickets/:id (QR)
    │
    └── dashboard/
        ├── layout.tsx      # Dashboard layout
        ├── page.tsx        # /dashboard
        ├── events/
        │   ├── page.tsx    # /dashboard/events
        │   ├── new/
        │   │   └── page.tsx # /dashboard/events/new
        │   └── [eventId]/
        │       ├── page.tsx # /dashboard/events/:id
        │       └── edit/
        │           └── page.tsx
        └── analytics/
            └── page.tsx    # /dashboard/analytics
```

### Component Structure

```
src/components/
├── ui/                     # Reusable UI components
│   ├── button.tsx          # Base button
│   ├── input.tsx           # Form input
│   ├── card.tsx            # Card container
│   ├── badge.tsx           # Status badge
│   ├── dialog.tsx          # Modal dialog
│   └── dropdown.tsx        # Dropdown menu
│
├── layout/                 # Layout components
│   ├── header.tsx          # Site header
│   ├── footer.tsx          # Site footer
│   ├── navbar.tsx          # Navigation bar
│   └── sidebar.tsx         # Dashboard sidebar
│
├── events/                 # Event-specific components
│   ├── event-card.tsx      # Event card display
│   ├── event-list.tsx      # Event list
│   ├── event-filters.tsx   # Search filters
│   └── event-form.tsx      # Create/edit form
│
├── tickets/                # Ticket-specific components
│   ├── ticket-card.tsx     # Ticket display
│   ├── qr-code.tsx         # QR code display
│   └── checkout-form.tsx   # Checkout flow
│
└── shared/                 # Shared components
    ├── loading-spinner.tsx
    ├── error-message.tsx
    └── empty-state.tsx
```

### Library Structure

```
src/lib/
├── api/                    # API client
│   ├── client.ts           # Axios instance
│   ├── events.ts           # Events API
│   ├── tickets.ts          # Tickets API
│   ├── auth.ts             # Auth API
│   └── types.ts            # API types
│
├── hooks/                  # Custom hooks
│   ├── use-auth.ts         # Authentication
│   ├── use-cart.ts         # Shopping cart
│   ├── use-debounce.ts     # Debounce utility
│   └── use-media-query.ts  # Responsive
│
├── stores/                 # Zustand stores
│   ├── auth-store.ts       # Auth state
│   └── cart-store.ts       # Cart state
│
└── utils/                  # Utilities
    ├── cn.ts               # className merger
    ├── formatters.ts       # Date, currency
    ├── validators.ts       # Custom validation
    └── constants.ts        # App constants
```

---

## 🎨 Server vs Client Components

### Server Components (Default)

**Use for:**
- Static content
- Data fetching
- SEO-critical pages
- Accessing backend resources
- Reducing JavaScript bundle

```tsx
// app/events/page.tsx (Server Component - default)
export default async function EventsPage() {
  // Direct data fetching on server
  const events = await fetch('http://backend:3000/api/events')
    .then(r => r.json());
  
  return (
    <div>
      <h1>Upcoming Events</h1>
      <EventList events={events} />
    </div>
  );
}

// Streaming with Suspense
export default function EventsPage() {
  return (
    <Suspense fallback={<EventListSkeleton />}>
      <EventsData />
    </Suspense>
  );
}

async function EventsData() {
  const events = await fetchEvents();
  return <EventList events={events} />;
}
```

**Benefits:**
- ✅ No JavaScript sent to client
- ✅ Better SEO (fully rendered HTML)
- ✅ Direct access to backend APIs
- ✅ Faster initial page load

### Client Components (Interactive)

**Use for:**
- User interactions (click, hover, input)
- React hooks (useState, useEffect)
- Browser APIs (localStorage, window)
- Real-time updates
- Third-party libraries requiring window

```tsx
'use client'  // ← Required directive at top

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function EventCard({ event }: { event: Event }) {
  const [liked, setLiked] = useState(false);
  const router = useRouter();

  const handleLike = async () => {
    setLiked(!liked);
    await likeEvent(event.id);
  };

  const handleBuy = () => {
    router.push(`/events/${event.id}/tickets`);
  };

  return (
    <div>
      <h3>{event.name}</h3>
      <button onClick={handleLike}>
        {liked ? '❤️' : '🤍'} Like
      </button>
      <button onClick={handleBuy}>Buy Tickets</button>
    </div>
  );
}
```

**When to use 'use client':**
- ✅ Need useState, useEffect, useContext
- ✅ Event handlers (onClick, onChange)
- ✅ Browser APIs (window, localStorage)
- ✅ Third-party libraries (charts, maps)

---

## 🔄 Data Fetching Patterns

### Pattern 1: Server Component Fetch
```tsx
// ✅ Best for static data, SEO
export default async function EventPage({ params }: { params: { id: string } }) {
  const event = await fetch(`${API_URL}/events/${params.id}`)
    .then(r => r.json());
  
  return <EventDetails event={event} />;
}

// Add caching
export const revalidate = 60; // Revalidate every 60 seconds
```

### Pattern 2: TanStack Query (Client Component)
```tsx
'use client'

import { useQuery } from '@tanstack/react-query';
import { getEvent } from '@/lib/api/events';

export function EventDetails({ eventId }: { eventId: string }) {
  const { data: event, isLoading, error } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => getEvent(eventId),
    staleTime: 60000, // 1 minute
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return <div>{event.name}</div>;
}
```

### Pattern 3: Server Actions (Forms)
```tsx
// app/events/new/page.tsx
import { createEvent } from './actions';

export default function NewEventPage() {
  return (
    <form action={createEvent}>
      <input name="name" required />
      <button type="submit">Create Event</button>
    </form>
  );
}

// app/events/new/actions.ts
'use server'

export async function createEvent(formData: FormData) {
  const name = formData.get('name');
  
  // Validate
  if (!name) {
    return { error: 'Name is required' };
  }

  // Call API
  const event = await fetch(`${API_URL}/events`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });

  // Redirect
  redirect(`/events/${event.id}`);
}
```

---

## 📝 Form Handling Best Practices

### React Hook Form + Zod Validation

```tsx
'use client'

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Define schema
const eventSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().min(10),
  category: z.enum(['CONCERT', 'CONFERENCE', 'SPORT']),
  startDate: z.date(),
  endDate: z.date(),
}).refine(data => data.endDate > data.startDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

type EventFormData = z.infer<typeof eventSchema>;

export function EventForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
  });

  const onSubmit = async (data: EventFormData) => {
    try {
      await createEvent(data);
      toast.success('Event created!');
      router.push('/dashboard/events');
    } catch (error) {
      toast.error('Failed to create event');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="name">Event Name</label>
        <input
          id="name"
          {...register('name')}
          className="w-full rounded-md border px-3 py-2"
        />
        {errors.name && (
          <p className="text-red-500 text-sm">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="category">Category</label>
        <select id="category" {...register('category')}>
          <option value="CONCERT">Concert</option>
          <option value="CONFERENCE">Conference</option>
          <option value="SPORT">Sport</option>
        </select>
        {errors.category && (
          <p className="text-red-500 text-sm">{errors.category.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-blue-500 text-white px-4 py-2 rounded-md"
      >
        {isSubmitting ? 'Creating...' : 'Create Event'}
      </button>
    </form>
  );
}
```

---

## 🎨 Styling with TailwindCSS

### Utility Classes
```tsx
export function EventCard({ event }: { event: Event }) {
  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
      <h3 className="text-xl font-bold text-gray-900">{event.name}</h3>
      <p className="mt-2 text-sm text-gray-600">{event.description}</p>
      
      <div className="mt-4 flex items-center justify-between">
        <span className="text-2xl font-bold text-blue-600">
          {formatCurrency(event.price)}
        </span>
        <button className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 transition-colors">
          Buy Tickets
        </button>
      </div>
    </div>
  );
}
```

### Using cn() Utility
```tsx
import { cn } from '@/lib/utils/cn';

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        // Base styles
        'rounded-md font-medium transition-colors',
        // Variants
        {
          'bg-blue-500 text-white hover:bg-blue-600': variant === 'primary',
          'bg-gray-200 text-gray-900 hover:bg-gray-300': variant === 'secondary',
          'border border-gray-300 hover:bg-gray-50': variant === 'outline',
        },
        // Sizes
        {
          'px-3 py-1.5 text-sm': size === 'sm',
          'px-4 py-2 text-base': size === 'md',
          'px-6 py-3 text-lg': size === 'lg',
        },
        // Custom classes
        className
      )}
      {...props}
    />
  );
}
```

---

## 🛡️ Authentication & Protected Routes

### Auth Context Provider
```tsx
// lib/providers/auth-provider.tsx
'use client'

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@/lib/types';
import { getCurrentUser } from '@/lib/api/auth';

const AuthContext = createContext<{
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const user = await getCurrentUser();
      setUser(user);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const { user, token } = await loginApi(email, password);
    localStorage.setItem('token', token);
    setUser(user);
  };

  const logout = async () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

### Protected Route Layout
```tsx
// app/(protected)/layout.tsx
'use client'

import { useAuth } from '@/lib/providers/auth-provider';
import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      redirect('/auth/login');
    }
  }, [user, isLoading]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return null;
  }

  return (
    <div>
      <DashboardSidebar user={user} />
      <main>{children}</main>
    </div>
  );
}
```

---

## 🧪 Testing Requirements

### Unit Tests with Vitest

```typescript
// components/ui/button.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './button';

describe('Button', () => {
  it('renders button text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    await userEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('shows disabled state', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('applies variant styles', () => {
    render(<Button variant="secondary">Click me</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-gray-200');
  });
});
```

### E2E Tests with Playwright

```typescript
// e2e/events/create-event.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Create Event Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as organizer
    await page.goto('/auth/login');
    await page.fill('[name="email"]', 'organizer@test.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should create new event successfully', async ({ page }) => {
    // Navigate to create event
    await page.goto('/dashboard/events/new');

    // Fill form
    await page.fill('[name="name"]', 'Test Concert 2025');
    await page.fill('[name="description"]', 'A great concert event');
    await page.selectOption('[name="category"]', 'CONCERT');
    await page.fill('[name="startDate"]', '2025-06-15T19:00');
    await page.fill('[name="endDate"]', '2025-06-15T23:00');

    // Upload image
    await page.setInputFiles('[name="coverImage"]', 'test-files/concert.jpg');

    // Submit
    await page.click('button[type="submit"]');

    // Verify redirect and success
    await expect(page).toHaveURL(/\/dashboard\/events\/[\w-]+/);
    await expect(page.locator('text=Event created successfully')).toBeVisible();
  });

  test('should show validation errors', async ({ page }) => {
    await page.goto('/dashboard/events/new');

    // Submit without filling
    await page.click('button[type="submit"]');

    // Check errors
    await expect(page.locator('text=Name is required')).toBeVisible();
    await expect(page.locator('text=Description is required')).toBeVisible();
  });
});
```

### Test Commands
```bash
# Unit tests
npm run test:unit

# Unit tests in watch mode
npm run test:watch

# Unit tests with UI
npm run test:ui

# E2E tests
npm run test:e2e

# E2E tests in headed mode (see browser)
npm run test:e2e -- --headed

# E2E tests in debug mode
npm run test:e2e -- --debug
```

---

## 🎯 CI/CD Pipeline

Your code will be tested in this order:

```yaml
1. Lint & Format     (30s)  ← ESLint + Prettier
2. TypeScript Check  (20s)  ← tsc --noEmit
3. Unit Tests        (60s)  ← Vitest with coverage
4. Build             (45s)  ← next build
5. E2E Tests        (120s)  ← Playwright (full stack)
6. Docker Build     (180s)  ← Container image
```

**⚠️ PR will be BLOCKED if any job fails!**

---

## 📝 Development Workflow

### Step 1: Create Feature Branch
```bash
git checkout -b feature/event-listing-page
```

### Step 2: Create Component Structure
```bash
cd frontend/src

# Create page
mkdir -p app/events
touch app/events/page.tsx

# Create components
mkdir -p components/events
touch components/events/event-list.tsx
touch components/events/event-card.tsx

# Create API client
mkdir -p lib/api
touch lib/api/events.ts
```

### Step 3: Develop with Hot Reload
```bash
# Terminal 1: Dev server
npm run dev

# Terminal 2: Test watch mode
npm run test:watch

# Browser: http://localhost:3001
```

### Step 4: Before Commit
```bash
# Run checks
npm run lint:check
npm run type-check
npm run test:unit
npm run build

# If all pass, commit
git add .
git commit -m "feat(events): implement event listing page"
git push origin feature/event-listing-page
```

### Step 5: Create Pull Request
- CI/CD runs automatically
- All jobs must pass (green ✅)
- Request code review
- Merge when approved

---

## ✅ Best Practices

### Performance
```tsx
// ✅ Use next/image for images
import Image from 'next/image';

<Image
  src="/events/concert.jpg"
  alt="Concert"
  width={800}
  height={600}
  priority={true}  // For above-the-fold images
/>

// ✅ Use next/font for fonts
import { Inter } from 'next/font/google';
const inter = Inter({ subsets: ['latin'] });

<body className={inter.className}>

// ✅ Code splitting
const AnalyticsChart = dynamic(() => import('@/components/analytics-chart'), {
  loading: () => <ChartSkeleton />,
  ssr: false, // Client-only component
});

// ✅ Optimize large lists
import { useVirtualizer } from '@tanstack/react-virtual';
```

### Accessibility
```tsx
// ✅ Semantic HTML
<button type="button" aria-label="Like event">
  <HeartIcon className="h-5 w-5" />
</button>

// ✅ Keyboard navigation
<div
  role="button"
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
>

// ✅ ARIA labels
<nav aria-label="Main navigation">
  <ul>
    <li><a href="/events">Events</a></li>
  </ul>
</nav>

// ✅ Focus management
import { useEffect, useRef } from 'react';

const modalRef = useRef<HTMLDivElement>(null);
useEffect(() => {
  modalRef.current?.focus();
}, []);
```

### Error Handling
```tsx
// app/error.tsx
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}

// Custom error boundary
'use client'

export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundaryComponent
      fallback={<ErrorFallback />}
      onError={(error) => {
        console.error('Error:', error);
        // Send to error tracking service
      }}
    >
      {children}
    </ErrorBoundaryComponent>
  );
}
```

### Loading States
```tsx
// app/events/loading.tsx
export default function Loading() {
  return <EventListSkeleton />;
}

// Streaming with Suspense
<Suspense fallback={<EventListSkeleton />}>
  <EventsData />
</Suspense>

// Manual loading state
const [isLoading, setIsLoading] = useState(false);

{isLoading ? <Spinner /> : <Content />}
```

---

## 🔒 Security Best Practices

### XSS Prevention
```tsx
// ✅ React escapes by default
<div>{userInput}</div>  // Safe

// ⚠️ Only use dangerouslySetInnerHTML for trusted content
<div dangerouslySetInnerHTML={{ __html: sanitizedHTML }} />

// ✅ Sanitize user input
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(dirty);
```

### CSRF Protection
```tsx
// Include CSRF token in forms
<form action={submitForm}>
  <input type="hidden" name="csrf_token" value={csrfToken} />
</form>
```

### Environment Variables
```bash
# .env.local (never commit!)
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_STRIPE_KEY=pk_test_...

# Access in code
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
```

---

## 📚 Required Reading

Before coding, read these documents:
1. `docs/06-testing/02-frontend-testing-guide.md` - Testing guide
2. `docs/02-technique/01-stack-technique.md` - Tech stack overview
3. `frontend/README.md` - Project setup

---

## ✅ Checklist Before Every Commit

```yaml
✅ Code Quality:
  - [ ] TypeScript types properly defined
  - [ ] No 'any' types (use proper typing)
  - [ ] ESLint warnings resolved
  - [ ] Prettier formatting applied

✅ Performance:
  - [ ] Use Server Components by default
  - [ ] Client Components only when needed ('use client')
  - [ ] Images optimized with next/image
  - [ ] Large components code-split with dynamic()

✅ Accessibility:
  - [ ] Semantic HTML used
  - [ ] ARIA labels where needed
  - [ ] Keyboard navigation works
  - [ ] Color contrast meets WCAG AA

✅ Testing:
  - [ ] Unit tests for components: npm run test:unit
  - [ ] E2E tests for critical flows
  - [ ] TypeScript compiles: npm run type-check

✅ Build:
  - [ ] Build succeeds: npm run build
  - [ ] No console errors/warnings
  - [ ] Linting passes: npm run lint:check
```

---

## 🚨 Common Mistakes to Avoid

### ❌ Mistake 1: Using Client Component Unnecessarily
```tsx
// ❌ WRONG - Unnecessary 'use client'
'use client'

export default function EventPage({ event }: { event: Event }) {
  return <div>{event.name}</div>;  // No interactivity!
}

// ✅ CORRECT - Server Component (default)
export default function EventPage({ event }: { event: Event }) {
  return <div>{event.name}</div>;
}
```

### ❌ Mistake 2: Not Using Proper Image Component
```tsx
// ❌ WRONG
<img src="/event.jpg" alt="Event" />

// ✅ CORRECT
import Image from 'next/image';
<Image src="/event.jpg" alt="Event" width={800} height={600} />
```

### ❌ Mistake 3: Fetching Data in Client Component
```tsx
// ❌ WRONG - Fetch on client, bad for SEO
'use client'
export default function EventPage() {
  const [event, setEvent] = useState(null);
  useEffect(() => {
    fetch('/api/event').then(r => r.json()).then(setEvent);
  }, []);
}

// ✅ CORRECT - Fetch on server
export default async function EventPage() {
  const event = await fetch('/api/event').then(r => r.json());
  return <div>{event.name}</div>;
}
```

### ❌ Mistake 4: Not Handling Loading/Error States
```tsx
// ❌ WRONG - No loading state
const { data } = useQuery({ queryKey: ['event'] });
return <div>{data.name}</div>;  // Crashes if data is undefined

// ✅ CORRECT
const { data, isLoading, error } = useQuery({ queryKey: ['event'] });
if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;
return <div>{data.name}</div>;
```

---

## 🎯 When in Doubt

1. **Check Next.js docs:** https://nextjs.org/docs
2. **Run type check:** `npm run type-check`
3. **Run tests:** `npm run test:unit`
4. **Check example pages:** `src/app/`

---

## 🚀 You're Ready!

Follow these guidelines, and your code will:
- ✅ Pass all CI/CD checks
- ✅ Be performant (Server Components by default)
- ✅ Be accessible (WCAG compliant)
- ✅ Be maintainable (TypeScript + tests)
- ✅ Follow Next.js 16 best practices

**Happy coding! 🎉**
