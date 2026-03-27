# Design Mockup

Generate a working, runnable UI prototype from approved design and technical specifications. The mockup uses the project's actual framework, renders every screen from the design spec, and wires dummy data derived from the tech spec's data models. It is not production code — no real APIs, no tests, no business logic.

## When to Use

- After design spec and tech spec are approved, before full implementation begins.
- When stakeholders need to see and interact with the UI before committing to implementation.
- When called by the issue-flow orchestrator during Phase 8 (execution scope confirmation).

## Invocation

```
/design-mockup
```

## Inputs

- `design_spec.md` in the current epic folder
- `technical_spec.md` in the current epic folder

## Output

A `mockup/` directory in the epic folder containing a runnable UI prototype with dummy data and a README explaining how to run it.
