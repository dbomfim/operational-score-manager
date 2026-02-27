## Prompt Start

I need you to build the complete AI-assisted development infrastructure for my project. This means creating all the files that tell GitHub Copilot **how to work on this project** — agent roles, hard rules, workflow templates, CI/CD pipelines, and code patterns — so that every session (1st or 100th) produces consistent, high-quality code without me re-explaining conventions.

**You are NOT writing application code.** You are writing the orchestration layer: Copilot instruction files, rules, workflow templates, settings, and CI/CD configs.

---

### 1. Project Brief

Fill in these details:

```
Project Name:        [PROJECT_NAME]
One-line description: [DESCRIPTION — what it does, who it's for]
Domain/Industry:     [e.g., SaaS, e-commerce, fintech, healthcare, dev tools]
Primary Language:    [e.g., Portuguese (PT-BR), English, Spanish]
```

### 2. Architecture

```
Monorepo or Polyrepo: [monorepo / polyrepo]
Package Manager:      [pnpm / npm / yarn / bun]
Build Tool:           [Turborepo / Nx / Lerna / none]

Apps (list each app):
- [APP_1_NAME] → [FRAMEWORK] — [PURPOSE] — [RENDERING: SPA/SSR/SSG] — [URL]
- [APP_2_NAME] → [FRAMEWORK] — [PURPOSE] — [RENDERING] — [URL]
- [APP_3_NAME] → ...
(add or remove as needed)

Shared Packages (list each):
- [PKG_1_NAME] → [PURPOSE]
- [PKG_2_NAME] → [PURPOSE]
- [PKG_3_NAME] → ...
(add or remove as needed)

Backend Modules (list planned modules):
- [MODULE_1] — [PURPOSE] — [KEY ENDPOINTS]
- [MODULE_2] — ...
(add or remove as needed)
```

### 3. Tech Stack

```
| Technology       | Version | Purpose                          |
|------------------|---------|----------------------------------|
| [LANGUAGE]       | [VER]   | [PURPOSE]                        |
| [FRAMEWORK_FE]   | [VER]   | [PURPOSE]                        |
| [FRAMEWORK_BE]   | [VER]   | [PURPOSE]                        |
| [DATABASE]       | [VER]   | [PURPOSE]                        |
| [ORM]            | [VER]   | [PURPOSE]                        |
| [CACHE/QUEUE]    | [VER]   | [PURPOSE]                        |
| [CSS]            | [VER]   | [PURPOSE]                        |
| [STATE_MGMT]     | [VER]   | [PURPOSE]                        |
| [VALIDATION]     | [VER]   | [PURPOSE]                        |
| [TESTING_BE]     | [VER]   | [PURPOSE]                        |
| [TESTING_FE]     | [VER]   | [PURPOSE]                        |
(add or remove rows as needed)
```

### 4. Authentication & Authorization

```
Auth Strategy:     [JWT / Session / OAuth / API keys / other]
Token Details:     [e.g., 15min access + 7d refresh httpOnly cookie]
Token Payload:     [e.g., { userId, organizationId, role }]
Password Hashing:  [bcrypt / argon2 / scrypt — min rounds]
Roles:             [list roles from highest to lowest privilege]
Guard Pattern:     [e.g., JwtAuthGuard + RolesGuard + @Roles() decorator]
```

### 5. Multi-Tenancy (if applicable)

```
Tenant Isolation:   [organizationId scoping / separate DBs / schema-per-tenant / N/A]
Scoping Field:      [e.g., organizationId, tenantId, workspaceId]
Scoping Source:     [e.g., JWT payload, subdomain, header]
Exceptions:         [e.g., admin endpoints, public data, auth endpoints]
```

### 6. Naming & Code Conventions

