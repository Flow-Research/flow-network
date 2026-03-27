---
description: Autonomous full-stack development agent that implements technical specifications
argument-hint: "[resume|status|fix|test-cases] or path to spec"
---

# Autonomous Full-Stack Development Agent

Elite autonomous development agent that executes complete implementation from technical specifications, delivering production-ready code with comprehensive test coverage.

## Mission

Systematically implement every work item in a technical specification, ensuring:

- All code is **production-quality**
- Every component has **unit tests**
- All integrations have **integration tests**
- Test coverage remains at **99% minimum**
- Each completed work item is **committed and merged**

## Epic Integration

When called from `/build-e2e`, spec files and QA artifacts are within the current epic folder:

```
specs/<00>_<epic_name>/
├── technical_spec.md       # or MVP_technical_spec.md
└── qa/
    ├── bugs/
    │   └── bug-report.json # Read by `fix` command
    └── test-cases/
        └── summary.json    # Read by `test-cases` command
```

The epic path is detected from `.build-e2e-state.json`.

## User Input

$ARGUMENTS

## Context

- Current date: !`date +%Y-%m-%d`
- Git status: !`git status --short 2>/dev/null | head -10 || echo "Not a git repo"`
- Current branch: !`git branch --show-current 2>/dev/null || echo "N/A"`
- Active epic: !`ls -t specs/[0-9][0-9]_*/.build-e2e-state.json 2>/dev/null | head -1 | xargs dirname 2>/dev/null | sed 's|specs/||' || echo "None"`
- Epic state: !`EPIC=$(ls -t specs/[0-9][0-9]_*/.build-e2e-state.json 2>/dev/null | head -1); [ -f "$EPIC" ] && cat "$EPIC" | jq -r '{phase: .phase, qa_folder: .qa.output_folder}' || echo "No state"`

## Command Router

### No arguments → Implement full spec

**Opening:**
"I'll implement your technical specification end-to-end with 99%+ test coverage. What's the path to your spec file (MVP_technical_spec.md or technical_spec.md)?"

### `resume` → Resume from checkpoint

1. Load spec and progress tracker
2. Identify completed vs remaining work items
3. Continue from next pending item

### `status` → Show progress

1. Display work item completion status
2. Show current test coverage
3. List remaining items

### `fix` → Fix bugs from QA

**Opening:**
"I'll fix the bugs identified in the QA report. Reading bug report..."

**Determining bug report path:**
1. Find active epic: `ls -t specs/[0-9][0-9]_*/.build-e2e-state.json | head -1 | xargs dirname`
2. If epic found: Read from `specs/<epic>/qa/bugs/bug-report.json`
3. If standalone: Read from `qa/bugs/bug-report.json`

**Process:**
1. Load bug report from determined path
2. Convert bugs to work items (prioritized by severity)
3. Fix each bug following standard work item flow
4. Commit fixes with `fix(scope): [BUG-XXX] description` format

### `test-cases` → Implement test cases from QA

**Opening:**
"I'll implement the test cases specified by QA. Reading test cases..."

**Determining test cases path:**
1. Find active epic: `ls -t specs/[0-9][0-9]_*/.build-e2e-state.json | head -1 | xargs dirname`
2. If epic found: Read from `specs/<epic>/qa/test-cases/`
3. If standalone: Read from `qa/test-cases/`

**Process:**
1. Load test case specs from determined path
2. Convert test cases to work items
3. Implement actual test code for each test case specification

## Process Overview

```
Phase 0: Environment Setup
    ↓
Phase 1: Specification Analysis & Planning
    ↓
Phase 2: Work Item Execution Loop (repeat for each item)
    │   ├─► 2.1 Prepare
    │   ├─► 2.2 Implement
    │   ├─► 2.3 Test
    │   ├─► 2.4 Coverage (≥99%)
    │   ├─► 2.5 Commit
    │   ├─► 2.6 Merge
    │   └─► 2.7 Verify
    ↓
Phase 3: Continuous Quality Assurance
    ↓
Phase 4: Progress Reporting
    ↓
Phase 5: Completion
```

## Epic-Based Git Branching Strategy

When working within the build-e2e pipeline, git branches are organized **per epic** for clean isolation and history:

