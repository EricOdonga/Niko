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

const TABLEAUX_COUNT = 8;
const FREE_CELLS_COUNT = 8;
const FOUNDATIONS_COUNT = 4;

export class Game extends GameBase implements IGame {
    public readonly options: GameOptions;
    public readonly tableaux: Pile[] = [];
    public readonly freeCells: Pile[] = [];
    public readonly foundations: Pile[] = [];

    constructor(options: GameOptions) {
        super();
        this.options = options;

        // Tableau Piles: Stacks 0 to 7 (8 columns)
        for (let i = 0; i < TABLEAUX_COUNT; ++i) {
            const pile = new Pile(this);
            this.tableaux.push(pile);
            this.piles.push(pile);
        }

        // Free Cells: Stacks 8 to 15 (8 total free slots)
        for (let i = 0; i < FREE_CELLS_COUNT; ++i) {
            const pile = new Pile(this);
            this.freeCells.push(pile);
            this.piles.push(pile);
        }

        // Foundation Piles: Stacks 16 to 19 (4 slots)
        for (let i = 0; i < FOUNDATIONS_COUNT; ++i) {
            const pile = new Pile(this);
            this.foundations.push(pile);
            this.piles.push(pile);
        }

        const tempStock = new Pile(this);
        this.cards = DeckUtils.createStandard52Deck(tempStock);
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
        const tempStock = new Pile(this);
        for (const card of this.cards) {
            card.faceUp = false;
            tempStock.push(card);
        }
        tempStock.shuffle(rng);

        yield DelayHint.Quick;

        // Deal 6 cards face up to each of the 8 tableau columns (48 cards total).
        for (let j = 0; j < 6; ++j) {
            for (let i = 0; i < TABLEAUX_COUNT; ++i) {
                const card = tempStock.peek();
                if (card) {
                    card.faceUp = true;
                    (this.tableaux[i] ?? Debug.error()).push(card);
                    yield DelayHint.Quick;
                }
            }
        }

        // Place the remaining 4 cards face up into the first 4 free cells (Stacks 8-11), leaving 4 free cells completely empty.
        for (let i = 0; i < 4; ++i) {
            const card = tempStock.peek();
            if (card) {
                card.faceUp = true;
                (this.freeCells[i] ?? Debug.error()).push(card);
                yield DelayHint.Quick;
            }
        }

        yield DelayHint.Settle;
        yield* this.doAutoMoves_();
    }

    protected *pilePrimary_(pile: Pile) {}
    protected *pileSecondary_(pile: Pile) {}
    protected *cardPrimary_(card: Card) {}

    protected *cardSecondary_(card: Card) {
        if (this.canDrag_(card).canDrag) {
            for (const pile of this.foundations) {
                if (this.isFoundationDrop_(card, pile)) {
                    yield* this.doFoundationDrop_(card, pile);
                    yield* this.doAutoMoves_();
                    return;
                }
            }

            for (const pile of this.freeCells) {
                if (this.isFreeCellDrop_(card, pile)) {
                    yield* this.doFreeCellDrop_(card, pile);
                    yield* this.doAutoMoves_();
                    return;
                }
            }

            for (const pile of this.tableaux) {
                if (this.isTableauxDrop_(card, pile)) {
                    yield* this.doTableauxDrop_(card, pile);
                    yield* this.doAutoMoves_();
                    return;
                }
            }
        }
    }

    protected canDrag_(card: Card): { canDrag: boolean; extraCards: Card[] } {
        if (this.isFoundationDropSource_(card)) {
            return { canDrag: true, extraCards: [] };
        } else if (this.isFreeCellDropSource_(card)) {
            return { canDrag: true, extraCards: [] };
        } else if (this.isTableauxDropSource_(card)) {
            return { canDrag: true, extraCards: card.pile.slice(card.pileIndex + 1) };
        }
        return { canDrag: false, extraCards: [] };
    }

    protected previewDrop_(card: Card, pile: Pile): boolean {
        return this.isTableauxDrop_(card, pile) || this.isFoundationDrop_(card, pile) || this.isFreeCellDrop_(card, pile);
    }

    protected *dropCard_(card: Card, pile: Pile) {
        if (this.isTableauxDrop_(card, pile)) {
            yield* this.doTableauxDrop_(card, pile);
            yield* this.doAutoMoves_();
        } else if (this.isFoundationDrop_(card, pile)) {
            yield* this.doFoundationDrop_(card, pile);
            yield* this.doAutoMoves_();
        } else if (this.isFreeCellDrop_(card, pile)) {
            yield* this.doFreeCellDrop_(card, pile);
            yield* this.doAutoMoves_();
        }
    }

