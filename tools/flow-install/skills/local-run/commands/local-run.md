---
description: Analyze a repository for local run options and update Docker/README assets.
---

# Local Run Command

## Modes

- `analyze`: inspect the repo and summarize viable run options
- `docker`: create or refine Docker assets
- `readme`: update run instructions and troubleshooting guidance
- no mode: perform analysis first, then choose the minimal useful update path

## Behavior

1. Detect language/runtime, package manager, app entry points, and required backing services.
2. Identify plausible run modes:
   - native host development
   - single-container Docker
   - multi-service docker-compose
3. Update only the assets that are justified by the repo's actual needs.
4. Prefer copy-pasteable commands and explicit prerequisites.
5. Record what was verified versus what remains unverified.

## Notes

- The templates are generic scaffolds, not a substitute for repo-specific verification.
