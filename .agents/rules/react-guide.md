---
trigger: always_on
---

# React Project Engineering Rules (Senior-Level)

**Version:** 1.0
**Purpose:** This document defines the mandatory engineering standards, architectural principles, coding conventions, and best practices for all React projects in this repository. Every generated file, component, hook, utility, and feature must comply with these rules.

---

# Core Principles

## Non-Negotiable Rules

* Use **TypeScript only**.
* Use **functional components only**.
* Use **React Hooks** instead of class lifecycle methods.
* Prefer **composition over inheritance**.
* Prefer **server state separation** from UI state.
* Keep components **small, predictable, and reusable**.
* Never duplicate business logic.
* Favor **clarity over cleverness**.
* Write code that is easy for another senior engineer to understand in under 30 seconds.

---

# Tech Stack Standards

## Required Stack

* React 18+
* TypeScript (strict mode enabled)
* Vite (preferred) or Next.js where applicable
* React Router
* TanStack Query (React Query) for server state
* Zustand for lightweight global state
* React Hook Form for forms
* Zod for validation
* Tailwind CSS for styling
* ESLint + Prettier
* Husky + lint-staged
* Vitest + React Testing Library

---

# Project Structure

Use feature-first architecture.

src/
app/
providers/
router/
layouts/
features/
auth/
components/
hooks/
services/
types/
utils/
constants/
home/
dashboard/
shared/
components/
hooks/
ui/
Button/
Input/
Modal/
Table/
Avatar/
lib/
api/
config/
hooks/
utils/
types/
styles/
assets/
tests/

Rules:

* Business logic lives inside features.
* Shared UI components belong in shared/ui.
* Never place unrelated components in the same folder.
* Each reusable component gets its own directory.

Example:

Button/
Button.tsx
Button.test.tsx
Button.stories.tsx
index.ts

---

# Component Design Rules

## File Naming

Use PascalCase.

Correct:

UserCard.tsx
LoginForm.tsx
ProductGrid.tsx

Incorrect:

userCard.tsx
login-form.tsx
product_grid.tsx

## Component Declaration

Always use named function components.

```tsx
interface UserCardProps {
  name: string;
  avatar: string;
}

export function UserCard({ name, avatar }: UserCardProps) {
  return (
    <div>
      <img src={avatar} alt={name} />
      <span>{name}</span>
    </div>
  );
}
```

Do not use:

```tsx
const UserCard = () => {}
```

for exported components.

## Component Size

Maximum guidelines:

* 200 lines preferred
* 300 lines absolute maximum

If a component exceeds this:

* extract hooks
* extract child components
* extract utility functions

---

# Props Rules

## Strongly Typed Props

Always define explicit interfaces.

```tsx
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}
```

Never use:

```tsx
props: any
```

or

```tsx
props: unknown
```

for React components.

## Destructure Props

Correct:

```tsx
function Button({ children, disabled }: ButtonProps)
```

Incorrect:

```tsx
function Button(props: ButtonProps)
```

unless forwarding props.

---

# State Management Rules

## Local State

Use useState for:

* toggles
* modal visibility
* input values
* temporary UI state

## Global State

Use Zustand only for:

* authentication
* user preferences
* theme
* notifications
* global UI state

Never store server-fetched data in Zustand.

## Server State

Always use TanStack Query.

Correct:

```tsx
const { data, isLoading } = useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
});
```

Do not use:

```tsx
useEffect(() => {
  fetch(...)
}, [])
```

for standard data fetching.

---

# Hooks Rules

## Custom Hooks

Naming:

```tsx
useAuth()
useUser()
usePagination()
useDebounce()
```

Structure:

```tsx
export function useUser(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => getUser(id),
  });
}
```

Rules:

* Hooks must start with use.
* Never call hooks conditionally.
* Never place hooks inside loops.

---

# TypeScript Rules

## Strict Mode

Enable:

```json
{
  "strict": true
}
```

## Avoid Any

Forbidden:

```ts
any
```

Use:

* unknown
* generics
* explicit interfaces
* discriminated unions

## Type vs Interface

Use interface for object shapes.

```ts
interface User {
  id: string;
  name: string;
}
```

Use type for unions.

```ts
type Status = 'idle' | 'loading' | 'success' | 'error';
```

## Enums

Avoid enums.

Prefer:

```ts
const STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
} as const;

type Status = typeof STATUS[keyof typeof STATUS];
```

---

# API Layer Rules

Never fetch directly inside components.

Correct architecture:

Component

Hook

Service

API Client

Example:

```ts
// services/userService.ts
export async function getUser(id: string): Promise<User> {
  return api.get(`/users/${id}`);
}
```

```ts
// hooks/useUser.ts
export function useUser(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => getUser(id),
  });
}
```

---

# Error Handling

Every async operation must handle errors.

```ts
try {
  await updateUser(data);
} catch (error) {
  console.error(error);
  toast.error('Failed to update user');
}
```

Never silently ignore errors.

---

# Forms

Use React Hook Form.

Validation must use Zod.

