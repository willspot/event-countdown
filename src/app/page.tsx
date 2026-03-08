"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
  faPenToSquare,
  faTrashCan,
} from "@fortawesome/free-solid-svg-icons";

type CountdownEvent = {
  id: string;
  name: string;
  dateTime: string;
  description: string;
  createdAt: string;
};

type DraftEvent = {
  name: string;
  date: string;
  hour: string;
  minute: string;
  meridiem: "AM" | "PM";
  description: string;
};

const STORAGE_KEY = "countdown-collection-v1";

function currentMeridiem(): "AM" | "PM" {
  return new Date().getHours() >= 12 ? "PM" : "AM";
}

function buildInitialDraft(): DraftEvent {
  return {
    name: "",
    date: "",
    hour: "",
    minute: "",
    meridiem: currentMeridiem(),
    description: "",
  };
}

function parseEventTime(value: string) {
  const localPattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
  const match = value.match(localPattern);
  if (match) {
    const [, year, month, day, hours, minutes] = match;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hours),
      Number(minutes),
      0,
      0,
    ).getTime();
  }
  return new Date(value).getTime();
}

function combineLocalDateTime(
  date: string,
  hour: string,
  minute: string,
  meridiem: "AM" | "PM",
) {
  const dateParts = date.split("-").map(Number);
  const hourRaw = hour.trim();
  const minuteRaw = minute.trim();
  if (
    dateParts.length !== 3 ||
    !/^\d{1,2}$/.test(hourRaw) ||
    !/^\d{1,2}$/.test(minuteRaw)
  ) {
    return null;
  }

  const [year, month, day] = dateParts;
  const rawHours = Number(hourRaw);
  const minutes = Number(minuteRaw);
  if (rawHours < 0 || rawHours > 12 || minutes < 0 || minutes > 59) return null;

  let hours = rawHours % 12;
  if (meridiem === "PM") {
    hours += 12;
  }

  const localDate = new Date(year, month - 1, day, hours, minutes, 0, 0);

  if (Number.isNaN(localDate.getTime())) return null;
  return localDate.toISOString();
}

function toDraftDateAndTime(value: string): {
  date: string;
  hour: string;
  minute: string;
  meridiem: "AM" | "PM";
} {
  const timeValue = parseEventTime(value);
  if (Number.isNaN(timeValue)) {
    return { date: "", hour: "", minute: "", meridiem: currentMeridiem() };
  }
  const date = new Date(timeValue);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours24 = date.getHours();
  const meridiem: "AM" | "PM" = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12;
  const hours = String(hours12).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return {
    date: `${year}-${month}-${day}`,
    hour: hours,
    minute: minutes,
    meridiem,
  };
}

function normalizeInputPart(value: string) {
  return value.replace(/\D/g, "").slice(0, 2);
}

function normalizeHourForSubmit(value: string) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return "";
  const clamped = Math.min(12, Math.max(0, numeric));
  return String(clamped).padStart(2, "0");
}

function normalizeMinuteForSubmit(value: string) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return "";
  const clamped = Math.min(59, Math.max(0, numeric));
  return String(clamped).padStart(2, "0");
}

function todayDateInputValue() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateInputToLocalMidnight(value: string) {
  const match = value.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    const [, year, month, day] = match;
    return new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0);
  }
  const fallback = new Date(value);
  if (Number.isNaN(fallback.getTime())) return null;
  return new Date(
    fallback.getFullYear(),
    fallback.getMonth(),
    fallback.getDate(),
    0,
    0,
    0,
    0,
  );
}

function formatDiff(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
}

