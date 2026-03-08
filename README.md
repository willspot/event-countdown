# Event Countdown Collection

A custom-built countdown manager for important moments: launches, deadlines, birthdays, and everything in between.

## Tech Stack

- Next.js (App Router with `src/app`)
- TypeScript
- Tailwind CSS
- Browser `localStorage` for persistence

## What I Built

- A single-page countdown app with:
  - create flow (name, date/time, optional description)
  - edit and delete actions
  - multiple countdown cards updating every second
- Persistent data using `localStorage` so events survive refreshes.
- A visual urgency system:
  - `Critical` (within 24h)
  - `Soon` (within 7 days)
  - `Upcoming` (within 30 days)
  - `Far away`
  - `Passed`
- Priority-based ordering so urgent events are shown first (Critical -> Soon -> Upcoming -> Far away -> Passed), with nearest deadlines at the top inside each group.
- Compact Font Awesome icon actions for edit/delete to keep cards tighter and easier to scan when many events are present.
- Time passage visualization per event using a progress meter from event creation time to event deadline.
- Countdown values shown as a clean grid of day/hour/minute/second tiles inside each event card.

## Why These Choices

- I kept everything on the client to match the no-backend requirement and keep setup friction low.
- The layout separates “create/manage” from “monitor” so creating events feels focused while tracking remains scan-friendly.
- Urgency colors, badges, and a visual priority bar help users immediately distinguish far-away events from events that need attention soon.
- A live counter (days/hours/minutes/seconds) plus a progress meter makes time feel both concrete and directional.

## UX + Design Notes

- Glassy cards, gradient urgency states, and soft depth create contrast without looking like a default dashboard template.
- Buttons and controls are intentionally straightforward for fast repeated entry/edit cycles.
- Empty state is explicit and inviting so first-run experience is clear.

## What I’d Improve With More Time

- Add drag-to-prioritize manual ordering in addition to date sorting.
- Add lightweight event categories (work, personal, launch) with filters.
- Add small motion transitions for card insert/update/remove states.
- Support optional recurring events for birthdays/annual milestones.

## Challenges Faced

- Balancing “interesting visual style” with readability when many cards are shown at once.
- Designing urgency rules that feel useful without being noisy or over-alerting.
- Keeping the code simple while still including edit mode, progress logic, and persistence.

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