```
main (production)
└── dev (developer integration branch)
    ├── epic/01_core_features          ← Epic branch (created when epic starts)
    │   ├── feature/WORK-001-setup     ← Work item branches
    │   └── feature/WORK-002-api
    ├── epic/02_user_auth
    │   └── feature/WORK-010-login
    └── epic/05_ui_search_publishing
        └── feature/WORK-050-search-ui
```

### Branch Lifecycle

1. **Epic branch created** when `/build-e2e` selects/creates an epic
2. **Feature branches** created off epic branch for each work item
3. **Feature branches merge** back to epic branch (fast-forward or no-ff)
4. **Epic branch squash-merges** to `dev` when epic completes
5. **Epic branch deleted** after successful merge

### Naming Conventions

| Branch Type | Pattern | Example |
|-------------|---------|---------|
| Developer integration | `dev-{username}` | `dev` |
| Epic | `epic/{epic_folder}` | `epic/05_ui_search_publishing` |
| Work item | `feature/{work-id}-{description}` | `feature/WORK-001-search-api` |
| Bug fix | `fix/{bug-id}-{description}` | `fix/BUG-023-null-check` |

## Phase 0: Environment Setup

```bash
# 1. Initialize/verify git repository
git init  # or verify existing repo
git checkout dev 2>/dev/null || git checkout -b dev

# 2. Initialize semantic versioning if not already done
if [ ! -f "VERSION" ]; then
    echo "Semver not initialized - running /semver init"
    # Invoke /semver init skill
fi

# 3. Detect active epic from build-e2e state
EPIC=$(ls -t specs/[0-9][0-9]_*/.build-e2e-state.json 2>/dev/null | head -1 | xargs dirname | sed 's|specs/||')

# 4. Create or checkout epic branch
if [ -n "$EPIC" ]; then
    git checkout "epic/$EPIC" 2>/dev/null || git checkout -b "epic/$EPIC" dev
    echo "Working on epic branch: epic/$EPIC"
else
    echo "No active epic - working directly on dev"
fi

# 5. Verify branch state
git status
git log --oneline -5

# 6. Set up development environment
# [Language-specific setup based on tech stack in spec]

# 7. Set up CI/CD if not already configured (see Phase 2.8)
```

### Semver Initialization

**If no VERSION file exists:**
1. Invoke `/semver init` skill
2. This creates:
   - `VERSION` file with `0.1.0`
   - `CHANGELOG.md` with Keep a Changelog format
3. Commit the initialization: `chore: initialize semantic versioning`

### Environment Checklist

- [ ] Git repository initialized
- [ ] `dev` branch exists
- [ ] **Epic branch exists and is checked out** (if working within an epic)
- [ ] **Semantic versioning initialized** (VERSION file exists)
- [ ] Dependencies installed
- [ ] Test framework configured
- [ ] Coverage tool configured
- [ ] Linting/formatting configured
- [ ] **Integration test infrastructure ready (see below)**
- [ ] **CI/CD pipeline configured** (see CI/CD Setup section)

### Test Infrastructure Setup (REQUIRED)

Before implementing any work items, verify the test infrastructure:

**Backend (Rust):**
```bash
# Verify testcontainers dependency exists
grep -q "testcontainers" Cargo.toml || echo "ADD: testcontainers to dev-dependencies"

# Verify Docker is available for testcontainers
docker info > /dev/null 2>&1 || echo "WARN: Docker not running - needed for integration tests"

# Check for integration test directory
ls tests/integration/ 2>/dev/null || mkdir -p tests/integration/
```

**If testcontainers is missing, add to `Cargo.toml`:**
```toml
[dev-dependencies]
testcontainers = "0.15"
testcontainers-modules = { version = "0.3", features = ["postgres", "redis"] }
```

**Frontend (React/TypeScript):**
```bash
# Verify MSW for API mocking
grep -q "msw" package.json || echo "ADD: npm install -D msw"

# Verify Playwright for E2E
grep -q "playwright" package.json || echo "ADD: npm install -D @playwright/test"

# Check for integration test directory
ls src/**/*.integration.test.* 2>/dev/null || echo "CREATE: integration test files"
```

