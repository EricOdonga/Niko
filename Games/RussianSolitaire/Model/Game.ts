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

const TABLEAUX_COUNT = 7;

export class Game extends GameBase implements IGame {
    public readonly options: GameOptions;
    public readonly foundations: Pile[] = [];
    public readonly tableaux: Pile[] = [];
    private readonly dragSingleSources_: Pile[] = [];
    private readonly autoMoveSources_: Pile[] = [];

    constructor(options: GameOptions) {
        super();

        this.options = options;

        // Tableau Piles: Stacks 0 to 6
        for (let i = 0; i < TABLEAUX_COUNT; ++i) {
            const pile = new Pile(this);
            this.tableaux.push(pile);
            this.dragSingleSources_.push(pile);
            this.autoMoveSources_.push(pile);
            this.piles.push(pile);
        }

        // Foundation Piles: Stacks 7 to 10
        for (let i = 0; i < 4; ++i) {
            const pile = new Pile(this);
            this.foundations.push(pile);
            this.dragSingleSources_.push(pile);
            this.piles.push(pile);
        }

        // We use a temporary pile to hold the deck before dealing it out
        const tempStock = new Pile(this);
        this.cards = DeckUtils.createStandard52Deck(tempStock);
    }

    protected doGetWon_() {
        // won when all cards are in the foundation:
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
        // gather all cards into a temporary stock for shuffling
        const tempStock = new Pile(this);
        for (const card of this.cards) {
            card.faceUp = false;
            tempStock.push(card);
        }

        tempStock.sort();
        tempStock.shuffle(rng);

        yield DelayHint.Settle;

        // Deal cards according to Yukon rules
        // Column i has i cards face down, then 5 cards face up. (Wait, except column 0 which has 0 face down and 1 face up)
        for (let i = 0; i < this.tableaux.length; ++i) {
            const pile = this.tableaux[i] ?? Debug.error();
            // face down cards: 0 for col 0, 1 for col 1, 2 for col 2...
            for (let j = 0; j < i; ++j) {
                const card = tempStock.peek();
                if (card) {
                    pile.push(card);
                    yield DelayHint.Quick;
                }
            }
            // face up cards: 1 for col 0, 5 for the rest
            const faceUpCount = i === 0 ? 1 : 5;
            for (let j = 0; j < faceUpCount; ++j) {
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

    protected *cardPrimary_(card: Card) {
        // if the player clicks the top card on the tableaux, reveal it:
        if (this.tableaux.indexOf(card.pile) >= 0) {
            if (card.pile.peek() === card && !card.faceUp) {
                card.faceUp = true;
                yield DelayHint.OneByOne;
                yield* this.doAutoMoves_();
                return;
            }
        }
    }

    protected *cardSecondary_(card: Card) {
        // if the player double clicks a card, see if it can be auto-moved to the foundation:
        if (this.autoMoveSources_.indexOf(card.pile) >= 0) {
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

    protected *pilePrimary_(pile: Pile) {}

    protected *pileSecondary_(pile: Pile) {}

    protected canDrag_(card: Card): { canDrag: boolean; extraCards: Card[] } {
        if (this.isFoundationDropSource_(card)) {
            return { canDrag: true, extraCards: [] };
        } else if (this.isTableauxDropSource_(card)) {
            return { canDrag: true, extraCards: card.pile.slice(card.pileIndex + 1) };
        }
        return { canDrag: false, extraCards: [] };
    }

    protected previewDrop_(card: Card, pile: Pile): boolean {
        return this.isTableauxDrop_(card, pile) || this.isFoundationDrop_(card, pile);
    }

    protected *dropCard_(card: Card, pile: Pile) {
        if (this.isTableauxDrop_(card, pile)) {
            yield* this.doTableauxDrop_(card, pile);
            yield* this.doAutoMoves_();
        } else if (this.isFoundationDrop_(card, pile)) {
            yield* this.doFoundationDrop_(card, pile);
            yield* this.doAutoMoves_();
        }
    }

    private isTableauxDrop_(card: Card, pile: Pile) {
        if (card.pile === pile) return false;
        if (!this.isTableauxDropSource_(card)) return false;

        if (this.tableaux.indexOf(pile) >= 0) {
            const topCard = pile.peek();

            if (topCard) {
                // Tableaux build down in the SAME SUIT
                if (topCard.rank === card.rank + 1 && topCard.suit === card.suit) {
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
        if (this.dragSingleSources_.indexOf(card.pile) >= 0 && card.pile.peek() === card && card.faceUp) {
            return true;
        } else if (this.tableaux.indexOf(card.pile) >= 0 && card.faceUp) {
            // Group Movement Rule: Any group of face-up cards can be moved as a unit, regardless of sequence
            return true;
        }
        return false;
    }

    private *doTableauxDrop_(card: Card, pile: Pile) {
        const movingCards = card.pile.slice(card.pileIndex);
        for (const movingCard of movingCards) {
            pile.push(movingCard);
        }
        yield DelayHint.OneByOne;
    }

    private isFoundationDrop_(card: Card, pile: Pile) {
        if (card.pile === pile) return false;
        if (!this.isFoundationDropSource_(card)) return false;

        if (this.foundations.indexOf(pile) >= 0) {
            const topCard = pile.peek();

            if (topCard) {
                if (topCard.rank + 1 === card.rank && topCard.suit === card.suit) {
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
        if (this.autoMoveSources_.indexOf(card.pile) >= 0 && card.pile.peek() === card && card.faceUp) {
            return true;
        }
        return false;
    }

    private *doFoundationDrop_(card: Card, pile: Pile) {
        pile.push(card);
        yield DelayHint.OneByOne;
    }

    private *doAutoMoves_() {
        let changed = false;
        do {
            changed = false;

            if (this.options.autoReveal) {
                for (const pile of this.tableaux) {
                    const topCard = pile.peek();
                    if (topCard && !topCard.faceUp) {
                        topCard.faceUp = true;
                        changed = true;
                        yield DelayHint.OneByOne;
                    }
                }
            }

            for (const source of this.autoMoveSources_) {
                const card = source.peek();
                if (card && card.faceUp) {
                    for (const foundation of this.foundations) {
                        if (this.isFoundationDrop_(card, foundation) && this.isSafeToAutoMoveToFoundation_(card)) {
                            foundation.push(card);
                            changed = true;
                            yield DelayHint.OneByOne;
                            break;
                        }
                    }
                }
            }
        } while (changed);
    }

    private isSafeToAutoMoveToFoundation_(card: Card) {
        // Because tableaus build down in the same suit, every card moved to foundations is 100% safe
        return true;
    }
}
