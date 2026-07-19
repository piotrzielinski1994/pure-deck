import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { StudyView } from "@/components/workspace/study-view";
import type { Deck } from "@/lib/workspace/model";
import {
  newCard,
  Rating,
  type Card as FsrsCard,
  type Grade,
  type ReviewMap,
} from "@/lib/study/fsrs";

const NOW = new Date("2026-07-19T12:00:00Z");
const SAME_DAY_DUE = new Date("2026-07-19T12:06:00Z");
const NEXT_DAY_DUE = new Date("2026-07-20T12:00:00Z");
const FUTURE_DUE = new Date("2026-07-28T12:00:00Z");

function fsrsCardDueAt(due: Date): FsrsCard {
  return { ...newCard(NOW), due };
}

function dropOnGrade(): FsrsCard {
  return fsrsCardDueAt(NEXT_DAY_DUE);
}

const deck: Deck = {
  id: "es",
  name: "Spanish",
  cards: [
    { id: "c1", front: "gato", back: "cat" },
    { id: "c2", front: "hola", back: "hello" },
  ],
};

afterEach(() => {
  cleanup();
});

describe("StudyView flip behavior (AC-008)", () => {
  it("should show the front of the first due card and hide all four grade buttons before flipping", () => {
    render(
      <StudyView deck={deck} reviews={{}} onGrade={dropOnGrade} now={NOW} />,
    );

    expect(screen.getByText("gato")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /again/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /hard/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /good/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /easy/i }),
    ).not.toBeInTheDocument();
  });

  it("should reveal the back and show all four grade buttons when the card is clicked", () => {
    render(
      <StudyView deck={deck} reviews={{}} onGrade={dropOnGrade} now={NOW} />,
    );

    fireEvent.click(screen.getByText("gato"));

    expect(screen.getByText("cat")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /again/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /hard/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /good/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /easy/i })).toBeInTheDocument();
  });

  it("should reveal the back and grade buttons when Space is pressed", () => {
    render(
      <StudyView deck={deck} reviews={{}} onGrade={dropOnGrade} now={NOW} />,
    );

    expect(
      screen.queryByRole("button", { name: /good/i }),
    ).not.toBeInTheDocument();

    fireEvent.keyDown(document, { key: " ", code: "Space" });

    expect(screen.getByText("cat")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /good/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /easy/i })).toBeInTheDocument();
  });
});

describe("StudyView grade dispatch (TC-012 / AC-008)", () => {
  it("should call onGrade with the current card id and Rating.Easy when Easy is clicked", () => {
    const onGrade = vi.fn<(cardId: string, grade: Grade) => FsrsCard>(
      dropOnGrade,
    );
    render(<StudyView deck={deck} reviews={{}} onGrade={onGrade} now={NOW} />);

    fireEvent.click(screen.getByText("gato"));
    fireEvent.click(screen.getByRole("button", { name: /easy/i }));

    expect(onGrade).toHaveBeenCalledWith("c1", Rating.Easy);
    expect(Rating.Easy).toBe(4);
  });
});

describe("StudyView requeue on same-day due (TC-011 / AC-007)", () => {
  it("should requeue the card to the back of the session when the returned due is the same calendar day", () => {
    const onGrade = vi
      .fn<(cardId: string, grade: Grade) => FsrsCard>()
      .mockReturnValueOnce(fsrsCardDueAt(SAME_DAY_DUE))
      .mockReturnValueOnce(fsrsCardDueAt(NEXT_DAY_DUE));
    render(<StudyView deck={deck} reviews={{}} onGrade={onGrade} now={NOW} />);

    fireEvent.click(screen.getByText("gato"));
    fireEvent.click(screen.getByRole("button", { name: /good/i }));

    expect(onGrade).toHaveBeenNthCalledWith(1, "c1", Rating.Good);
    expect(screen.getByText("hola")).toBeInTheDocument();
    expect(screen.queryByText("gato")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("hola"));
    fireEvent.click(screen.getByRole("button", { name: /good/i }));

    expect(onGrade).toHaveBeenNthCalledWith(2, "c2", Rating.Good);
    expect(screen.getByText("gato")).toBeInTheDocument();
    expect(screen.queryByText(/all caught up/i)).not.toBeInTheDocument();
  });
});

describe("StudyView completion after grading away every due card (TC-010 / AC-007)", () => {
  it("should show the All caught up state with no card and no grade buttons when every returned due is a later day", () => {
    const onGrade = vi.fn<(cardId: string, grade: Grade) => FsrsCard>(
      dropOnGrade,
    );
    render(<StudyView deck={deck} reviews={{}} onGrade={onGrade} now={NOW} />);

    fireEvent.click(screen.getByText("gato"));
    fireEvent.click(screen.getByRole("button", { name: /good/i }));

    expect(screen.getByText("hola")).toBeInTheDocument();

    fireEvent.click(screen.getByText("hola"));
    fireEvent.click(screen.getByRole("button", { name: /good/i }));

    expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /good/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("gato")).not.toBeInTheDocument();
    expect(screen.queryByText("hola")).not.toBeInTheDocument();
  });
});

describe("StudyView completion at mount (TC-010 / AC-007)", () => {
  it("should show All caught up immediately when the only card is scheduled for a future day", () => {
    const reviews: ReviewMap = { c1: fsrsCardDueAt(FUTURE_DUE) };
    const single: Deck = { id: "es", name: "Spanish", cards: [deck.cards[0]] };

    render(
      <StudyView deck={single} reviews={reviews} onGrade={dropOnGrade} now={NOW} />,
    );

    expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
    expect(screen.queryByText("gato")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /good/i }),
    ).not.toBeInTheDocument();
  });
});

describe("StudyView rebuilds the queue when reviews load late (cold start)", () => {
  it("should exclude a now-future card once reviews arrive after the initial empty mount", () => {
    const single: Deck = { id: "es", name: "Spanish", cards: [deck.cards[0]] };
    const { rerender } = render(
      <StudyView deck={single} reviews={{}} onGrade={dropOnGrade} now={NOW} />,
    );

    expect(screen.getByText("gato")).toBeInTheDocument();

    rerender(
      <StudyView
        deck={single}
        reviews={{ c1: fsrsCardDueAt(FUTURE_DUE) }}
        onGrade={dropOnGrade}
        now={NOW}
      />,
    );

    expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
    expect(screen.queryByText("gato")).not.toBeInTheDocument();
  });
});

describe("StudyView empty deck (unchanged message)", () => {
  it("should show the No cards to study message when the deck has no cards", () => {
    const empty: Deck = { id: "es", name: "Spanish", cards: [] };
    render(
      <StudyView deck={empty} reviews={{}} onGrade={dropOnGrade} now={NOW} />,
    );

    expect(screen.getByText(/no cards to study/i)).toBeInTheDocument();
  });
});