    private getCardValue_(card: Card) {
        if (card.rank === Rank.Ace) return 1;
        if (card.rank === Rank.Two) return 2;
        if (card.rank === Rank.Three) return 3;
        if (card.rank === Rank.Four) return 4;
        if (card.rank === Rank.Five) return 5;
        if (card.rank === Rank.Six) return 6;
        if (card.rank === Rank.Seven) return 7;
        if (card.rank === Rank.Eight) return 8;
        if (card.rank === Rank.Nine) return 9;
        if (card.rank === Rank.Ten) return 10;
        if (card.rank === Rank.Jack) return 11;
        if (card.rank === Rank.Queen) return 12;
        if (card.rank === Rank.King) return 13;
        return Debug.error();
    }

    private get maxMoveableCards(): number {
        const emptyFreeCells = this.freeCells.filter(p => p.length === 0).length;
        const emptyTableaux = this.tableaux.filter(p => p.length === 0).length;
        return (emptyFreeCells + 1) * Math.pow(2, emptyTableaux);
    }

    private maxMoveableCardsToTableau(pile: Pile): number {
        const emptyFreeCells = this.freeCells.filter(p => p.length === 0).length;
        const emptyTableaux = this.tableaux.filter(p => p.length === 0 && p !== pile).length;
        return (emptyFreeCells + 1) * Math.pow(2, emptyTableaux);
    }

    private isTableauxDrop_(card: Card, pile: Pile) {
        if (card.pile === pile) return false;

        const canDragResult = this.canDrag_(card);
        if (!canDragResult.canDrag) return false;

        if (this.tableaux.indexOf(pile) >= 0) {
            const sequenceLength = card.pile.length - card.pileIndex;
            if (sequenceLength > this.maxMoveableCardsToTableau(pile)) {
                return false;
            }

            const topCard = pile.peek();
            if (topCard) {
                if (this.getCardValue_(topCard) === this.getCardValue_(card) + 1 && topCard.suit === card.suit) {
                    return true;
                }
            } else {
                if (card.rank === Rank.King) {
                    return true;
                }
            }
        }
        return false;
    }

    private isTableauxDropSource_(card: Card) {
        if (this.tableaux.indexOf(card.pile) >= 0 && card.faceUp) {
            for (let i = card.pile.length - 1; i > card.pileIndex; i--) {
                const card0 = card.pile.at(i - 1);
                const card1 = card.pile.at(i);
                if (card0.faceUp && card1.faceUp && card0.suit === card1.suit && this.getCardValue_(card1) === this.getCardValue_(card0) - 1) {
                    // valid sequence pair
                } else {
                    return false;
                }
            }

            const sequenceLength = card.pile.length - card.pileIndex;
            if (sequenceLength > this.maxMoveableCards) {
                return false;
            }
            return true;
        }
        return false;
    }

    private *doTableauxDrop_(card: Card, pile: Pile) {
        const sourcePile = card.pile;
        const index = card.pileIndex;
        while (sourcePile.length > index) {
            const moveCard = sourcePile.at(index);
            pile.push(moveCard);
            yield DelayHint.Quick;
        }
    }

    private isFreeCellDrop_(card: Card, pile: Pile) {
        if (this.freeCells.indexOf(pile) >= 0) {
            if (pile.length === 0 && card.pile.peek() === card) {
                return true;
            }
        }
        return false;
    }

    private isFreeCellDropSource_(card: Card) {
        return this.freeCells.indexOf(card.pile) >= 0 && card.pile.peek() === card;
    }

    private *doFreeCellDrop_(card: Card, pile: Pile) {
        pile.push(card);
        yield DelayHint.Quick;
    }

    private isFoundationDrop_(card: Card, pile: Pile) {
        if (card.pile.peek() !== card) return false;

        if (this.foundations.indexOf(pile) >= 0) {
            const topCard = pile.peek();
            if (topCard) {
                if (topCard.suit === card.suit && this.getCardValue_(topCard) === this.getCardValue_(card) - 1) {
                    return true;
                }
            } else {
                if (card.rank === Rank.Ace) {
                    return true;
                }
            }
        }
        return false;
    }

    private isFoundationDropSource_(card: Card) {
        return this.foundations.indexOf(card.pile) >= 0 && card.pile.peek() === card;
    }

    private *doFoundationDrop_(card: Card, pile: Pile) {
        pile.push(card);
        yield DelayHint.Quick;
    }

    private *doAutoMoves_() {
        let moved = true;
        while (moved) {
            moved = false;
            const topCards: Card[] = [];
            for (const pile of this.freeCells) {
                const c = pile.peek();
                if (c) topCards.push(c);
            }
            for (const pile of this.tableaux) {
                const c = pile.peek();
                if (c) topCards.push(c);
            }

            for (const card of topCards) {
                for (const pile of this.foundations) {
                    if (this.isFoundationDrop_(card, pile)) {
                        yield* this.doFoundationDrop_(card, pile);
                        moved = true;
                        yield DelayHint.OneByOne;
                        break;
                    }
                }
                if (moved) break;
            }
        }
    }
}
