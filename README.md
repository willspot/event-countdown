# Event Countdown Collection

A simple countdown app for moments that actually matter: launches, deadlines, birthdays, and personal milestones.

## Tech Stack

- Next.js (App Router with `src/app`)
- TypeScript
- Tailwind CSS
- Browser `localStorage` for persistence

## What I Built

- A create/edit/delete flow for countdown events (name, date/time, optional notes).
- Multiple live countdown cards updating every second.
- Local persistence with `localStorage` (no backend).
- Urgency states so you can scan quickly:
  - `Critical` (within 24h)
  - `Soon` (within 7 days)
  - `Upcoming` (within 30 days)
  - `Far away`
  - `Passed`
- Priority sorting so urgent events appear first, then near-term events, then long-term ones.
- Compact icon actions for edit/delete to keep cards tight and readable.
- A progress bar plus countdown tiles (days/hours/minutes/seconds) to make time passage feel more visual.

## Why These Choices

- I kept it frontend-only so it is fast to run, easy to review, and aligned with the brief.
- The UI splits creation and monitoring into two clear areas so adding events does not compete with scanning existing ones.
- Urgency color, badges, and ordering do most of the cognitive work, so users can spot what needs attention immediately.
- I wanted the countdown itself to feel alive, not static, so each card combines a live timer with a progress indicator.

## UX + Design Notes

- I avoided template-like styling and used softer gradients, depth, and urgency accents so it feels custom.
- Interactions are intentionally direct (minimal clicks, compact actions) because this app is about quick updates.
- The empty state is friendly and explicit to make first use clear.

## Challenges Faced

- Balancing visual personality with readability when many countdowns are visible at once.
- Making urgency helpful without turning the interface into a wall of warning colors.
- Keeping date/time handling reliable while supporting smooth create/edit behavior.

## Approximate Time Spent

- ~3 to 4 hours

## Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build Check

```bash
npm run lint
npm run build
```