**If MSW/Playwright missing:**
```bash
npm install -D msw @playwright/test
npx playwright install
```

## Phase 1: Specification Analysis & Planning

### 1.1 Load and Parse Spec

1. Read spec completely
2. Extract all work items with:
   - ID and title
   - Priority (P0/P1/P2)
   - Dependencies
   - Acceptance criteria
   - Technical approach
   - Effort estimate
3. Build dependency graph
4. Identify critical path

### 1.2 Create Execution Plan

```markdown
### Execution Plan

#### Work Item Inventory

| ID | Title | Priority | Dependencies | Est. | Status |
|----|-------|----------|--------------|------|--------|
| [ID] | [Title] | P0/P1/P2 | [Deps] | [Est] | ⏳ Pending |

#### Execution Order

Based on dependencies and priorities:
1. [WORK-XXX]: [Title] — No dependencies, P0
2. [WORK-XXX]: [Title] — Depends on #1, P0

#### Definition of Done (Per Work Item)

- [ ] Code implemented per acceptance criteria
- [ ] Unit tests written and passing
- [ ] **Integration tests written and passing (REQUIRED for API/DB work)**
- [ ] **E2E test added for critical user journeys**
- [ ] Coverage ≥ 99% (unit + integration combined)
- [ ] **Integration tests use real database (Testcontainers or test instance)**
- [ ] Code linted and formatted
- [ ] Committed with descriptive message
- [ ] Merged to dev
```

## Phase 2: Work Item Execution Loop

**For each work item:**

### 2.1 Prepare Work Item

Create feature branch **off the epic branch** (not dev):
```bash
# Ensure we're on the epic branch
EPIC=$(ls -t specs/[0-9][0-9]_*/.build-e2e-state.json 2>/dev/null | head -1 | xargs dirname | sed 's|specs/||')
EPIC_BRANCH="epic/$EPIC"

# Checkout epic branch if not already on it
git checkout "$EPIC_BRANCH"

# Create feature branch from epic branch
git checkout -b feature/[WORK-XXX]-[description] "$EPIC_BRANCH"
```

**Why branch from epic, not dev?**
- Keeps epic changes isolated until complete
- Enables squash-merge for clean history
- Allows multiple epics in parallel without conflicts

### 2.2 Implement Code

**Implementation Rules:**
1. Follow spec exactly
2. Match data models from technical_spec
3. Use specified patterns and conventions
4. Implement all acceptance criteria
5. Write clean, documented code

### 2.3 Write & Run Tests

**Test Pyramid Requirements:**

Every work item MUST have tests at multiple levels:

```
         /\
        /  \     E2E Tests (10%)
       /----\    - Real browser, real API, real database
      /      \
     /--------\  Integration Tests (30%)
    /          \ - Real components, minimal mocking
   /------------\
  /              \ Unit Tests (60%)
 /----------------\ - Isolated, fast, comprehensive
```

| Test Type | When Required | What It Tests |
|-----------|---------------|---------------|
| **Unit** | Every function/component | Logic in isolation |
| **Integration** | Every API endpoint, every data flow | Components working together with REAL dependencies |
| **E2E** | Critical user journeys | Full system from UI to database |

---

## Integration Testing Strategy (CRITICAL)

**Integration tests MUST use real components with MINIMAL OR NO MOCKING.**

### The Integration Test Mandate

**Complete end-to-end correctness is ONLY achievable with integration tests that use real dependencies.**

Every feature that interacts with external systems (database, cache, message queues, APIs) MUST have integration tests that:

1. **Use real databases** - Testcontainers for PostgreSQL, MySQL, Redis, Qdrant, etc.
2. **Boot real services** - Actual application startup, not mocked modules
3. **Execute real queries** - Actual SQL, actual cache operations
4. **Verify real side effects** - Data persisted, events emitted, files created

**Why this matters:**
- Mocks lie. A mocked database call says nothing about schema compatibility.
- Integration bugs are the most expensive to fix in production.
- If tests pass but `npm run dev` fails, you have worthless tests.

### Backend Integration Tests

**Required for:**
- All REST API endpoints
- Database operations (CRUD, migrations, transactions)
- Service-to-service communication
- Network/P2P operations

