import * as prand from "pure-rand";
import * as Debug from "~CardLib/Debug";
import { Card } from "~CardLib/Model/Card";
import * as DeckUtils from "~CardLib/Model/DeckUtils";
import { DelayHint } from "~CardLib/Model/DelayHint";
import { GameBase } from "~CardLib/Model/GameBase";
import { Pile } from "~CardLib/Model/Pile";
import { Rank } from "~CardLib/Model/Rank";
import { GameOptions } from "./GameOptions";
import { IGame } from "./IGame";

const TABLEAUX_COUNT = 10;

function getCardValue(rank: Rank): number {
    switch (rank) {
        case Rank.Ace:
            return 1;
        case Rank.Two:
            return 2;
        case Rank.Three:
            return 3;
        case Rank.Four:
            return 4;
        case Rank.Five:
            return 5;
        case Rank.Six:
            return 6;
        case Rank.Seven:
            return 7;
        case Rank.Eight:
            return 8;
        case Rank.Nine:
            return 9;
        case Rank.Ten:
            return 10;
        case Rank.Jack:
            return 11;
        case Rank.Queen:
            return 12;
        case Rank.King:
            return 13;
        default:
            return 0;
    }
}

function isSameSuitDescendingRun(cards: Card[]): boolean {
    if (cards.length === 0) return false;
    for (let i = 0; i < cards.length - 1; ++i) {
        const c0 = cards[i] ?? Debug.error();
        const c1 = cards[i + 1] ?? Debug.error();
        if (getCardValue(c0.rank) !== getCardValue(c1.rank) + 1 || c0.suit !== c1.suit) {
            return false;
        }
    }
    return true;
}

export class Game extends GameBase implements IGame {
    public readonly options: GameOptions;
    public readonly foundations: Pile[] = [];
    public readonly tableaux: Pile[] = [];

    constructor(options: GameOptions) {
        super();
        this.options = options;

        for (let i = 0; i < TABLEAUX_COUNT; ++i) {
            const pile = new Pile(this);
            this.tableaux.push(pile);
            this.piles.push(pile);
        }

        for (let i = 0; i < 4; ++i) {
            const pile = new Pile(this);
            this.foundations.push(pile);
            this.piles.push(pile);
        }

        this.cards = DeckUtils.createStandard52Deck(this.tableaux[0]);
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
            if (getCardValue(a.rank) > getCardValue(b.rank)) return 1;
            if (getCardValue(a.rank) < getCardValue(b.rank)) return -1;
            return 0;
        });
        return wonCards;
    }

    protected *restart_(rng: prand.RandomGenerator) {
        const tempStock = new Pile(this);
        for (const card of this.cards) {
            card.faceUp = true;
            tempStock.push(card);
        }

        tempStock.sort();
        tempStock.shuffle(rng);

        yield DelayHint.Settle;

        const colCounts = [8, 8, 8, 7, 6, 5, 4, 3, 2, 1];
        for (let i = 0; i < this.tableaux.length; ++i) {
            const pile = this.tableaux[i] ?? Debug.error();
            const count = colCounts[i] ?? 0;
            for (let j = 0; j < count; ++j) {
                const card = tempStock.peek();
                if (card) {
                    card.faceUp = true;
                    pile.push(card);
                    yield DelayHint.Quick;
                }
            }
        }

        yield DelayHint.OneByOne;

        yield* this.doAutoMoves_();
    }

    protected *cardPrimary_(card: Card) {}

    protected *cardSecondary_(card: Card) {}

    protected *pilePrimary_(pile: Pile) {}

    protected *pileSecondary_(pile: Pile) {}

    protected canDrag_(card: Card): { canDrag: boolean; extraCards: Card[] } {
        if (this.tableaux.indexOf(card.pile) >= 0 && card.faceUp) {
            const movingCards = card.pile.slice(card.pileIndex);
            if (isSameSuitDescendingRun(movingCards)) {
                return { canDrag: true, extraCards: movingCards.slice(1) };
            }
        }
        return { canDrag: false, extraCards: [] };
    }

    protected previewDrop_(card: Card, pile: Pile): boolean {
        if (card.pile === pile) return false;
        if (this.tableaux.indexOf(pile) >= 0) {
            const topCard = pile.peek();
            if (topCard) {
                if (getCardValue(topCard.rank) === getCardValue(card.rank) + 1) {
                    return true;
                }
            } else {
                return true;
            }
        }
        return false;
    }

    protected *dropCard_(card: Card, pile: Pile) {
        if (this.previewDrop_(card, pile)) {
            const movingCards = card.pile.slice(card.pileIndex);
            for (const movingCard of movingCards) {
                pile.push(movingCard);
            }
            yield DelayHint.OneByOne;
            yield* this.doAutoMoves_();
        }
    }

    private *doAutoMoves_() {
        let changed = false;
        do {
            changed = false;
            for (const tableau of this.tableaux) {
                if (tableau.length >= 13) {
                    const runCards = tableau.slice(tableau.length - 13);
                    if (isSameSuitDescendingRun(runCards) && getCardValue(runCards[0].rank) === 13) {
                        const foundation = this.foundations.find(f => f.length === 0);
                        if (foundation) {
                            for (let r = 12; r >= 0; --r) {
                                const c = runCards[r] ?? Debug.error();
                                foundation.push(c);
                            }
                            changed = true;
                            yield DelayHint.OneByOne;
                            break;
                        }
                    }
                }
            }
        } while (changed);
    }
}
