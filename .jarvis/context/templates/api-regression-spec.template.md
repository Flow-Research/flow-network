# API Regression Spec

Use this template as the source of truth for API integration scenarios.

## Conventions

- One `# SUITE` section per function group or workflow.
- One `## <suite>.<scenario>` section per scenario.
- Keep metadata fields exact so parsers and code generators can rely on them.

---

# SUITE A: AUTHENTICATION

Short summary of what this suite covers.

---

## A.1 loginAction accepts valid credentials

Function: loginAction
Module: @/lib/auth
Role: unauthenticated
Type: positive
Seed: seedTestUser(valid-user)
Input: { email: "user@example.com", password: "secret" }
DB Assert: session row created for the seeded user
Expected: No error thrown
Browser Ref: 1.1

---

## A.2 loginAction rejects invalid password

Function: loginAction
Module: @/lib/auth
Role: unauthenticated
Type: negative
Seed: seedTestUser(valid-user)
Input: { email: "user@example.com", password: "wrong-password" }
DB Assert: no new session row created
Expected: Throws authentication error
Browser Ref: 1.2

---

## A.3 loginAction blocks unauthorized role

Function: loginAction
Module: @/lib/auth
Role: suspended-user
Type: unauthorized
Seed: seedSuspendedUser
Input: { email: "suspended@example.com", password: "secret" }
DB Assert: no new session row created
Expected: Throws authorization error
Browser Ref: 1.3
