# Command Contract: <command-name>

## Purpose

Describe what the command does in one or two sentences.

## Ownership

- Owner: <team-or-person>
- Source of truth: `<path-to-script>`
- Wrapper layer: `<none|skill|jarvis>`

## Invocation

```bash
<command> [options]
```

## Arguments

| Name | Required | Description |
|---|---|---|
| `<arg>` | yes/no | What it means |

## Flags

| Flag | Required | Description |
|---|---|---|
| `--json` | no | Emit machine-readable output |
| `--help` | no | Show usage |

## Environment

| Variable | Required | Description |
|---|---|---|
| `<ENV_VAR>` | yes/no | Why it is needed |

## Output

### Human mode

Describe stdout format in normal mode.

### JSON mode

```json
{
  "ok": true,
  "result": {}
}
```

Document the real schema here.

## Exit Codes

| Code | Meaning |
|---|---|
| `0` | Success |
| `1` | Generic failure |
| `2` | Invalid input |

## Side Effects

- List files, APIs, or services changed by the command.

## Examples

```bash
<command> --help
<command> --json
```

## Smoke Test

```bash
<command> <example-args>
```
