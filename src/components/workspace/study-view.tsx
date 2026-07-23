import { useActionHotkeys } from "@pziel/pureui";
import { useEffect, useMemo, useRef, useState } from "react";
import { useEffectiveShortcuts } from "@/lib/shortcuts/use-effective-shortcuts";
import {
  type Card as FsrsCard,
  type Grade,
  Rating,
  type ReviewMap,
} from "@/lib/study/fsrs";
import { buildStudyQueue, nowDate } from "@/lib/study/queue";
import type { Card, Deck } from "@/lib/workspace/model";

const GRADES = [
  ["Again", Rating.Again],
  ["Hard", Rating.Hard],
  ["Good", Rating.Good],
  ["Easy", Rating.Easy],
] as const satisfies readonly (readonly [string, Grade])[];

const ZERO_TALLY: Record<Grade, number> = {
  [Rating.Again]: 0,
  [Rating.Hard]: 0,
  [Rating.Good]: 0,
  [Rating.Easy]: 0,
};

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function StudyView({
  deck,
  reviews,
  onGrade,
  now: nowProp,
}: {
  deck: Deck;
  reviews: ReviewMap;
  onGrade: (cardId: string, grade: Grade) => FsrsCard;
  now?: Date;
}) {
  const now = useMemo(() => nowProp ?? nowDate(), [nowProp]);
  const [queue, setQueue] = useState<Card[]>(() =>
    buildStudyQueue(deck, reviews, now),
  );
  const [isFlipped, setIsFlipped] = useState(false);
  const [tally, setTally] = useState<Record<Grade, number>>(ZERO_TALLY);
  const hasGraded = useRef(false);

  useEffect(() => {
    if (hasGraded.current) {
      return;
    }
    setQueue(buildStudyQueue(deck, reviews, now));
  }, [deck, reviews, now]);

  const card = queue[0];

  const flip = () => setIsFlipped(true);

  const grade = (value: Grade) => {
    hasGraded.current = true;
    setIsFlipped(false);
    setTally((current) => ({ ...current, [value]: current[value] + 1 }));
    const scheduled = onGrade(card.id, value);
    setQueue((current) =>
      isSameDay(scheduled.due, now)
        ? [...current.slice(1), current[0]]
        : current.slice(1),
    );
  };

  const reviewed =
    tally[Rating.Again] +
    tally[Rating.Hard] +
    tally[Rating.Good] +
    tally[Rating.Easy];
  const accuracy =
    reviewed === 0
      ? 0
      : Math.round(((reviewed - tally[Rating.Again]) / reviewed) * 100);

  useActionHotkeys({ "flip-card": flip }, useEffectiveShortcuts(), {
    preventDefault: true,
  });

  if (deck.cards.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        No cards to study.
      </div>
    );
  }

  if (!card) {
    if (reviewed === 0) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
          <p className="text-base font-medium text-foreground">All caught up</p>
          <p>No cards due for review.</p>
        </div>
      );
    }
    return (
      <div className="flex h-full flex-col items-center justify-center gap-5 p-6 text-center text-muted-foreground">
        <div className="flex flex-col gap-1">
          <p className="text-base font-medium text-foreground">All caught up</p>
          <p>{`You reviewed ${reviewed} ${reviewed === 1 ? "card" : "cards"} today.`}</p>
        </div>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
          {GRADES.map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between gap-4"
            >
              <dt>{label}</dt>
              <dd className="font-medium text-foreground">{tally[value]}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm">{`Accuracy ${accuracy}%`}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 p-6">
      <p className="text-xs tracking-wide text-muted-foreground">
        {`reviewed ${reviewed}`} &middot; {`${queue.length} left`}
      </p>
      <button
        type="button"
        aria-label="Flip card"
        onClick={flip}
        className="flex min-h-52 w-full max-w-md flex-col items-center justify-center gap-4 border bg-card p-8"
      >
        <span className="text-3xl font-medium">{card.front}</span>
        {isFlipped && (
          <>
            <span className="h-px w-14 bg-border" />
            <span className="text-xl text-muted-foreground">{card.back}</span>
          </>
        )}
      </button>
      {isFlipped && (
        <div className="flex flex-wrap justify-center gap-2">
          {GRADES.map(([label, value]) => (
            <button
              key={label}
              type="button"
              onClick={() => grade(value)}
              className="min-h-11 min-w-20 border px-3 py-1.5 text-center text-sm font-medium hover:bg-accent md:min-h-0"
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
