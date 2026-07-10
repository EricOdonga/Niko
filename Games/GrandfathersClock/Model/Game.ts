import * as prand from "pure-rand";
import * as Debug from "~CardLib/Debug";
import { Card } from "~CardLib/Model/Card";
import * as DeckUtils from "~CardLib/Model/DeckUtils";
import { DelayHint } from "~CardLib/Model/DelayHint";
import { GameBase } from "~CardLib/Model/GameBase";
import { Pile } from "~CardLib/Model/Pile";
import { Rank } from "~CardLib/Model/Rank";
import { Suit } from "~CardLib/Model/Suit";
import { GameOptions } from "./GameOptions";
import { IGame } from "./IGame";

interface CardSpec {
    rank: Rank;
    suit: Suit;
}

const SEED_SPECS: CardSpec[] = [
    { rank: Rank.Ten, suit: Suit.Hearts },       // 1 o'clock (Stack 8)
    { rank: Rank.Jack, suit: Suit.Spades },      // 2 o'clock (Stack 9)
    { rank: Rank.Queen, suit: Suit.Diamonds },   // 3 o'clock (Stack 10)
    { rank: Rank.King, suit: Suit.Clubs },       // 4 o'clock (Stack 11)
    { rank: Rank.Ace, suit: Suit.Hearts },       // 5 o'clock (Stack 12)
    { rank: Rank.Two, suit: Suit.Spades },       // 6 o'clock (Stack 13)
    { rank: Rank.Three, suit: Suit.Diamonds },   // 7 o'clock (Stack 14)
    { rank: Rank.Four, suit: Suit.Clubs },       // 8 o'clock (Stack 15)
    { rank: Rank.Five, suit: Suit.Hearts },      // 9 o'clock (Stack 16)
    { rank: Rank.Six, suit: Suit.Spades },       // 10 o'clock (Stack 17)
    { rank: Rank.Seven, suit: Suit.Diamonds },   // 11 o'clock (Stack 18)
    { rank: Rank.Nine, suit: Suit.Clubs },       // 12 o'clock (Stack 19)
];

export class Game extends GameBase implements IGame {
    public readonly options: GameOptions;
    public readonly tableaux: Pile[] = [];
    public readonly foundations: Pile[] = [];
    public readonly stock = new Pile(this);

    constructor(options: GameOptions) {
        super();
        this.options = options;

        // Tableau: Stacks 0-7
        for (let i = 0; i < 8; ++i) {
            const pile = new Pile(this);
            this.tableaux.push(pile);
            this.piles.push(pile);
        }

        // Foundations: Stacks 8-19
        for (let i = 0; i < 12; ++i) {
            const pile = new Pile(this);
            this.foundations.push(pile);
            this.piles.push(pile);
        }

        // Stock: Stack 20
        this.piles.push(this.stock);

        this.cards = DeckUtils.createStandard52Deck(this.stock);
    }

    protected doGetWon_() {
        let sum = 0;
        for (const pile of this.foundations) {
            sum += pile.length;
        }
        return sum === 52;
    }

    public get wonCards() {
        const wonCards: Card[] = [];
        for (const pile of this.foundations) {
            for (const card of pile) {
                wonCards.push(card);
            }
        }
        wonCards.sort((a, b) => {
            if (a.pileIndex > b.pileIndex) return 1;
            if (a.pileIndex < b.pileIndex) return -1;
            if (a.rank > b.rank) return 1;
            if (a.rank < b.rank) return -1;
            return 0;
        });
        return wonCards;
    }

    protected *restart_(rng: prand.RandomGenerator) {
        // 1. Return all cards to the stock and make them face-down
        for (const card of this.stock) {
            card.faceUp = false;
        }

        for (let pileIndex = this.piles.length; pileIndex-- > 0; ) {
            const pile = this.piles[pileIndex] ?? Debug.error();
            if (pile === this.stock) continue;
            for (let cardIndex = pile.length; cardIndex-- > 0; ) {
                const card = pile.at(cardIndex);
                card.faceUp = false;
                this.stock.push(card);
            }
        }

        // 2. Sort then shuffle the stock
        this.stock.sort();
        this.stock.shuffle(rng);

        yield DelayHint.Settle;

        // 3. Extract the 12 pre-seeded foundation cards from stock and place them face up on their foundations
        for (let i = 0; i < 12; ++i) {
            const spec = SEED_SPECS[i] ?? Debug.error();
            let foundCard: Card | undefined;
            for (let j = 0; j < this.stock.length; ++j) {
                const card = this.stock.at(j);
                if (card.rank === spec.rank && card.suit === spec.suit) {
                    foundCard = card;
                    break;
                }
            }
            if (foundCard) {
                foundCard.faceUp = true;
                this.foundations[i]?.push(foundCard);
                yield DelayHint.Quick;
            }
        }

        // 4. Deal the remaining 40 cards face up evenly across the 8 tableaux
        for (let cardIndex = 0; cardIndex < 5; ++cardIndex) {
            for (let pileIndex = 0; pileIndex < 8; ++pileIndex) {
                const card = this.stock.peek();
                if (card) {
                    card.faceUp = true;
                    this.tableaux[pileIndex]?.push(card);
                    yield DelayHint.Quick;
                }
            }
        }

        yield DelayHint.OneByOne;
    }