function formatAbsoluteDate(value: string) {
  const date = new Date(parseEventTime(value));
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function urgencyLabel(milliseconds: number) {
  const hours = milliseconds / (1000 * 60 * 60);
  if (hours <= 0) return "Passed";
  if (hours <= 24) return "Critical";
  if (hours <= 24 * 7) return "Soon";
  if (hours <= 24 * 30) return "Upcoming";
  return "Far away";
}

function urgencyRank(milliseconds: number) {
  const label = urgencyLabel(milliseconds);
  if (label === "Critical") return 0;
  if (label === "Soon") return 1;
  if (label === "Upcoming") return 2;
  if (label === "Far away") return 3;
  return 4;
}

function urgencyStyles(label: string) {
  if (label === "Critical") {
    return "from-rose-500/30 to-red-500/15 border-rose-300/50 ring-rose-400/50";
  }
  if (label === "Soon") {
    return "from-amber-400/28 to-orange-500/15 border-amber-300/50 ring-amber-300/50";
  }
  if (label === "Upcoming") {
    return "from-sky-400/20 to-indigo-500/12 border-sky-300/45 ring-sky-300/45";
  }
  if (label === "Passed") {
    return "from-zinc-300/25 to-zinc-400/15 border-zinc-300/60 ring-zinc-300/50";
  }
  return "from-violet-300/18 to-fuchsia-400/10 border-violet-300/35 ring-violet-200/40";
}

function urgencyBadgeStyles(label: string) {
  if (label === "Critical") {
    return "border-rose-300 bg-rose-100 text-rose-700";
  }
  if (label === "Soon") {
    return "border-amber-300 bg-amber-100 text-amber-700";
  }
  if (label === "Upcoming") {
    return "border-sky-300 bg-sky-100 text-sky-700";
  }
  if (label === "Passed") {
    return "border-zinc-300 bg-zinc-100 text-zinc-700";
  }
  return "border-violet-300 bg-violet-100 text-violet-700";
}

function urgencyBarStyles(label: string) {
  if (label === "Critical") {
    return "bg-rose-500";
  }
  if (label === "Soon") {
    return "bg-amber-500";
  }
  if (label === "Upcoming") {
    return "bg-sky-500";
  }
  if (label === "Passed") {
    return "bg-zinc-400";
  }
  return "bg-violet-500";
}

function progressValue(event: CountdownEvent, now: number) {
  const start = new Date(event.createdAt).getTime();
  const end = parseEventTime(event.dateTime);
  if (end <= start) return now >= end ? 100 : 0;
  const ratio = ((now - start) / (end - start)) * 100;
  return Math.max(0, Math.min(100, ratio));
}

export default function Home() {
  const [events, setEvents] = useState<CountdownEvent[]>([]);
  const [draft, setDraft] = useState<DraftEvent>(buildInitialDraft);
  const [now, setNow] = useState<number>(Date.now());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CountdownEvent | null>(
    null,
  );
  const [formError, setFormError] = useState<string>("");
  const [loaded, setLoaded] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CountdownEvent[];
        if (Array.isArray(parsed)) {
          const normalized = parsed
            .map((item) => {
              const draftValues = toDraftDateAndTime(item.dateTime);
              const targetAt = combineLocalDateTime(
                draftValues.date,
                draftValues.hour,
                draftValues.minute,
                draftValues.meridiem,
              );
              if (!targetAt) return null;
              return {
                ...item,
                dateTime: targetAt,
              };
            })
            .filter((item): item is CountdownEvent => item !== null);
          setEvents(normalized);
        }
      }
    } catch {
      setEvents([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }, [events, loaded]);

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const diffA = parseEventTime(a.dateTime) - now;
      const diffB = parseEventTime(b.dateTime) - now;
      const rankA = urgencyRank(diffA);
      const rankB = urgencyRank(diffB);

      if (rankA !== rankB) return rankA - rankB;
      if (diffA > 0 && diffB > 0) return diffA - diffB;
      if (diffA <= 0 && diffB <= 0) return diffB - diffA;
      return diffA - diffB;
    });
  }, [events, now]);

  function resetDraft() {
    setDraft(buildInitialDraft());
    setEditingId(null);
    setFormError("");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = draft.name.trim();
    if (!trimmedName || !draft.date || !draft.hour || !draft.minute) return;
    const selectedDate = parseDateInputToLocalMidnight(draft.date);
    const minDate = parseDateInputToLocalMidnight(todayDateInputValue());
    if (!selectedDate || !minDate || selectedDate < minDate) {
      setFormError("Please choose today or a future date.");
      return;
    }
    const normalizedHour = normalizeHourForSubmit(draft.hour);
    const normalizedMinute = normalizeMinuteForSubmit(draft.minute);
    const targetAt = combineLocalDateTime(
      draft.date,
      normalizedHour,
      normalizedMinute,
      draft.meridiem,
    );
    if (!targetAt) {
      setFormError("Enter a valid time using hour 00-12 and minute 00-59.");
      return;
    }
    const targetAtMs = parseEventTime(targetAt);
    if (targetAtMs <= Date.now()) {
      setFormError("Please choose a time later than the current time.");
      return;
    }
    setFormError("");
    setDraft((previous) => ({
      ...previous,
      hour: normalizedHour,
      minute: normalizedMinute,
    }));

    if (editingId) {
      setEvents((previous) =>
        previous.map((item) =>
          item.id === editingId
            ? {
                ...item,
                name: trimmedName,
                dateTime: targetAt,
                description: draft.description.trim(),
              }
            : item,
        ),
      );
    } else {
      const createdAt = new Date().toISOString();
      setEvents((previous) => [
        ...previous,
        {
          id: crypto.randomUUID(),
          name: trimmedName,
          dateTime: targetAt,
          description: draft.description.trim(),
          createdAt,
        },
      ]);
    }

    resetDraft();
  }

  function startEdit(eventItem: CountdownEvent) {
    const values = toDraftDateAndTime(eventItem.dateTime);
    setEditingId(eventItem.id);
    setDraft({
      name: eventItem.name,
      date: values.date,
      hour: values.hour,
      minute: values.minute,
      meridiem: values.meridiem,
      description: eventItem.description,
    });
  }

  function removeEvent(id: string) {
    setEvents((previous) => previous.filter((item) => item.id !== id));
    if (editingId === id) resetDraft();
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    removeEvent(pendingDelete.id);
    setPendingDelete(null);
  }

  function scrollCountdowns(direction: "left" | "right") {
    if (!railRef.current) return;
    const distance = Math.max(
      320,
      Math.floor(railRef.current.clientWidth * 0.7),
    );
    railRef.current.scrollBy({
      left: direction === "right" ? distance : -distance,
      behavior: "smooth",
    });
  }

  const criticalCount = sortedEvents.filter((item) => {
    const diff = parseEventTime(item.dateTime) - now;
    return diff > 0 && diff <= 24 * 60 * 60 * 1000;
  }).length;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,#fdf4ff_0%,#ecfeff_38%,#f8fafc_100%)] px-4 py-10 text-zinc-900 sm:px-6 lg:px-10">
      <main className="mx-auto grid w-full max-w-6xl min-w-0 gap-6 md:grid-cols-[340px_1fr] xl:grid-cols-[410px_1fr]">
        <section className="h-fit border border-white/80 bg-white/80 p-5 shadow-[0_24px_80px_-30px_rgba(15,23,42,0.3)] backdrop-blur-md sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Event Countdown Collection
          </p>
          <h1 className="mt-2 text-2xl font-semibold leading-tight text-zinc-900 sm:text-3xl">
            Time feels different when you can see it.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            Build a stack of moments that matter and keep an eye on what needs
            your attention first.
          </p>

          <div className="mt-5 grid grid-cols-3 gap-3 rounded-2xl bg-zinc-900 p-3 text-white">
            <div>
              <p className="text-xs text-zinc-400">Total</p>
              <p className="text-2xl font-semibold">{sortedEvents.length}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-400">Critical</p>
              <p className="text-2xl font-semibold">{criticalCount}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-400">Passed</p>
              <p className="text-2xl font-semibold">
                {
                  sortedEvents.filter(
                    (item) => parseEventTime(item.dateTime) - now <= 0,
                  ).length
                }
              </p>
            </div>
          </div>

          <form className="mt-6 space-y-3" onSubmit={handleSubmit}>
            <input
              type="text"
              value={draft.name}
              onChange={(event) => {
                setFormError("");
                setDraft((previous) => ({
                  ...previous,
                  name: event.target.value,
                }));
              }}
              placeholder="Event name"
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
              required
            />
            <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
              <input
                type="date"
                value={draft.date}
                min={todayDateInputValue()}
                onChange={(event) => {
                  setFormError("");
                  setDraft((previous) => ({
                    ...previous,
                    date: event.target.value,
                  }));
                }}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
                required
              />
              <div className="min-w-0">
                <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-center gap-2">
                  <input
                    type="text"
                    value={draft.hour}
                    onChange={(event) => {
                      setFormError("");
                      setDraft((previous) => ({
                        ...previous,
                        hour: normalizeInputPart(event.target.value),
                      }));
                    }}
                    onBlur={() =>
                      setDraft((previous) => ({
                        ...previous,
                        hour: previous.hour
                          ? normalizeHourForSubmit(previous.hour)
                          : "",
                      }))
                    }
                    placeholder="07"
                    inputMode="numeric"
                    className="min-w-0 w-full rounded-xl border border-zinc-200 bg-white px-2 py-2.5 text-center text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
                    required
                  />
                  <span className="text-lg font-semibold text-zinc-500">:</span>
                  <input
                    type="text"
                    value={draft.minute}
                    onChange={(event) => {
                      setFormError("");
                      setDraft((previous) => ({
                        ...previous,
                        minute: normalizeInputPart(event.target.value),
                      }));
                    }}
                    onBlur={() =>
                      setDraft((previous) => ({
                        ...previous,
                        minute: previous.minute
                          ? normalizeMinuteForSubmit(previous.minute)
                          : "",
                      }))
                    }
                    placeholder="13"
                    inputMode="numeric"
                    className="min-w-0 w-full rounded-xl border border-zinc-200 bg-white px-2 py-2.5 text-center text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
                    required
                  />
                  <select
                    value={draft.meridiem}
                    onChange={(event) => {
                      setFormError("");
                      setDraft((previous) => ({
                        ...previous,
                        meridiem: event.target.value as "AM" | "PM",
                      }));
                    }}
                    className="w-18 rounded-xl border border-zinc-200 bg-white px-2 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>
            </div>
            {formError ? (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                {formError}
              </p>
            ) : null}
            <textarea
              value={draft.description}
              onChange={(event) =>
                setDraft((previous) => ({
                  ...previous,
                  description: event.target.value,
                }))
              }
              placeholder="Optional notes"
              rows={3}
              className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="submit"
                className="flex-1 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700"
              >
                {editingId ? "Save changes" : "Add countdown"}
              </button>
              {editingId ? (
                <button
                  type="button"
                  onClick={resetDraft}
                  className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 sm:w-auto"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="relative min-w-0 overflow-hidden">
          {sortedEvents.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-zinc-300 bg-white/70 p-10 text-center backdrop-blur-md">
              <p className="text-lg font-medium text-zinc-800">No events yet</p>
              <p className="mt-1 text-sm text-zinc-600">
                Add your first deadline, launch, or birthday to start the
                collection.
              </p>
            </div>
          ) : null}

          {sortedEvents.length > 0 ? (
            <>
              <div
                ref={railRef}
                className="countdown-scroll flex max-w-full snap-x snap-mandatory gap-3 overflow-x-auto pb-3"
              >
                {sortedEvents.map((item) => {
                  const diff = parseEventTime(item.dateTime) - now;
                  const time = formatDiff(diff);
                  const urgency = urgencyLabel(diff);
                  const meter = progressValue(item, now);
                  return (
                    <article
                      key={item.id}
                      className={`w-[min(92vw,30rem)] shrink-0 snap-start rounded-3xl border bg-linear-to-br p-5 shadow-[0_18px_55px_-28px_rgba(15,23,42,0.35)] backdrop-blur-md transition hover:-translate-y-0.5 sm:w-104 ${urgencyStyles(
                        urgency,
                      )}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h2 className="text-xl font-semibold text-zinc-900">
                            {item.name}
                          </h2>
                          <p className="mt-1 text-sm text-zinc-600">
                            {formatAbsoluteDate(item.dateTime)}
                          </p>
                        </div>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-widest ${urgencyBadgeStyles(
                            urgency,
                          )}`}
                        >
                          {urgency}
                        </span>
                      </div>
                      <div
                        className={`mt-3 h-1.5 w-full rounded-full ${urgencyBarStyles(
                          urgency,
                        )}`}
                      />

                      {item.description ? (
                        <p className="mt-3 text-sm leading-relaxed text-zinc-700">
                          {item.description}
                        </p>
                      ) : null}

                      {diff > 0 ? (
                        <div className="mt-4 rounded-2xl border border-white/70 bg-white/60 p-2">
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { label: "Days", value: time.days },
                              { label: "Hours", value: time.hours },
                              { label: "Min", value: time.minutes },
                              { label: "Sec", value: time.seconds },
                            ].map((block) => (
                              <div
                                key={block.label}
                                className="rounded-xl border border-white/80 bg-white/80 px-2 py-3 text-center"
                              >
                                <p className="text-2xl font-semibold leading-none text-zinc-900">
                                  {String(block.value).padStart(2, "0")}
                                </p>
                                <p className="mt-1 text-[11px] uppercase tracking-wider text-zinc-500">
                                  {block.label}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 rounded-xl border border-white/70 bg-white/70 px-4 py-3 text-sm font-medium text-zinc-700">
                          This event has passed.
                        </div>
                      )}

                      <div className="mt-4">
                        <div className="mb-1.5 flex items-center justify-between text-xs font-medium uppercase tracking-wider text-zinc-500">
                          <span>Time passage</span>
                          <span>{Math.round(meter)}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/80">
                          <div
                            className="h-full rounded-full bg-zinc-900 transition-all"
                            style={{ width: `${meter}%` }}
                          />
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          aria-label={`Edit ${item.name}`}
                          title="Edit"
                          className="grid h-9 w-9 place-items-center rounded-lg border border-zinc-300 bg-white/85 text-sm text-zinc-700 transition hover:bg-white"
                        >
                          <FontAwesomeIcon icon={faPenToSquare} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDelete(item)}
                          aria-label={`Delete ${item.name}`}
                          title="Delete"
                          className="grid h-9 w-9 place-items-center rounded-lg border border-rose-300 bg-rose-50 text-sm text-rose-700 transition hover:bg-rose-100"
                        >
                          <FontAwesomeIcon icon={faTrashCan} />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>

              <button
                type="button"
                aria-label="Scroll left"
                onClick={() => scrollCountdowns("left")}
                className="absolute left-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-white/70 bg-white/65 p-2 text-zinc-700 opacity-55 shadow-lg backdrop-blur transition hover:opacity-95 lg:grid"
              >
                <FontAwesomeIcon icon={faChevronLeft} />
              </button>
              <button
                type="button"
                aria-label="Scroll right"
                onClick={() => scrollCountdowns("right")}
                className="absolute right-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-white/70 bg-white/65 p-2 text-zinc-700 opacity-55 shadow-lg backdrop-blur transition hover:opacity-95 lg:grid"
              >
                <FontAwesomeIcon icon={faChevronRight} />
              </button>
            </>
          ) : null}
        </section>
      </main>

      {pendingDelete ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-zinc-900/45 p-4 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Close delete confirmation"
            className="absolute inset-0 cursor-default"
            onClick={() => setPendingDelete(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/80 bg-white p-5 shadow-[0_24px_80px_-30px_rgba(15,23,42,0.45)] sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-600">
              Confirm delete
            </p>
            <h3 className="mt-2 text-xl font-semibold text-zinc-900">
              Remove this countdown?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">
              You are about to delete{" "}
              <span className="font-semibold text-zinc-900">
                {pendingDelete.name}
              </span>
              . This action cannot be undone.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="flex-1 rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 rounded-xl border border-rose-300 bg-rose-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-rose-700"
              >
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
