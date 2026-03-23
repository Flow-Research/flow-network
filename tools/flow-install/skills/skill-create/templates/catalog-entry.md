---
name: <skill-name>
type: <opencode|OpenClaw|n8n>
version: 0.1.0
install_scope: <local-repo|global>
status: experimental
owner: <owner>
blast_radius: <low|medium|high>
description: "<short description>"
location: <.agents/<type>/<skill-name>|tools/flow-install/<type>/<skill-name>>
invoke: "/<skill-name>"
permissions: [<explicit, minimal list>]
data_categories: [<pii|financial|credentials|none>]
egress: [<allowed outbound destinations>]
phase: <P# or list>
tags: []
depends_on: []
created: <YYYY-MM-DD>
updated: <YYYY-MM-DD>
---
