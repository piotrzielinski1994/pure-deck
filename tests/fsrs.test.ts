import { describe, expect, it } from "vitest";
import { default_w } from "ts-fsrs";
import {
  createScheduler,
  gradeReview,
  newCard,
  Rating,
  State,
} from "@/lib/study/fsrs";

function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

describe("FSRS-6 defaults sanity", () => {
  it("should ship a 21-weight default parameter array", () => {
    expect(default_w).toHaveLength(21);
  });

  it("should expose the FSRS rating enum through the wrapper seam", () => {
    expect(Rating.Again).toBe(1);
    expect(Rating.Hard).toBe(2);
    expect(Rating.Good).toBe(3);
    expect(Rating.Easy).toBe(4);
  });

  it("should expose the FSRS state enum through the wrapper seam", () => {
    expect(State.New).toBe(0);
    expect(State.Learning).toBe(1);
    expect(State.Review).toBe(2);
    expect(State.Relearning).toBe(3);
  });

  it("should build a scheduler configured with FSRS-6 defaults", () => {
    const params = createScheduler().parameters;

    expect(params.w).toHaveLength(21);
    expect(params.request_retention).toBe(0.9);
    expect(params.maximum_interval).toBe(36500);
    expect(params.enable_fuzz).toBe(true);
  });
});

describe("gradeReview on a fresh card (TC-001 / AC-001)", () => {
  it("should return a Learning card due the same day with reps 1, positive stability, and a log", () => {
    const now = new Date("2026-07-19T12:00:00Z");
    const scheduler = createScheduler();
    const card = newCard(now);

    const { card: graded, log } = gradeReview(scheduler, card, Rating.Good, "cid-1", now);

    expect(graded.reps).toBe(1);
    expect(graded.stability).toBeGreaterThan(0);
    expect(graded.state).toBe(State.Learning);
    expect(graded.due.getTime()).toBeGreaterThan(now.getTime());
    expect(utcDay(graded.due)).toBe("2026-07-19");
    expect(log).toBeDefined();
    expect(log.rating).toBe(Rating.Good);
  });
});

describe("gradeReview on a graduated Review-state card (TC-002 / AC-002)", () => {
  const cid = "cid-2";

  function reviewStateCard() {
    const scheduler = createScheduler();
    const learnAt = new Date("2026-07-19T12:00:00Z");
    const graduateAt = new Date("2026-07-19T12:10:00Z");

    const learning = gradeReview(scheduler, newCard(learnAt), Rating.Good, cid, learnAt);
    const review = gradeReview(scheduler, learning.card, Rating.Good, cid, graduateAt);

    return { scheduler, card: review.card };
  }

  it("should graduate to Review state with reps 2 before the ordering assertions run", () => {
    const { card } = reviewStateCard();

    expect(card.state).toBe(State.Review);
    expect(card.reps).toBe(2);
  });

  it("should give distinct due times with due(Easy) > due(Good) > due(Hard)", () => {
    const { scheduler, card } = reviewStateCard();
    const now = new Date("2026-07-25T12:00:00Z");

    const dueAgain = gradeReview(scheduler, card, Rating.Again, cid, now).card.due.getTime();
    const dueHard = gradeReview(scheduler, card, Rating.Hard, cid, now).card.due.getTime();
    const dueGood = gradeReview(scheduler, card, Rating.Good, cid, now).card.due.getTime();
    const dueEasy = gradeReview(scheduler, card, Rating.Easy, cid, now).card.due.getTime();

    expect(dueEasy).toBeGreaterThan(dueGood);
    expect(dueGood).toBeGreaterThan(dueHard);
    expect(new Set([dueAgain, dueHard, dueGood, dueEasy]).size).toBe(4);
  });

  it("should move to Relearning and increment lapses when graded Again", () => {
    const { scheduler, card } = reviewStateCard();
    const now = new Date("2026-07-25T12:00:00Z");

    const lapsed = gradeReview(scheduler, card, Rating.Again, cid, now).card;

    expect(lapsed.state).toBe(State.Relearning);
    expect(lapsed.lapses).toBeGreaterThanOrEqual(1);
    expect(lapsed.lapses).toBeGreaterThan(card.lapses);
  });
});

describe("seeded fuzz determinism (TC-003 / AC-003)", () => {
  const start = new Date("2026-07-19T12:00:00Z");

  function longIntervalCard(scheduler: ReturnType<typeof createScheduler>, cid: string) {
    const offsetsMinutes = [0, 10, 3 * 24 * 60, 20 * 24 * 60];
    return offsetsMinutes.reduce(
      (card, offset) =>
        gradeReview(
          scheduler,
          card,
          Rating.Good,
          cid,
          new Date(start.getTime() + offset * 60_000),
        ).card,
      newCard(start),
    );
  }

  it("should produce a millisecond-equal due for identical inputs across two calls", () => {
    const scheduler = createScheduler();
    const base = longIntervalCard(scheduler, "cid-det");
    const at = new Date(base.due.getTime());

    const first = gradeReview(scheduler, base, Rating.Good, "cid-det", at);
    const second = gradeReview(scheduler, base, Rating.Good, "cid-det", at);

    expect(first.card.scheduled_days).toBeGreaterThan(1);
    expect(first.card.due.getTime()).toBe(second.card.due.getTime());
  });

  it("should apply different fuzz per card id so the seed strategy is actually wired", () => {
    const scheduler = createScheduler();
    const base = longIntervalCard(scheduler, "cid-seed");
    const at = new Date(base.due.getTime());

    const dueX = gradeReview(scheduler, base, Rating.Good, "seed-x", at).card.due.getTime();
    const dueY = gradeReview(scheduler, base, Rating.Good, "seed-y", at).card.due.getTime();

    expect(dueX).not.toBe(dueY);
  });
});
