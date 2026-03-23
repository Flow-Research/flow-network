# Browser Regression Spec

Use this template as the source of truth for browser-level regression scenarios.

## Conventions

- One `# SUITE` section per feature area.
- One `## <suite>.<scenario>` section per scenario.
- Keep metadata fields exact so parsers and reviewers can rely on them.

---

# SUITE 01: AUTHENTICATION

Short summary of what this suite covers.

---

## 1.1 Login succeeds with valid credentials

Role: unauthenticated
Route: /login
Mode: read-only
Type: positive
Prerequisites: seeded user exists with a confirmed account

- Navigate to `/login`.
- Fill valid credentials.
- Submit the form.
- Wait for navigation to settle.

Expected: User lands on the dashboard and no auth error is shown.

---

## 1.2 Login rejects invalid password

Role: unauthenticated
Route: /login
Mode: read-only
Type: negative
Prerequisites: seeded user exists with a confirmed account

- Navigate to `/login`.
- Fill a valid email and invalid password.
- Submit the form.

Expected: An authentication error is shown and the user remains on `/login`.