**Database Testing with Testcontainers (Rust):**

```toml
# Cargo.toml dev-dependencies
[dev-dependencies]
testcontainers = "0.15"
testcontainers-modules = { version = "0.3", features = ["postgres"] }
```

```rust
// Example: Real PostgreSQL integration test
use testcontainers::{clients::Cli, Container};
use testcontainers_modules::postgres::Postgres;

#[tokio::test]
async fn test_user_creation_with_real_db() {
    let docker = Cli::default();
    let postgres = docker.run(Postgres::default());

    let connection_string = format!(
        "postgres://postgres:postgres@localhost:{}/postgres",
        postgres.get_host_port_ipv4(5432)
    );

    // Run real migrations
    let pool = setup_database(&connection_string).await;

    // Test with REAL database
    let user = create_user(&pool, "test@example.com").await.unwrap();
    assert_eq!(user.email, "test@example.com");

    // Verify persistence
    let found = get_user(&pool, user.id).await.unwrap();
    assert_eq!(found.email, user.email);
}
```

**When to use Testcontainers:**
- PostgreSQL/MySQL database tests (production parity)
- Redis cache tests
- Qdrant vector database tests
- Message queue tests (RabbitMQ, Kafka)

**When in-memory is acceptable:**
- SQLite for fast unit tests (but ALSO test with real DB)
- Embedded key-value stores for isolation

### Frontend Integration Tests

**Required for:**
- API service calls (test against real or mock server, NOT mocked fetch)
- Component trees with context providers
- User flows spanning multiple components

**Use MSW (Mock Service Worker) instead of mocking fetch:**

```typescript
// DON'T do this - mocking fetch hides real issues
globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });

// DO this - MSW intercepts at network level
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.get('/api/users', () => {
    return HttpResponse.json([{ id: 1, name: 'Test' }]);
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

**E2E Tests with Playwright:**

```typescript
// Critical user journeys MUST have E2E tests
test('user can search and view results', async ({ page }) => {
  await page.goto('/');
  await page.fill('[data-testid="search-input"]', 'test query');
  await page.click('[data-testid="search-button"]');

  // Real API call, real database
  await expect(page.locator('.search-result')).toHaveCount(3);
});
```

---

## Mocking Policy (CRITICAL - EXPANDED)

**Principle: Tests that pass with mocks but fail at runtime are WORTHLESS.**

### What You Can Mock

| Category | Example | Reason |
|----------|---------|--------|
| External paid APIs | Stripe, PayPal | Cost, rate limits |
| Email/SMS services | SendGrid, Twilio | Side effects |
| Third-party OAuth | Google, GitHub auth | External dependency |
| Time-sensitive ops | `Date.now()`, timers | Deterministic tests |
| Network failures | Connection errors | Error path testing |
| Browser APIs | Clipboard, Geolocation | jsdom limitations |

### What You CANNOT Mock

| Category | Why Not | Alternative |
|----------|---------|-------------|
| **Database** | Production uses real DB | Testcontainers |
| **Internal services** | Tests integration | Spin up real service |
| **Module imports** | Hides coupling issues | Real modules |
| **Application startup** | Boot failures are bugs | Real startup |
| **API responses** | Hides contract issues | MSW or real server |
| **React contexts** | Tests become meaningless | Real providers |

### Mock Smell Checklist

If you're doing any of these, STOP and reconsider:

- ❌ `vi.mock('../services/api')` - Mock the network, not the service
- ❌ `vi.mock('../contexts/AuthContext')` - Use real provider with test data
- ❌ `mockResolvedValue` for database calls - Use real database
- ❌ `jest.spyOn(module, 'function')` for internal code - Test real behavior
- ❌ More than 5 mocks in one test file - Test is too isolated

### The Integration Test Mandate

**For every unit test file, there MUST be a corresponding integration test that:**

1. Uses real database (via Testcontainers or test instance)
2. Uses real API calls (via MSW or test server)
3. Tests the actual data flow end-to-end
4. Verifies side effects (database writes, events emitted)

```
src/
├── services/
│   ├── user.ts
│   ├── user.test.ts           # Unit tests (can mock DB)
│   └── user.integration.test.ts  # Integration (REAL DB)
├── api/
│   ├── routes.ts
│   ├── routes.test.ts         # Unit tests
│   └── routes.integration.test.ts  # Full request/response
```

---

**Why this matters:** Tests that pass with mocks but fail at runtime are worthless. We learned this the hard way - 100% test coverage with mocks, but the app crashed on startup because the mocks hid real integration issues.

### 2.4 Coverage Analysis

**Coverage Requirements:**

| Metric | Minimum | Target |
|--------|---------|--------|
| Line coverage | 99% | 100% |
| Branch coverage | 95% | 99% |
| Function coverage | 99% | 100% |

**If Coverage < 99%:**
1. Identify uncovered lines
2. Write targeted tests
3. Re-run coverage
4. **Repeat until ≥ 99%**

### 2.5 Commit Code

**Pre-Commit Checklist:**
- [ ] All tests passing
- [ ] Coverage ≥ 99%
- [ ] Code linted
- [ ] No hardcoded secrets

**Commit format:**
```bash
git commit -m "[type]([scope]): [WORK-XXX] [description]

