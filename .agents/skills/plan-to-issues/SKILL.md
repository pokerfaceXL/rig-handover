---
name: plan-to-issues
description: Split this repo's plan.md into GitHub issues with gh, one per unit of work, after a human has reviewed the split. Use when a plan is ready and has no issues yet.
---

# plan-to-issues

Turns `plan.md` into GitHub issues that workers can pick up cold. Easiest with `gh`, authenticated,
in a shell this agent can run.

## Steps

1. Read `plan.md`, `AGENTS.md` and `docs/adr/`.
2. Draft the split as a table: title · plan section · scope · done when · blocked by.
   One issue per unit of work.
3. **Stop and show the table to the human.** Publish nothing until they approve it.
4. Every issue carries the shape in [What every issue carries](#what-every-issue-carries).
   Ask the human only about anything beyond it (extra fields, labels, wording).
5. Create the plan's label once, then each issue in dependency order, so blocked-by can cite
   real numbers:

   ```sh
   gh label create "plan:<plan>" --description "Issues split from plan.md (<plan>)"
   gh issue create --title "<title>" --label "plan:<plan>" --body-file <tmp.md>
   ```

6. Record every issue URL from gh's output (not from memory) and reply with the list.

Closing one, with the closing comment from AGENTS.md:

```sh
gh issue close <n> -c "<closing comment>"
```

## What every issue carries

Agreed with the human on the morning-digest plan (2026-10-29). Reviewers sort by the first line
and the label, so keep both exact.

- **Label** `plan:<plan>`, the `plan:` value from `plan.md`'s frontmatter (e.g. `plan:morning-digest`).
- **Body**, in this order:

  ```md
  Source: plan.md § <n>

  ## Scope
  <what this issue changes, in the plan's words; the rules from AGENTS.md and the ADRs it must keep>

  ## Done when
  <the plan's check for this section, as written>

  ## Blocked by
  <#n, and what for (to start, or for the done condition); — if nothing>
  ```

- `§ <n>` is the plan's section number as written (`1`, `2a`). A section split into two issues
  gives both the same source.
- An issue that waits on someone outside the repo (a reviewer, a human) says so under
  `Blocked by` and stays open until they have acted: "sent" is not "seen".

## No `gh`

Steps 1–4 hold either way. GitHub reachable another way (a connector, the REST API, the web UI):
the same issues, made that way. GitHub issues out of reach altogether: write them as files in
`docs/issues/`, format in ADR 0004, then commit and push.

## Don'ts

- Don't paste the whole plan into one issue, and don't keep issues only in chat.
- Don't invent sections the plan doesn't have. If the plan is unclear, ask.
