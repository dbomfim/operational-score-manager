# Architecture Decisions — API Transport Layer

> **Decision recorded:** 2026-02-26
> **Outcome:** Full-stack TypeScript monorepo — tRPC for the API layer between a new backend and the frontend. REST kept only for file uploads and external Okta/IAM calls.

---

## The Question

> *"Should we use REST, GraphQL, or tRPC? Can we mix them? Is mixing good practice?"*

---

## Comparison: REST vs GraphQL vs tRPC

### REST

The classic approach. Resources are URLs, verbs are HTTP methods, data shapes are JSON with no contract enforcement beyond documentation.

**Strengths:**
- Universal — every language, every tool understands it
- Simple mental model
- Great for file uploads (multipart/form-data is native)
- No dependencies on the client side (native `fetch` works)
- Can be consumed by any client (mobile, CLI, third-party)

**Weaknesses in this project:**
- **Over-fetching:** the `Modelo` entity has ~30 fields + nested relations (Cliente, TipoProduto, Books[], Canais[], etc.). A list page that only needs name + status + date still gets the full object.
- **Under-fetching:** the model detail page needs the model + client + history in separate requests.
- **Type drift:** the TypeScript interfaces in the frontend are manually maintained. If the backend changes a field, the compiler does not know. You find out at runtime.
- **No schema enforcement:** nothing guarantees the API response matches the documented shape.

---

### GraphQL

A query language where the client declares exactly which fields it needs. The server exposes a strongly-typed schema (SDL). The client gets exactly the requested shape back.

**Strengths:**
- Client requests only the fields it needs (solves over-fetching)
- Single endpoint, multiple queries in one request (solves N+1 for nested relations)
- Schema is the contract — server and client must agree
- Introspection (tooling can auto-generate types with `graphql-codegen`)
- Great for complex, nested domain objects like `Modelo`

**Weaknesses:**
- **Requires codegen** to get TypeScript types on the client — an extra build step that can drift from reality if forgotten
- **SDL is a new language** — developers must learn GraphQL syntax on top of TypeScript
- **File uploads are awkward** — the `graphql-multipart-request-spec` is a bolted-on extension, not native
- **Overkill for simple CRUD** — a simple `POST /entidade` with one field does not need GraphQL's power
- **Requires a backend you control** (or a BFF layer if the backend is an existing REST API)

---

### tRPC

Not a query language. Not a protocol. **A type-sharing mechanism.** You define procedures (functions) on a TypeScript backend; the TypeScript frontend calls them with full type safety — no schema, no codegen, no runtime surprises.

```
Backend TypeScript ──exports router type──► Frontend TypeScript
                                            Full autocomplete + compile-time safety
```

**Strengths:**
- **Zero schema drift** — types are shared at the source code level. If you rename a field on the backend, TypeScript tells you immediately on the frontend.
- **Zero codegen** — no SDL, no `graphql-codegen`, no OpenAPI generator. Types flow automatically.
- **Lowest learning curve** — if you know TypeScript, you know tRPC. There is no new language to learn.
- **Zod integration** — input validation and TypeScript types are derived from the same Zod schema. One source of truth.
- **Subscriptions** — WebSocket subscriptions available natively.
- **File uploads** — handled naturally (tRPC supports multipart via adapters, or you keep uploads as REST).

**Weaknesses:**
- **TypeScript only** — both client and server must be TypeScript. Cannot be consumed by a mobile app or third-party client without a separate REST/GraphQL layer.
- **Requires backend control** — you cannot use tRPC to call an existing REST API directly (needs a BFF wrapper).
- **Smaller ecosystem** — fewer tutorials, less community tooling than REST or GraphQL.
- **Not a public API** — tRPC is not suitable if you need to expose the API to external developers.

---

## Side-by-side Summary

| | REST | GraphQL | tRPC |
|---|---|---|---|
| **Type safety** | Manual interfaces, drift risk | Good with codegen | Native TypeScript, compiler enforced |
| **Over-fetching** | Yes (always full entity) | No (client requests fields) | Controlled per procedure |
| **Schema** | Documentation only | Explicit SDL | TypeScript types ARE the schema |
| **Codegen required** | No | Yes | No |
| **File uploads** | Native, simple | Awkward (spec extension) | Use REST for uploads |
| **Learning curve** | Very low | High (new language + concepts) | Low (just TypeScript) |
| **Ecosystem** | Massive | Large, mature | Growing |
| **Public/external API** | Yes | Yes | No — internal only |
| **Requires backend control** | No | Yes (or BFF) | Yes |
| **Mixing with REST** | n/a | Yes, via BFF | Yes, alongside |

---

## Can you mix them?

**Yes.** A frontend can use multiple transports simultaneously. This is common:

- **tRPC** for all domain API calls (type-safe, internal, between your frontend and your backend)
- **REST** for file uploads (native multipart support, simpler) and external APIs (Okta, IAM — you don't control these)

They don't conflict. tRPC uses a dedicated HTTP endpoint (`/trpc`). REST calls use their own URLs. The frontend simply imports two different clients.

---

## The Three Options Considered for This Project

### Option A — Frontend only, call existing REST API directly

```
Frontend (Vue/React) ──axios──► existing REST backend (unchanged)
```

- No backend work required
- No type safety between layers
- Over-fetching on complex entities
- Types must be kept in sync manually

**Rejected:** requires trusting an external API we do not control; no compile-time safety.

---

### Option B — New full-stack TypeScript project with tRPC ✅ CHOSEN

```
Frontend (Vue/React) ──tRPC──► new TypeScript backend (Hono/Fastify)
                                    ├── PostgreSQL (Prisma ORM)
                                    └── REST calls to Okta/IAM (external)
```

- Full compile-time safety across the entire stack
- Backend and frontend share types via a single `@osm/api` package
- No codegen, no schema drift
- New backend is built from scratch — we control the data model, the business logic, the database
- File uploads and Okta/IAM stay as REST calls (tRPC not suitable there)

**Chosen:** maximum type safety, best developer experience, built for the long term.

---

### Option C — BFF (Backend for Frontend) in front of an existing REST API

```
Frontend ──tRPC──► BFF (TypeScript) ──REST──► existing REST backend
```

- Useful when the existing backend cannot be changed
- Adds an extra service to maintain
- BFF handles aggregation and data shaping

**Not needed** since we are building the backend from scratch.

---

## Decision

**Option B.** New TypeScript backend + tRPC + PostgreSQL + Prisma.

- Frontend: Vue 3 (or React 18) + Vite + tRPC client + Zod
- Backend: Node.js 20 LTS + Hono + tRPC server + Prisma + PostgreSQL 16
- Shared types package: `packages/api` (tRPC router type + Zod schemas)
- File uploads: REST (`POST /upload/template`, `POST /upload/validate-variables`)
- External auth: Okta SAML SSO redirect + IAM JWT validation on the backend

---

## What stays REST

Even with tRPC as the primary transport, these remain as REST:

| Endpoint | Why REST |
|---|---|
| `POST /upload/template` | Multipart file upload — REST handles this natively |
| `POST /upload/validate-variables` | Same — file upload |
| Okta SAML redirect | External identity provider — we don't control the protocol |
| `GET {IAM}/user-accounts/me` | External IAM API — consumed server-side by the backend |
| `POST {IAM}/renew-app-token` | External IAM API — consumed server-side by the backend |

*Note: IAM/Okta calls are made from the **backend**, not the frontend. The frontend never talks to IAM directly — it only talks to our tRPC backend.*

---

*This file is a permanent decision record. Do not delete.*