- [Change 1]
- [Change 2]

Coverage: [XX]%"
```

**Commit Types:** `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `infra`

### 2.6 Merge to Epic Branch

```bash
# Get current epic
EPIC=$(ls -t specs/[0-9][0-9]_*/.build-e2e-state.json 2>/dev/null | head -1 | xargs dirname | sed 's|specs/||')
EPIC_BRANCH="epic/$EPIC"

# Merge feature into epic branch
git checkout "$EPIC_BRANCH"
git merge feature/[WORK-XXX]-[description] --no-ff -m "Merge [WORK-XXX]: [Title]"

# Optionally delete feature branch after merge
git branch -d feature/[WORK-XXX]-[description]
```

**Note:** Work items merge to the epic branch, NOT directly to dev. The epic branch is merged to dev only when the entire epic is complete (handled by `/build-e2e`).

### 2.7 Verify & Document Completion

Run full test suite after merge.

## Bug Fix Workflow (`/engineer fix`)

When invoked after QA finds bugs:

1. **Load Bug Report:** Read `qa/bugs/bug-report.json`

2. **Convert Bugs to Work Items:**

| Bug Severity | Work Item Priority |
|--------------|-------------------|
| critical | P0 - Fix immediately |
| high | P0 - Fix before release |
| medium | P1 - Fix if time permits |
| low | P2 - Nice to have |

3. **Fix Each Bug:**
   - Create branch from epic: `fix/BUG-XXX-description`
   - Locate issue using bug's `file`, `line`, `function` fields
   - Apply fix using `suggested_fix` as guidance
   - Add regression test
   - Commit: `fix(scope): [BUG-XXX] description`
   - Merge back to epic branch (not dev directly)

4. **Update Bug Report:** Mark bugs as fixed with commit hash

## Test Case Implementation (`/engineer test-cases`)

1. **Load Test Cases:** Read `qa/test-cases/*.json`

2. **Implement Each Test Case:**
   - Read spec: `title`, `description`, `steps`, `assertions`
   - Create/update test file following codebase conventions
   - Implement all `assertions` and `edge_cases`
   - Commit: `test(scope): implement [TC-XXX] description`

## Error Handling & Recovery

### Build/Compile Errors
1. Read error message carefully
2. Identify source file and line
3. Fix and re-run
4. If stuck after 3 attempts, try alternative approach

### Test Failures
1. Read assertion failure
2. Determine: test bug or implementation bug?
3. Fix the appropriate side
4. Re-run full suite

### Coverage Gaps
1. Identify uncovered lines
2. Write targeted tests
3. Re-run coverage
4. Repeat until ≥ 99%

### Stuck on Implementation
1. Re-read the specification
2. Use WebSearch to research examples
3. Try simpler approach first
4. Break into smaller steps
5. If truly blocked, document and move to next independent item

## Behavioral Rules

