# Business Requirements Document: <Product name>

> **How to use this template.** Copy this file into the new project's `docs/brd/` folder, replace every `<placeholder>`, and delete the guidance lines (the ones starting with `>`). Write for a reader who knows the business but not the code. Keep "what and why" here; put detailed behaviour in `requirements.md` and the technical answer in `design.md`, and link each business requirement to the requirements that fulfil it. A finished example is [`BRD-RevoTask.md`](BRD-RevoTask.md).

| | |
|---|---|
| **Product** | <name, one-line description> |
| **Document** | Business Requirements Document (BRD) |
| **Version** | <0.1 draft / 1.0 baselined> |
| **Date** | <date> |
| **Status** | <Draft · In review · Baselined · Superseded> |
| **Owner** | <person or role> |
| **Source documents** | <brief, requirements, design, tasks, change log> |

---

## 1. Executive summary

> Three to five sentences: the problem, who has it, what the product does about it, and how it will be delivered. Someone who reads only this should understand the project.

## 2. Background and problem

> Why now? What happens today without the product? List the problems as rows so each can be traced to a requirement later.

| # | Problem | Who feels it |
|---|---|---|
| P1 | <problem> | <users> |

## 3. Objectives and success measures

> Each objective needs a measure you can check. "Fast" is not a measure; "p95 under 500 ms" is.

| ID | Objective | Success measure | Status |
|---|---|---|---|
| O1 | <objective> | <measurable target> | <Not started · Met · Pending> |

## 4. Scope

### In scope

- <capability>

### Out of scope (this release)

> Say *why* each item is out. Hosting limits, cost and time are good reasons; write them down so nobody re-asks.

| Item | Why it is out |
|---|---|
| <item> | <reason> |

## 5. Stakeholders and users

| Stakeholder | Interest | Involvement |
|---|---|---|
| <who> | <what they care about> | <how they take part> |

| Role | Can do |
|---|---|
| <role> | <permissions> |

## 6. Business requirements

> One row per need, written as an outcome ("Users can …"), not a design. Priority: M (Must), S (Should), C (Could). Source: brief, owner, review, regulation… "Fulfilled by" links to the detailed requirements (R-numbers) once they exist.

### 6.1 <Capability area>

| ID | Requirement | Priority | Source | Fulfilled by |
|---|---|---|---|---|
| BR-01 | <requirement> | M | <source> | <R…> |

## 7. Non-functional requirements

> Cover at least: performance, security, privacy, accessibility, responsiveness, reliability, maintainability, quality (tests), hosting limits.

| ID | Area | Requirement | Fulfilled by |
|---|---|---|---|
| NFR-01 | Performance | <target> | <R…> |

## 8. Assumptions, constraints and dependencies

**Assumptions:** <things believed true that, if false, change the plan>

**Constraints:** <brief, hosting, budget, deadline, stack>

**Dependencies:** <libraries, services, people>

## 9. Key decisions and trade-offs

> Record each decision that a later reader might question, with the alternatives and the reason. This section saves the most time on the next project.

| # | Decision | Alternatives considered | Why |
|---|---|---|---|
| D1 | <decision> | <alternatives> | <reason> |

## 10. Change requests and how they were resolved

> Log every change the owner asks for during the build. "Adapted" means the need was met differently from the literal request; always say why.

| # | Request | Outcome (Done · Adapted · Declined · Deferred) | Notes | Change log ref |
|---|---|---|---|---|
| 1 | <request> | <outcome> | <reason> | <entry> |

## 11. Risks

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| RK1 | <risk> | <Low · Medium · High> | <Low · Medium · High> | <mitigation> |

## 12. Open items

| ID | Item | Owner | Needed for |
|---|---|---|---|
| OI-1 | <item> | <who> | <objective> |

## 13. Acceptance and sign-off

> List the conditions under which the product is accepted, then the sign-off table.

| Role | Name | Decision | Date |
|---|---|---|---|
| <role> | | | |

## 14. Glossary

| Term | Meaning |
|---|---|
| <term> | <meaning> |

---

## Appendix A: Questions to settle before writing requirements

> These came up late in the RevoTask build and each caused rework. Answer them in the first week of the next project.

1. **Hosting and its limits.** Where will each part run? Is the filesystem writable? What is the largest request? Are there long-running processes or schedulers? (These decide file storage, uploads and reminders.)
2. **Files.** Which files will users upload, how large, and where are they stored? Should originals be kept? Who may see them, and for how long may a link work?
3. **Roles.** Which actions are per-workspace and which are per-object (per board, per project)? Who can undo or remove other people's content?
4. **Sessions.** Must a session survive a reload? How long does it last? How does logout work on every device?
5. **"Done" and progress.** What counts as finished? Is it a status, a column, a checkbox?
6. **Dates and time zones.** Are deadlines dates or date-times? Whose time zone? Do people need reminders?
7. **User content.** Is formatted text allowed? Which formatting? Which links? Who sanitises it?
8. **Design direction.** Theme, density, motion (and how to switch it off), brand mark and favicon, phone-to-4K range.
9. **Accessibility target.** Which standard (for example WCAG 2.2 AA), and how it is checked (automated scans, keyboard-only walkthrough).
10. **Navigation.** One path to each place, or shortcuts too? Which items must never be duplicated?
11. **Scrolling and layout.** Does the page scroll, or the panels inside it? Should scrollbars be visible?
12. **Testing and evidence.** Which test layers, which properties must always hold, and what proof the reviewer expects.
13. **Out of scope.** What will *not* be built, and why, written down before anyone asks.

## Appendix B: Workflow that worked

1. Write a short **brief** (overview, roles, core features, stack, non-functional requirements).
2. Generate **requirements, design and tasks** with an AI tool, then **review them against the brief and rubric** and log every fix (before, after, why, prompt) in a change log.
3. Commit **steering guidelines** before any code and review generated code against them.
4. Implement task by task; check library APIs against **current documentation** rather than memory.
5. For every change request: update the **specs first** (requirement, design, task, change-log entry), then the code, then the **tests**, then the README.
6. Keep this **BRD** current: add each request to section 10 and each lasting decision to section 9.
