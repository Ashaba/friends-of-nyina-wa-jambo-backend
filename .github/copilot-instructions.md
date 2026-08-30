# GitHub Copilot Instructions

This is a full-stack web project consisting of a **Strapi v5+ headless CMS** backend and a **Next.js** frontend. Follow these guidelines across both layers to ensure consistent, clean, and performant code.

---

## General Principles

These apply to all code in this project, regardless of layer.

- **Readability first:** Prioritize readable, maintainable, and reusable code over cleverness.
- **TypeScript everywhere:** All new code must be written in TypeScript with strict mode enabled.
- **DRY:** Extract reusable logic into functions, hooks, services, or utilities — not components or controllers.
- **Single responsibility:** Functions, components, and services should do one thing well at one level of abstraction.
- **Descriptive naming:** Long, clear names over short, vague ones — even at the cost of verbosity (e.g., `getUserProfileById`, `PaymentProcessingService`).
- **No barrel files:** Always import directly from the specific file path to avoid circular dependencies and improve traceability.
- **Pure functions:** Favor pure functions where possible — they are easier to test and reason about.
- **Minimal API surface:** Expose only what is necessary. Hide implementation details.
- **Design for replaceability:** Write code that is easy to delete or swap out without cascading changes.
- **Co-locate change:** Group code by feature, not by type. Files that change together should live together.
- **Typesafety across the stack:** Types must be consistent from database → server → client. If a type changes, all consumers must be updated.
- **Comments:** Only comment code that provides additional context or explains non-obvious logic. Do not comment self-explanatory code.
- **Package management:** This project uses `pnpm`. Always use `pnpm` for installs and scripts.
- **Documentation:** All principal documentation lives in the `docs/` folder. Keep docs concise and clear — avoid unnecessary verbosity and emojis.

---

## Async & Validation

- **Async/Await:** Use `async/await` for all asynchronous operations — no raw `.then()` chains.
- **Zod validation:** Use [Zod](https://zod.dev) for schema validation of all external data (API responses, form inputs, environment variables).
- **Server Actions:** Use `"use server"` for all form submissions and data mutations in Next.js.
- **Next.js 15+ async APIs:** `params` and `searchParams` in layouts and pages are Promises — always `await` them.

---

## Backend — Strapi v5+

### Architecture

- **Thin controllers:** Keep controllers as thin request/response handlers. Move all business logic, data transformation, and external API calls into **Services**.
- **Document Service API:** Use the [Strapi Document Service](https://docs.strapi.io) for all CRUD operations. Only reach for the low-level Query Engine when raw SQL-level performance is explicitly required.
- **Lifecycle hooks over controllers:** Use [Lifecycle Hooks](https://docs.strapi.io) (e.g., `beforeCreate`, `afterUpdate`) for side effects that must trigger regardless of what initiated the operation (API, Admin panel, etc.).

### TypeScript

- **Generated types:** Run `strapi ts:generate-types` to keep schema types in sync. Never manually duplicate generated types.
- **Custom types:** Store custom interfaces in `src/extensions/types.ts` or a co-located `types.ts` within the relevant feature folder.
- **DTOs:** When returning data from a custom controller, define an explicit return shape to avoid leaking internal fields.

### Strapi-Specific Patterns

- **Population control:** Always be explicit with `populate`. Never use `populate: '*'` — use nested population objects scoped to the fields actually needed.
- **Policies:** Use [Policies](https://docs.strapi.io) for custom authorization logic.
- **Middlewares:** Use [Middlewares](https://docs.strapi.io) for request/response augmentation (e.g., logging, header injection).
- **Plugin structure:** Local plugins live under `src/plugins/`. Keep `admin` and `server` logic strictly separated within a plugin.

### Error Handling

- Use `utils.errors` from `@strapi/utils` (e.g., `NotFoundError`, `ValidationError`, `ForbiddenError`) to produce correct HTTP status codes. Do not throw plain `Error` objects from controllers or services.

---

## Frontend — React & Next.js

### Component Design

- **Functional components only:** Use functional components with React Hooks. Avoid class components (exception: error boundaries).
- **Small and focused:** Each component should have one primary responsibility. Split large components early.
- **Naming:** Use `PascalCase` for all component names (e.g., `UserAvatar`, `ProductCard`).
- **Props:** Destructure props in the function signature. Define all prop shapes with a TypeScript `interface` or `type` — never use inline anonymous types for public component props.
- **Immutability:** Never mutate props or state directly. Always produce new objects/arrays for updates.
- **Fragments:** Use `<>...</>` to avoid unnecessary wrapper elements.
- **UI components:** Use [shadcn/ui](https://ui.shadcn.com/) for building UI to ensure consistency and accessibility.

### Hooks & State

- **Local state:** `useState` for component-level state.
- **Shared/global state:** React Context API or a dedicated library (Zustand, Jotai). Avoid prop drilling.
- **Custom hooks:** Extract reusable stateful or side-effectful logic into custom hooks (e.g., `useDebounce`, `useLocalStorage`, `useAuth`).

### Data Fetching

- **Server Components first:** Fetch data in `async` Server Components wherever possible. Reserve Client Components for interactivity.
- **Parallel fetching:** When fetching multiple independent data sources, initiate all requests in parallel (e.g., `Promise.all`).
- **Avoid client-side fetching for initial loads** unless the data is inherently user-specific post-hydration.
- **Revalidation:** For rarely-changing data, use `fetch` with `{ next: { revalidate: N } }` in Server Components.

### Routing & Structure (App Router)

- **App Router only** for all new development.
- **Route groups:** Use `(folderName)` to organize routes without affecting the URL.
- **Dynamic routes:** Use clearly named segments (e.g., `[slug]`, `[id]`).
- **Middleware:** Use `middleware.ts` for authentication, authorization, or global request handling.
- **Feature colocation:** Co-locate component files (`.tsx`, styles, tests) within their feature folder.
- **Utilities:** All general utility and helper functions live in the `lib/` folder.
- **Types:** All TypeScript types and interfaces live in the `types/` folder with descriptive filenames (e.g., `types/user.ts`, `types/post.ts`). Do not define types inside components.
- **Private folders:** Use underscore-prefixed folders (e.g., `_components`, `_lib`) for internal, non-route files.

### Styling

- **Tailwind CSS v4+** is the only styling approach. Do not introduce CSS Modules, styled-components, or inline styles.
- Ensure styles are scoped to their component context to avoid unintended global side effects.

### Performance & Optimization

- **Keys:** Always use a unique, stable `key` when rendering lists. Never use array index as a key if the list can change.
- **Lazy loading:** Use `React.lazy` + `Suspense` or `next/dynamic` to code-split large or non-critical components.
- **Images:** Always use `next/image`. Never use a raw `<img>` tag.
- **Fonts:** Use `next/font` for font optimization.

### SEO & Accessibility

- **Metadata:** Use `generateMetadata` (App Router) for all SEO metadata.
- **Accessibility:** Use semantic HTML, ARIA attributes, and ensure full keyboard navigation support.