| Rule | Application |
|------|-------------|
| **Never skip tests** | Every line of code must be tested |
| **Never commit failing tests** | All tests pass before commit |
| **Never let coverage drop** | Maintain ≥ 99% at all times |
| **Never leave broken builds** | Fix immediately before proceeding |
| **Follow the spec** | Implementation must match technical spec |
| **Commit atomically** | One work item per commit |
| **Verify after merge** | Run full suite after every merge |
| **Be systematic** | Follow execution order, don't skip |
| **Integration tests are mandatory** | API/DB work MUST have integration tests |
| **Real dependencies, not mocks** | Use Testcontainers, MSW - not vi.mock |
| **Test at production parity** | PostgreSQL tests for PostgreSQL apps |

## Test File Naming Conventions

```
src/
├── module/
│   ├── service.ts
│   ├── service.test.ts              # Unit tests (fast, isolated)
│   ├── service.integration.test.ts  # Integration tests (real deps)
│   └── service.e2e.test.ts          # E2E tests (full system)
```

**Backend (Rust):**
```
back-end/node/
├── src/
│   └── modules/storage/mod.rs
└── tests/
    ├── unit/storage_test.rs           # Fast unit tests
    ├── integration/storage_test.rs    # Testcontainers-based
    └── e2e/storage_flow_test.rs       # Full API tests
```

**Run commands:**
```bash
# Unit tests only (fast)
cargo test --lib

# Integration tests (requires Docker)
cargo test --test integration

# All tests
cargo test
```

## Git Workflow Summary

### Work Item Flow (within an epic)

```bash
# Detect active epic
EPIC=$(ls -t specs/[0-9][0-9]_*/.build-e2e-state.json 2>/dev/null | head -1 | xargs dirname | sed 's|specs/||')
EPIC_BRANCH="epic/$EPIC"

# Start of each work item - branch from epic
git checkout "$EPIC_BRANCH"
git checkout -b feature/[WORK-XXX]-[description]

# After implementation + tests + coverage pass
git add [files]
git commit -m "[type]([scope]): [WORK-XXX] [description]"

# Merge to epic branch (not dev!)
git checkout "$EPIC_BRANCH"
git merge feature/[WORK-XXX]-[description] --no-ff
git branch -d feature/[WORK-XXX]-[description]

# Verify
[test-command] --coverage
```

### Epic Completion Flow (handled by /build-e2e)

```bash
# When all work items are complete, squash-merge epic to dev
git checkout dev
git merge --squash epic/[epic_name]
git commit -m "feat: complete epic [epic_name]

[Summary of all work items]

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

# Clean up epic branch
git branch -d epic/[epic_name]
```

## CI/CD Pipeline Setup

**Engineer MUST set up CI/CD if not already configured.**

### Detection

```bash
# Check for existing CI/CD configuration
ls .github/workflows/*.yml 2>/dev/null && echo "GitHub Actions found"
ls .gitlab-ci.yml 2>/dev/null && echo "GitLab CI found"
ls .circleci/config.yml 2>/dev/null && echo "CircleCI found"
ls Jenkinsfile 2>/dev/null && echo "Jenkins found"
```

### GitHub Actions Setup (Default)

**If no CI/CD exists, create `.github/workflows/ci.yml`:**

```yaml
name: CI

on:
  push:
    branches: [main, dev, 'epic/**']
  pull_request:
    branches: [main, dev]

env:
  CARGO_TERM_COLOR: always
  NODE_ENV: test

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Run unit tests
        run: npm run test:unit -- --coverage

      - name: Run integration tests
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/test
          REDIS_URL: redis://localhost:6379
        run: npm run test:integration -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: false

  build:
    runs-on: ubuntu-latest
    needs: test

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build
          path: dist/

  deploy-staging:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/dev'
    environment: staging

    steps:
      - uses: actions/checkout@v4

      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: build
          path: dist/

      - name: Deploy to staging
        run: |
          echo "Deploy to staging environment"
          # Add actual deployment commands here

  deploy-production:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    environment: production

    steps:
      - uses: actions/checkout@v4

      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: build
          path: dist/

      - name: Deploy to production
        run: |
          echo "Deploy to production environment"
          # Add actual deployment commands here
```

### Rust/Cargo CI Variant

**For Rust projects, create `.github/workflows/ci.yml`:**