    protected *cardPrimary_(card: Card) {
        // Single clicking a card has no active trigger in Grandfather's Clock,
        // as cards are moved via drag-and-drop or double-clicking.
        yield* [];
    }

    protected *cardSecondary_(card: Card) {
        // Double clicking a card moves it to foundations if possible:
        if (card.pile.peek() === card && card.faceUp) {
            for (const foundation of this.foundations) {
                if (this.isFoundationDrop_(card, foundation)) {
                    foundation.push(card);
                    yield DelayHint.OneByOne;
                    yield* this.doAutoMoves_();
                    return;
                }
            }
        }
    }

    protected *pilePrimary_(pile: Pile) {
        yield* [];
    }

    protected *pileSecondary_(pile: Pile) {
        yield* [];
    }

    protected canDrag_(card: Card): { canDrag: boolean; extraCards: Card[] } {
        // Only top card of a tableau pile can be played
        if (this.tableaux.indexOf(card.pile) >= 0 && card.pile.peek() === card && card.faceUp) {
            return { canDrag: true, extraCards: [] };
        }
        return { canDrag: false, extraCards: [] };
    }

    protected previewDrop_(card: Card, pile: Pile): boolean {
        return this.isTableauxDrop_(card, pile) || this.isFoundationDrop_(card, pile);
    }

    protected *dropCard_(card: Card, pile: Pile) {
        if (this.isTableauxDrop_(card, pile)) {
            pile.push(card);
            yield DelayHint.OneByOne;
            yield* this.doAutoMoves_();
        } else if (this.isFoundationDrop_(card, pile)) {
            pile.push(card);
            yield DelayHint.OneByOne;
            yield* this.doAutoMoves_();
        }
    }

    private getNextRank_(rank: Rank): Rank {
        if (rank === Rank.King) return Rank.Ace;
        if (rank === Rank.Ten) return Rank.Jack;
        if (rank === Rank.Jack) return Rank.Queen;
        if (rank === Rank.Queen) return Rank.King;
        return (rank + 1) as Rank;
    }

    private getPreviousRank_(rank: Rank): Rank {
        if (rank === Rank.Ace) return Rank.King;
        if (rank === Rank.Jack) return Rank.Ten;
        if (rank === Rank.Queen) return Rank.Jack;
        if (rank === Rank.King) return Rank.Queen;
        return (rank - 1) as Rank;
    }

    private getTargetRank_(i: number): Rank {
        const hour = i + 1;
        if (hour <= 10) return hour as Rank;
        if (hour === 11) return Rank.Jack;
        if (hour === 12) return Rank.Queen;
        return Rank.None;
    }

    private isTableauxDrop_(card: Card, pile: Pile): boolean {
        if (card.pile === pile) return false;

        const tIndex = this.tableaux.indexOf(pile);
        if (tIndex >= 0) {
            const topCard = pile.peek();
            if (topCard) {
                // Tableaus build down regardless of suit (with circular wrapping King on Ace):
                if (card.rank === this.getPreviousRank_(topCard.rank)) {
                    return true;
                }
            } else {
                // Empty tableaus can be filled with any card
                return true;
            }
        }
        return false;
    }

    private isFoundationDrop_(card: Card, pile: Pile): boolean {
        if (card.pile === pile) return false;

        const fIndex = this.foundations.indexOf(pile);
        if (fIndex >= 0) {
            const topCard = pile.peek();
            if (topCard) {
                // If top card is already the target rank, we cannot build any more!
                if (topCard.rank === this.getTargetRank_(fIndex)) {
                    return false;
                }
                // Must be of the same suit and the next rank:
                if (card.suit === topCard.suit && card.rank === this.getNextRank_(topCard.rank)) {
                    return true;
                }
            }
        }
        return false;
    }

    private *doAutoMoves_() {
        // No auto-moves to foundations to allow strategic planning, as cards are often needed on tableaus.
        yield* [];
    }
}