Example:

```ts
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
```

Never manually validate large forms with multiple useState calls.

---

# Styling Rules

## Tailwind CSS

Preferred order:

* layout
* spacing
* sizing
* typography
* colors
* effects
* states

Example:

```tsx
className="
flex items-center
gap-2
px-4 py-2
text-sm font-medium
bg-blue-600 text-white
rounded-lg
shadow-sm
hover:bg-blue-700
focus:outline-none
focus:ring-2
"
```

## Class Merging

Use clsx or cn utility.

```tsx
className={cn(
  'rounded-md px-4 py-2',
  disabled && 'opacity-50'
)}
```

Do not concatenate strings manually.

---

# Accessibility Rules

Every component must satisfy basic accessibility.

Required:

* alt text on images
* labels for inputs
* button type attributes
* keyboard navigation
* visible focus states
* semantic HTML

Correct:

```tsx
<button type="submit">
```

Incorrect:

```tsx
<button>
```

---

# Performance Rules

## Memoization

Use React.memo only when profiling indicates benefit.

Use useMemo for expensive calculations.

Use useCallback only for:

* dependency stability
* memoized children
* event handler optimization

Do not overuse memoization.

## Keys

Never use array index as key for dynamic lists.

Correct:

```tsx
key={user.id}
```

Incorrect:

```tsx
key={index}
```

---

# React Query Rules

Query keys must be stable.

Correct:

```ts
['users']
['user', id]
['projects', projectId, 'tasks']
```

Mutations:

* invalidate affected queries
* optimistically update where appropriate

Example:

```ts
const mutation = useMutation({
  mutationFn: updateUser,
  onSuccess: () => {
    queryClient.invalidateQueries({
      queryKey: ['user'],
    });
  },
});
```

---

# Routing Rules

Use route constants.

```ts
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
} as const;
```

Never hardcode routes repeatedly.

---

# Environment Variables

Only access through a config module.

Example:

```ts
export const config = {
  apiUrl: import.meta.env.VITE_API_URL,
};
```

Never use import.meta.env directly throughout the codebase.

---

# Logging Rules

Development:

```ts
console.log
console.warn
console.error
```

Production:

Use a centralized logger.

Remove debugging logs before merge.

---

# Testing Rules

## Unit Tests

Test:

* hooks
* utilities
* business logic
* complex components

Example:

```tsx
describe('Button', () => {
  it('renders children', () => {
    render(<Button>Save</Button>);
    expect(screen.getByText('Save')).toBeInTheDocument();
  });
});
```

## Integration Tests

Test:

* form submission
* API interactions
* routing behavior
* authentication flows

---

# Code Organization

Order inside files:

1. imports
2. constants
3. types/interfaces
4. component
5. helper functions
6. exports

Example:

```tsx
import ...

const MAX_ITEMS = 10;

interface Props {}

export function Example() {}

function helper() {}
```

---

# Import Rules

Order imports:

1. React
2. third-party libraries
3. aliases
4. relative imports
5. styles

Example:

```ts
import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import { Button } from '@/shared/ui/Button';

import { helper } from './helper';

import './styles.css';
```

---

# Barrel Exports

Use index.ts.

```ts
export * from './Button';
```

Import:

```ts
import { Button } from '@/shared/ui/Button';
```

---

# Utility Functions

Utilities must be:

* pure
* deterministic
* independently testable

Correct:

```ts
export function formatCurrency(value: number) {
  return new Intl.NumberFormat(...).format(value);
}
```

Incorrect:

```ts
export function formatCurrency() {
  console.log(...)
}
```

---

# Security Rules

Never:

* store tokens in localStorage if secure cookies are available
* expose secrets in frontend code
* trust client-side validation
* dangerouslySetInnerHTML without sanitization

Always sanitize user-generated HTML.

---

# Git Rules

Branch naming:

feature/user-profile
fix/login-validation
refactor/api-layer
chore/update-dependencies

Commit format:

feat: add profile page
fix: resolve login race condition
refactor: simplify dashboard hooks
test: add auth integration tests
docs: update setup guide

---

# Pull Request Checklist

Before every PR:

* TypeScript passes
* ESLint passes
* Prettier passes
* Tests pass
* No console logs
* No dead code
* No TODO comments
* Accessibility checked
* Responsive behavior verified

---

# AI Generation Rules

When generating code, always:

* use TypeScript
* use functional components
* define explicit prop interfaces
* avoid any
* avoid unnecessary useEffect
* use TanStack Query for fetching
* use React Hook Form + Zod for forms
* use Tailwind CSS
* keep components under 200 lines
* extract reusable logic into hooks
* follow feature-first architecture
* write production-ready code
* include loading, empty, and error states
* ensure accessibility compliance
* ensure responsive design
* ensure proper TypeScript inference
* avoid premature optimization
* prefer readability over abstraction

---

# Golden Rule

**Every piece of code should be maintainable by a senior engineer six months later without requiring additional explanation.**
If a simpler implementation exists that achieves the same result, use the simpler implementation.
