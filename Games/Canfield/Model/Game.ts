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

export class Game extends GameBase implements IGame {
    public readonly options: GameOptions;
    public readonly stock = new Pile(this);
    public readonly waste = new Pile(this);
    public readonly reserve = new Pile(this);
    public readonly foundations: Pile[] = [];
    public readonly tableaux: Pile[] = [];
    
    private readonly dragSingleSources_: Pile[] = [];
    private readonly autoMoveSources_: Pile[] = [];
    private baseRank_: Rank = Rank.Ace; // Determined by first dealt card
    private restocks_ = 0;

    constructor(options: GameOptions) {
        super();
        this.options = options;

        this.piles.push(this.stock);
        this.waste.maxFan = 3;
        this.piles.push(this.waste);
        this.piles.push(this.reserve);

        this.dragSingleSources_.push(this.waste);
        this.dragSingleSources_.push(this.reserve);
        
        this.autoMoveSources_.push(this.waste);
        this.autoMoveSources_.push(this.reserve);

        for (let i = 0; i < 4; ++i) {
            const pile = new Pile(this);
            this.foundations.push(pile);
            this.dragSingleSources_.push(pile);
            this.piles.push(pile);
        }

        for (let i = 0; i < 4; ++i) {
            const pile = new Pile(this);
            this.tableaux.push(pile);
            this.dragSingleSources_.push(pile);
            this.autoMoveSources_.push(pile);
            this.piles.push(pile);
        }

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
        this.restocks_ = 0;

        for (let pileIndex = this.piles.length; pileIndex-- > 0; ) {
            const pile = this.piles[pileIndex] ?? Debug.error();
            for (let cardIndex = pile.length; cardIndex-- > 0; ) {
                const card = pile.at(cardIndex);
                card.faceUp = false;
                if (pile !== this.stock) {
                    this.stock.push(card);
                }
            }
        }

        this.stock.sort();
        this.stock.shuffle(rng);

        yield DelayHint.Settle;

        // Deal 13 to reserve, top face up
        for (let i = 0; i < 13; ++i) {
            const card = this.stock.peek();
            if (card) {
                if (i === 12) card.faceUp = true;
                this.reserve.push(card);
                yield DelayHint.Quick;
            }
        }

        // Deal 1 to foundation (sets base rank)
        const firstFoundationCard = this.stock.peek();
        if (firstFoundationCard) {
            firstFoundationCard.faceUp = true;
            this.baseRank_ = firstFoundationCard.rank;
            this.foundations[0].push(firstFoundationCard);
            yield DelayHint.Quick;
        }

        // Deal 1 face up to each tableau
        for (let i = 0; i < 4; ++i) {
            const card = this.stock.peek();
            if (card) {
                card.faceUp = true;
                this.tableaux[i].push(card);
                yield DelayHint.Quick;
            }
        }

        yield DelayHint.OneByOne;
        yield* this.doAutoMoves_();
    }

    private canDrawFromStock_() {
        return this.stock.length > 0 || (this.options.restockLimit < 0 || this.restocks_ < this.options.restockLimit);
    }

    private *doDrawFromStock_() {
        if (this.stock.length === 0) {
            // Restock from waste
            while (this.waste.length > 0) {
                const card = this.waste.peek();
                if (card) {
                    card.faceUp = false;
                    this.stock.push(card);
                }
            }
            this.restocks_++;
            yield DelayHint.Settle;
        }

        // Draw up to drawCount
        const drawCount = Math.min(this.stock.length, this.options.drawCount);
        for (let i = 0; i < drawCount; ++i) {
            const card = this.stock.peek();
            if (card) {
                card.faceUp = true;
                this.waste.push(card);
                yield DelayHint.Quick;
            }
        }
        yield DelayHint.OneByOne;
    }

    protected *cardPrimary_(card: Card) {
        if (this.stock.peek() === card && this.canDrawFromStock_()) {
            yield* this.doDrawFromStock_();
            yield* this.doAutoMoves_();
            return;
        }
    }