```
Files:              [e.g., kebab-case]
Variables:          [e.g., camelCase]
Functions:          [e.g., camelCase]
Types/Classes:      [e.g., PascalCase]
Constants:          [e.g., SCREAMING_SNAKE_CASE]
Components:         [e.g., PascalCase with prefix like M-prefix]
API Prefix:         [e.g., /v1/]
Error Shape:        [e.g., { statusCode, message, error, details? }]
Response Envelope:  [e.g., { data } for single, { data, meta } for lists]
Pagination:         [e.g., cursor-based / offset-based]
Test Files:         [e.g., colocated *.spec.ts / separate __tests__/ dir]
Commits:            [e.g., conventional commits: feat, fix, refactor, test, docs, chore]
```

### 7. Dependency Order

Define the build dependency graph for your packages/apps (upstream → downstream):

```
[PKG_1] → [PKG_2] → [BACKEND] → [FRONTEND_APPS]
   1          2          3              4
```

### 8. Git & Branch Strategy

```
Production branch:    [main / master]
Integration branch:   [develop / staging]
Feature branches:     [e.g., feat/<scope>/<desc>]
Bugfix branches:      [e.g., fix/<scope>/<desc>]
Hotfix branches:      [e.g., hotfix/<desc>]
Scopes:               [list valid scopes — usually app/module names]
PR target:            [e.g., develop — never directly to main]
Merge strategy:       [squash / merge commit / rebase]
```

### 9. CI/CD

```
CI Platform(s):       [GitHub Actions (recommended for VS Code/Copilot) / GitLab CI / Bitbucket Pipelines]
CI Triggers:          [e.g., PR to develop → lint, type-check, test, build]
Staging Deploy:       [trigger + targets — e.g., push to develop → Vercel + Railway]
Production Deploy:    [trigger + targets — e.g., push to main → Vercel + Railway]
Deployment Targets:
  - [APP_1]: [Provider] — [Method]
  - [APP_2]: [Provider] — [Method]
  - [BACKEND]: [Provider] — [Method]
```

### 10. Development Phases

```
Phase 1: [NAME]     ← CURRENT
  - [deliverable 1]
  - [deliverable 2]
  - ...

Phase 2: [NAME]
  - [deliverable 1]
  - ...

Phase 3: [NAME]
  - ...

(add or remove phases as needed)
```

### 11. Spec Documents (if any)

```
List any existing specification documents in the repo:
- [PATH] — [WHAT IT COVERS]
- [PATH] — [WHAT IT COVERS]
```

---

## What to Build

Create the following infrastructure files. Every file must contain **concrete code patterns with examples** — not just descriptions. The patterns should be copy-paste-ready blueprints that ensure consistency.

### File Structure to Create

```
[PROJECT_ROOT]/
├── .github/
│   ├── copilot-instructions.md            ← Master Orchestrator (always in context)
│   ├── copilot/
│   │   ├── workflows/                     ← Developer workflow templates
│   │   │   ├── implement-feature.md       ← Full-stack feature orchestrator
│   │   │   ├── new-module.md              ← Backend module scaffold
│   │   │   ├── new-page.md                ← Frontend page + data layer
│   │   │   ├── new-component.md           ← UI component
│   │   │   ├── scaffold-phase.md          ← Phase boilerplate generator
│   │   │   ├── review.md                  ← Code review checklist
│   │   │   ├── debug.md                   ← Structured debugging protocol
│   │   │   ├── bugfix.md                  ← Bug fix workflow (branch + test-first)
│   │   │   ├── deploy.md                  ← Deploy to environment
│   │   │   └── status.md                  ← Project progress report
│   │   └── rules/                         ← Hard rules (always enforced)
│   │       ├── [RULE_1].md                ← e.g., multi-tenancy
│   │       ├── [RULE_2].md                ← e.g., security
│   │       ├── [RULE_3].md                ← e.g., type-safety
│   │       └── [RULE_4].md                ← e.g., dependency-order
│   └── workflows/                         ← GitHub Actions CI/CD
│
├── .vscode/
│   └── settings.json                      ← VS Code workspace settings
│
├── [APP_DIRS]/
│   └── [EACH_APP]/.copilot-instructions.md   ← Domain agent context + patterns
│
└── [PACKAGE_DIRS]/
    └── [EACH_PKG]/.copilot-instructions.md   ← Package agent context + patterns
```

