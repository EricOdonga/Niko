/* eslint-disable */
import { describe, it, expect } from 'vitest';
import { CardFlipOperation } from './CardFlipOperation';
import { PileInsertOperation } from './PileInsertOperation';
import { PileMaxFanOperation } from './PileMaxFanOperation';
import { CompoundUndoableOperation } from './CompoundUndoableOperation';
import { Card } from '../Card';
import { Pile } from '../Pile';
import { Rank } from '../Rank';
import { Suit } from '../Suit';
import { Colour } from '../Colour';
import { GameBase } from '../GameBase';
import { DelayHint } from '../DelayHint';
import { ICard } from '../ICard';

// Mock GameBase for testing
class MockGame extends GameBase {
    protected restart_(): Generator<DelayHint, void> { return function*() {}(); }
    protected cardPrimary_(): Generator<DelayHint, void> { return function*() {}(); }
    protected cardSecondary_(): Generator<DelayHint, void> { return function*() {}(); }
    protected pilePrimary_(): Generator<DelayHint, void> { return function*() {}(); }
    protected pileSecondary_(): Generator<DelayHint, void> { return function*() {}(); }
    protected canDrag_(): { canDrag: boolean; extraCards: Card[] } { return { canDrag: false, extraCards: [] }; }
    protected previewDrop_(): boolean { return false; }
    protected dropCard_(): Generator<DelayHint, void> { return function*() {}(); }
    public wonCards: ICard[] = [];
    protected doGetWon_() { return false; }
}

describe('Undoable Operations', () => {
    const game = new MockGame();
    const pile1 = new Pile(game);
    const pile2 = new Pile(game);
    const card = pile1.createCard(Suit.Spades, Colour.Black, Rank.Ace);

    it('CardFlipOperation undoes and redoes face up state', () => {
        // Assume card is initially face down
        card.doSetFaceUp(false);
        const op = new CardFlipOperation(card, false, true);

        op.redo();
        expect(card.faceUp).toBe(true);

        op.undo();
        expect(card.faceUp).toBe(false);
    });

    it('PileInsertOperation undoes and redoes card location', () => {
        const op = new PileInsertOperation(card, pile1, 0, pile2, 0);

        // Current state is pile1 has it, let's redo so pile2 gets it
        op.redo();
        expect(pile2.at(0)).toBe(card);
        expect(pile1.length).toBe(0);

        // Now undo so pile1 gets it back
        op.undo();
        expect(pile1.at(0)).toBe(card);
        expect(pile2.length).toBe(0);
    });

    it('PileMaxFanOperation undoes and redoes maxFan state', () => {
        pile1.maxFan = 1;
        const op = new PileMaxFanOperation(pile1, 1, 5);

        op.redo();
        expect(pile1.maxFan).toBe(5);

        op.undo();
        expect(pile1.maxFan).toBe(1);
    });

    it('CompoundUndoableOperation applies multiple operations', () => {
        card.doSetFaceUp(false);
        pile1.maxFan = 1;

        const op1 = new CardFlipOperation(card, false, true);
        const op2 = new PileMaxFanOperation(pile1, 1, 5);
        const compound = new CompoundUndoableOperation();
        compound.addOperation(op1);
        compound.addOperation(op2);

        compound.redo();
        expect(card.faceUp).toBe(true);
        expect(pile1.maxFan).toBe(5);

        compound.undo();
        expect(card.faceUp).toBe(false);
        expect(pile1.maxFan).toBe(1);
    });
});