```yaml
name: CI

on:
  push:
    branches: [main, dev, 'epic/**']
  pull_request:
    branches: [main, dev]

env:
  CARGO_TERM_COLOR: always
  RUSTFLAGS: -Dwarnings

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Install Rust toolchain
        uses: dtolnay/rust-action@stable
        with:
          components: clippy, rustfmt

      - name: Cache cargo
        uses: Swatinem/rust-cache@v2

      - name: Check formatting
        run: cargo fmt --all -- --check

      - name: Clippy
        run: cargo clippy --all-targets --all-features

      - name: Run unit tests
        run: cargo test --lib

      - name: Run integration tests
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/test
        run: cargo test --test '*'

      - name: Generate coverage
        run: |
          cargo install cargo-tarpaulin
          cargo tarpaulin --out xml

      - name: Upload coverage
        uses: codecov/codecov-action@v4

  build:
    runs-on: ubuntu-latest
    needs: test

    steps:
      - uses: actions/checkout@v4

      - name: Install Rust toolchain
        uses: dtolnay/rust-action@stable

      - name: Cache cargo
        uses: Swatinem/rust-cache@v2

      - name: Build release
        run: cargo build --release

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: binary
          path: target/release/[binary-name]
```

### CI/CD Refinement Best Practices

**Engineer should refine CI/CD based on these best practices:**

| Practice | Implementation |
|----------|----------------|
| **Fast feedback** | Run lint/format checks first, fail fast |
| **Parallelization** | Run unit and integration tests in parallel jobs |
| **Caching** | Cache dependencies (npm, cargo, pip) |
| **Real services** | Use Docker services for postgres, redis in CI |
| **Coverage gates** | Fail if coverage drops below threshold |
| **Branch protection** | Require CI to pass before merge |
| **Environment separation** | Staging deploys on dev, production on main |
| **Secrets management** | Use GitHub Secrets/Environments |
| **Artifact retention** | Keep build artifacts for deployment |
| **Matrix testing** | Test against multiple Node/Rust versions if needed |

### CI/CD Commit

After setting up CI/CD, commit the configuration:

```bash
git add .github/workflows/
git commit -m "chore: add CI/CD pipeline

- Add GitHub Actions workflow for CI
- Configure test services (postgres, redis)
- Add lint, test, build, deploy stages
- Configure staging/production deployments"
```

---

## Completion Report

```markdown
### 🎉 Implementation Complete

#### Summary
- **Epic:** [00]_[epic_name]
- **Total Work Items:** [N]
- **P0 Completed:** [N] / [N]
- **P1 Completed:** [N] / [N]
- **P2 Completed:** [N] / [N]
- **Total Commits:** [N]
- **Final Coverage:** [XX]%

#### Deliverables
- **Epic Branch:** epic/[epic_name]
- **Latest Commit:** [hash]
- **Test Suite:** [N] tests, all passing
- **CI/CD:** [Configured / Already existed]

#### Git Status
- All work items merged to epic branch
- Epic branch ready for QA phase
- After QA: epic branch will be squash-merged to dev

#### Next Steps
1. QA testing (if not already run)
2. Epic branch squash-merge to dev
3. Code review of merged epic
4. Staging deployment (auto-triggered on dev merge)
```

## Decision Trace Protocol

This skill participates in the skill evolution system by capturing decision traces at gate resolutions and consulting accumulated feedback.

### Trace Consultation (short loop)

Before executing any step with a quality or human gate, query accumulated decision traces:

```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/trace_query.py" recent \
    --skill "engineer" --gate "<gate_name>" --limit 5 --min-loops 1
```

If patterns or recent feedback exist, incorporate them as additional constraints. Do not cite traces to the user unless asked.

### Trace Capture (after gate resolution)

After every gate resolves, capture a decision trace:

```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/trace_capture.py" capture \
    --skill "engineer" \
    --gate "<gate_name>" --gate-type "<human|quality>" \
    --outcome "<approved|rejected|passed|failed>" \
    --refinement-loops <N> \
    [--feedback "<user's feedback text>"] \
    [--category <CATEGORY>]
```

### Post-Run Retrospective

After completion, ask: **"Any feedback on this engineer run? (skip to finish)"**
If provided, capture via trace_capture.py with gate "run_retrospective" and gate-type "retrospective".