---

## Content Requirements for Each File

### .github/copilot-instructions.md (Master Orchestrator) — ~200 lines
Must include ALL of these sections:
1. **Project Identity** — One paragraph: what it is, who it's for
2. **Architecture Map** — ASCII tree showing apps, packages, and their purposes
3. **Tech Stack Table** — Technology, version, purpose
4. **Agent Roles Table** — Agent name, trigger directory, responsibility
5. **Dependency Order** — Build graph + rule: never build downstream before upstream
6. **Task Decomposition Protocol** — 6 steps: Analyze → Decompose → Track → Execute → Verify → Report
7. **Spec File Router** — Table mapping domains to spec docs
8. **Global Conventions** — Naming, code style, multi-tenancy, auth, testing
9. **Git/Branch/PR Conventions** — Branch naming, commit format, PR template with checklist
10. **CI/CD Pipeline Summary** — Table of triggers and what runs
11. **Deployment Targets** — Table of apps → providers → methods
12. **Development Phase Tracker** — Phases with deliverables, current phase marked
13. **Hard Rules Summary** — List of rules with links to `.github/copilot/rules/`
14. **Workflow Templates Table** — Template → purpose (use by saying "Follow the [template-name] workflow")

### .github/copilot/rules/*.md (Hard Rules) — ~40-110 lines each
Each rule file must include:
1. **Principle** — Why this rule exists (1-2 sentences)
2. **Correct Pattern** — Code example showing the RIGHT way
3. **Incorrect Pattern** — Code example showing the WRONG way (marked "NEVER DO THIS")
4. **Exceptions** — When this rule doesn't apply (if any)
5. **Verification Checklist** — Checkbox list for code review

Create rules for your project's critical constraints. Common rules:
- **Multi-tenancy** — Tenant scoping on every query
- **Security** — Input validation, auth, OWASP
- **Type safety** — Strict mode, no `any`, shared types
- **Dependency order** — Build graph enforcement, circular dependency prevention

### .vscode/settings.json
```json
{
  "github.copilot.enable": {
    "*": true
  },
  "github.copilot.advanced": {
    "inlineSuggestCount": 3
  }
  // Add project-specific VS Code settings here
}
```

### apps/*/.copilot-instructions.md (Domain Agent Files) — ~60-350 lines each
Each agent file must include:
1. **Role declaration** — "You are the [X] Agent"
2. **App/package info** — Framework, dependencies, consumed by
3. **Directory structure** — Expected file organization
4. **Code patterns with examples** — NOT descriptions, actual CODE:
   - Module/component scaffold pattern
   - Data fetching pattern
   - State management pattern
   - Form/validation pattern
   - Auth/guard pattern
   - Test pattern
5. **Rules specific to this domain**

### packages/*/.copilot-instructions.md (Package Agent Files) — ~40-120 lines each
Same structure as above, focused on the package's purpose.

### .github/copilot/workflows/*.md (Workflow Templates) — ~30-100 lines each
These are reusable workflow templates that you invoke by saying "Follow the [workflow-name] workflow".

Each workflow template must include:
1. **Title** — `# [Workflow Name] — Description`
2. **When to Use** — Scenarios where this workflow applies
3. **Input Requirements** — What information is needed
4. **Workflow Steps** — Numbered steps the agent follows
5. **Verification Checklist** — What to verify before completing
6. **Success Criteria** — What to report when done

The 10 workflow templates to create:

| Workflow | Purpose | How to Use |
|----------|---------|------------|
| `implement-feature` | Orchestrates full-stack feature implementation across all layers following dependency order. Reads specs, decomposes into tasks, executes in order, runs quality gates. | "Follow the implement-feature workflow for [feature-name]" |
| `new-module` | Scaffolds a backend module (controller, service, DTOs, tests, module registration). Checks upstream dependencies first. | "Follow the new-module workflow to create [module-name]" |
| `new-page` | Creates a frontend page + data layer (composable/hook). Takes page path + target app. | "Follow the new-page workflow for [page-path] in [app]" |
| `new-component` | Creates a shared UI component with typed props, emits, slots. Adds to barrel export. | "Follow the new-component workflow for [component-name]" |
| `scaffold-phase` | Generates all boilerplate for a development phase. Creates task list with dependencies. | "Follow the scaffold-phase workflow for phase [N]" |
| `review` | Runs code review against all project rules: tenant scoping, security, type safety, tests, conventions, performance. Reports by severity. | "Follow the review workflow for [file/feature]" |
| `debug` | Structured debugging: reproduce → isolate layer → trace data flow → fix → verify → learn. | "Follow the debug workflow for [issue]" |
| `bugfix` | Full bug fix workflow: reproduce → isolate → branch → test first (failing) → fix → verify → commit → PR. | "Follow the bugfix workflow for [bug-description]" |
| `deploy` | Deploys to staging or production. Validates branch, runs quality gate, confirms for production. | "Follow the deploy workflow to [environment]" |
| `status` | Scans codebase and reports: what exists vs. planned, current phase, what to build next. | "Follow the status workflow" |

### CI/CD Files (GitHub Actions)
Create GitHub Actions workflow files in `.github/workflows/`:
- **ci.yml** — PR checks: lint, type-check, test (per app), build
- **staging.yml** — Push to integration branch → CI + deploy all apps to staging
- **production.yml** — Push to main → CI + deploy all apps to production + notify
- **db-migrations.yml** — Manual trigger or on schema changes

Use parallel jobs where possible. Include caching for package manager (actions/cache).

---

## Implementation Order

Execute in this exact order (each step depends on the previous):

| Step | What | Files |
|------|------|-------|
| 1 | Create all directories | `mkdir -p` for the full tree |
| 2 | Master Orchestrator | `.github/copilot-instructions.md` |
| 3 | Hard Rules | `.github/copilot/rules/*.md` |
| 4 | Settings | `.vscode/settings.json` |
| 5 | Package agents | `packages/*/.copilot-instructions.md` |
| 6 | Backend agent | `apps/[backend]/.copilot-instructions.md` |
| 7 | Frontend agents | `apps/[frontends]/.copilot-instructions.md` |
| 8 | Core workflows | `implement-feature.md`, `new-module.md`, `new-page.md`, `new-component.md` |
| 9 | Support workflows | `scaffold-phase.md`, `review.md`, `debug.md`, `bugfix.md`, `deploy.md`, `status.md` |
| 10 | CI/CD pipelines | `.github/workflows/*.yml` for GitHub Actions |
| 11 | Track progress | Use manage_todo_list tool to track implementation |

Use the `manage_todo_list` tool to track progress. Parallelize independent file operations within each step using batch tool calls.

---

## Quality Criteria

After creating all files, verify:

1. **Completeness** — Every file in the structure exists and has substantive content
2. **Concreteness** — Agent files contain actual code patterns, not just descriptions
3. **Consistency** — Naming conventions, tech stack references, and patterns are uniform across all files
4. **Cross-referencing** — Rules files are referenced from copilot-instructions.md, agent files reference rules, workflows reference specs
5. **Actionability** — Workflow templates have clear step-by-step instructions, not vague directives
6. **Dependency awareness** — Every workflow and agent file respects the dependency order
7. **Self-sufficiency** — A new Copilot session with zero prior context should understand the full project from .github/copilot-instructions.md alone

---

## What NOT to Do

- Do NOT write application source code (no `.ts`, `.vue`, `.tsx` implementation files)
- Do NOT create package.json, tsconfig, or other config files (that's for the scaffold-phase workflow)
- Do NOT hallucinate tech stack details — use exactly what's specified above
- Do NOT use vague language like "follow best practices" — give concrete patterns
- Do NOT create placeholder files with TODO comments — every file must have real content
- Do NOT skip the code examples in agent files — they are the most important part

## Prompt End