    protected *cardSecondary_(card: Card) {
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

    protected *pilePrimary_(pile: Pile) {
        if (pile === this.stock && this.canDrawFromStock_()) {
            yield* this.doDrawFromStock_();
            yield* this.doAutoMoves_();
        }
    }

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

    private getNextRankDown_(rank: Rank): Rank {
        return rank === Rank.Ace ? Rank.King : rank - 1;
    }

    private getNextRankUp_(rank: Rank): Rank {
        return rank === Rank.King ? Rank.Ace : rank + 1;
    }

    private isTableauxDrop_(card: Card, pile: Pile) {
        if (card.pile === pile) return false;
        if (!this.isTableauxDropSource_(card)) return false;

        if (this.tableaux.indexOf(pile) >= 0) {
            const topCard = pile.peek();
            if (topCard) {
                if (topCard.colour !== card.colour && this.getNextRankDown_(topCard.rank) === card.rank) {
                    return true;
                }
            } else {
                // Tableaus can be filled from anywhere?
                // Actually, Canfield rules: "Empty tableau slots must be filled immediately by the top card of the Reserve pile."
                // Wait, if reserve is empty, can they be filled by ANY card? Yes, usually.
                // But the prompt says "Empty tableau slots must be filled immediately by the top card of the Reserve pile."
                // I will auto-fill from Reserve, but if a player manually drags something to an empty slot, is it allowed?
                // Usually yes, if reserve is empty.
                if (this.reserve.length > 0) {
                    // Only reserve card can fill it if reserve is not empty, and it should be auto-filled, but manual drop from reserve is also fine
                    if (card.pile === this.reserve) return true;
                    return false;
                }
                return true;
            }
        }
        return false;
    }

    private isTableauxDropSource_(card: Card) {
        if (this.dragSingleSources_.indexOf(card.pile) >= 0 && card.pile.peek() === card && card.faceUp) {
            return true;
        } else if (this.tableaux.indexOf(card.pile) >= 0 && card.faceUp) {
            return true; // You can drag whole groups from tableaus
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
                if (topCard.suit === card.suit && this.getNextRankUp_(topCard.rank) === card.rank) {
                    return true;
                }
            } else {
                if (card.rank === this.baseRank_) {
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
        if (this.tableaux.indexOf(card.pile) >= 0 && card.pile.peek() === card && card.faceUp) {
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

            // Auto-fill empty tableaus from reserve
            for (const pile of this.tableaux) {
                if (pile.length === 0 && this.reserve.length > 0) {
                    const reserveCard = this.reserve.peek();
                    if (reserveCard) {
                        pile.push(reserveCard);
                        changed = true;
                        yield DelayHint.OneByOne;
                    }
                }
            }

            // Auto reveal top of reserve if needed
            const topReserve = this.reserve.peek();
            if (topReserve && !topReserve.faceUp) {
                topReserve.faceUp = true;
                changed = true;
                yield DelayHint.OneByOne;
            }

            // Auto move to foundation
            for (const source of [...this.autoMoveSources_, ...this.tableaux]) {
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
        // Canfield is tricky. Usually we auto-play only baseRank + 1 or similar if all foundations have baseRank.
        // Let's use a simpler safe check: if all foundations have cards up to rank - 1 of same/opposite color, etc.
        // Actually, just let the user double click for auto moves, and do very safe auto moves (like base rank).
        if (card.rank === this.baseRank_) return true;
        
        // Find minimum rank in foundation relative to base rank
        const getRelativeRank = (r: Rank) => (r >= this.baseRank_ ? r - this.baseRank_ : r + 13 - this.baseRank_);
        
        let minRelRank = 14;
        for (const foundation of this.foundations) {
            const topCard = foundation.peek();
            if (topCard) {
                minRelRank = Math.min(minRelRank, getRelativeRank(topCard.rank));
            } else {
                minRelRank = -1; // Empty foundation
            }
        }

        const cardRelRank = getRelativeRank(card.rank);
        // It's safe if it's within 1 rank of the lowest foundation (since colors alternate in tableaus)
        return cardRelRank <= minRelRank + 1;
    }
}
