/* eslint-disable */
import { describe, it, expect } from 'vitest';
import { Game } from './Game';
import { GameOptions } from './GameOptions';
import { Rank } from '~CardLib/Model/Rank';
import { Suit } from '~CardLib/Model/Suit';

describe('SeahavenTowers Game', () => {
    it('produces a deterministic deal and setup for a given seed', () => {
        const game1 = new Game(new GameOptions(new URLSearchParams()));
        const it1 = game1.restart(12345);
        while (!it1.next().done) {}

        const game2 = new Game(new GameOptions(new URLSearchParams()));
        const it2 = game2.restart(12345);
        while (!it2.next().done) {}

        // Check if both games have the exact same deck order
        expect(game1.cards.length).toBe(52);
        for (let i = 0; i < 52; i++) {
            expect(game1.cards[i].suit).toBe(game2.cards[i].suit);
            expect(game1.cards[i].rank).toBe(game2.cards[i].rank);
        }

        // Each of the 10 tableaus has exactly 5 cards face up
        for (let i = 0; i < 10; i++) {
            expect(game1.tableaux[i].length).toBe(5);
            for (const card of game1.tableaux[i]) {
                expect(card.faceUp).toBe(true);
            }
        }

        // Freecells 0 and 1 have exactly 1 card face up, freecells 2 and 3 are empty
        expect(game1.freeCells[0].length).toBe(1);
        expect(game1.freeCells[0].peek()?.faceUp).toBe(true);
        expect(game1.freeCells[1].length).toBe(1);
        expect(game1.freeCells[1].peek()?.faceUp).toBe(true);
        expect(game1.freeCells[2].length).toBe(0);
        expect(game1.freeCells[3].length).toBe(0);
    });

    it('validates same-suit build down rules and King-only empty columns', () => {
        const game = new Game(new GameOptions(new URLSearchParams()));
        const it = game.restart(12345);
        while (!it.next().done) {}

        // Clear one tableau entirely to test empty columns (we'll manually remove cards)
        const emptyTableau = game.tableaux[0];
        const cardsToRemove = [...emptyTableau];
        for (const card of cardsToRemove) {
            // Put them into foundation or just move them away
            game.foundations[0].push(card);
        }
        expect(emptyTableau.length).toBe(0);

        // Find a King and a non-King to try dropping on the empty tableau
        let kingCard = game.cards.find(c => c.rank === Rank.King && c.pile !== game.foundations[0]);
        let nonKingCard = game.cards.find(c => c.rank !== Rank.King && c.pile !== game.foundations[0]);

        expect(kingCard).toBeDefined();
        expect(nonKingCard).toBeDefined();

        if (kingCard && nonKingCard) {
            // Non-king should be rejected on empty column
            expect(game.previewDrop(nonKingCard, emptyTableau)).toBe(false);

            // King should be accepted on empty column (as long as it can be dragged)
            // Let's place the King at the top of its pile first so it can be dragged
            const originalPile = kingCard.pile;
            originalPile.push(kingCard);
            expect(game.previewDrop(kingCard, emptyTableau)).toBe(true);
        }
    });

    it('calculates moveable sequence length based on empty free cells', () => {
        const game = new Game(new GameOptions(new URLSearchParams()));
        const it = game.restart(12345);
        while (!it.next().done) {}

        // Empty free cells: we have freeCells[2] and freeCells[3] empty (so 2 empty free cells).
        // Max moveable sequence length should be 2 + 1 = 3.
        const emptyCellsCount = game.freeCells.filter(p => p.length === 0).length;
        expect(emptyCellsCount).toBe(2);

        // Let's manually construct a same-suit sequence of length 3 on tableau[1]
        const tab = game.tableaux[1];
        // Clear tableau[1] first
        const tabCards = [...tab];
        for (const card of tabCards) {
            game.foundations[0].push(card);
        }
        expect(tab.length).toBe(0);

        // Create 3 spades cards: King, Queen, Jack of spades
        const kSpades = game.cards.find(c => c.suit === Suit.Spades && c.rank === Rank.King)!;
        const qSpades = game.cards.find(c => c.suit === Suit.Spades && c.rank === Rank.Queen)!;
        const jSpades = game.cards.find(c => c.suit === Suit.Spades && c.rank === Rank.Jack)!;

        // Push them in order
        tab.push(kSpades);
        tab.push(qSpades);
        tab.push(jSpades);

        // Since they form a same-suit sequence of length 3 and we have 2 empty free cells,
        // we should be able to drag kSpades (which will move kSpades, qSpades, jSpades)
        const canDragResult = game.canDrag(kSpades);
        expect(canDragResult.canDrag).toBe(true);
        expect(canDragResult.extraCards.length).toBe(2);

        // Now, let's fill one more free cell to reduce max moveable to 2
        const dummyCard = game.cards.find(c => c !== kSpades && c !== qSpades && c !== jSpades && game.tableaux.includes(c.pile as any))!;
        const currentEmptyCount = game.freeCells.filter(p => p.length === 0).length;
        game.freeCells[game.freeCells.findIndex(p => p.length === 0)].push(dummyCard);

        const newEmptyCount = game.freeCells.filter(p => p.length === 0).length;
        expect(newEmptyCount).toBe(currentEmptyCount - 1);

        // Since the sequence length is 3, if the max moveable cards (which is newEmptyCount + 1)
        // is less than 3, canDrag(kSpades) should be rejected!
        const expectedCanDrag = (newEmptyCount + 1) >= 3;
        expect(game.canDrag(kSpades).canDrag).toBe(expectedCanDrag);
    });

    it('handles winning state correctly', () => {
        const game = new Game(new GameOptions(new URLSearchParams()));
        const it = game.restart(12345);
        while (!it.next().done) {}

        expect(game.won).toBe(false);

        // Manually move all cards to foundation to trigger win
        for (const card of game.cards) {
            // Find appropriate foundation pile for card suit
            const fIndex = card.suit - 1; // 1 to 4 mapped to 0 to 3
            game.foundations[fIndex].push(card);
        }

        // dropCard on foundations[0] to trigger won validation
        const dropIt = game.dropCard(game.cards[0], game.foundations[0]);
        while (!dropIt.next().done) {}

        expect(game.won).toBe(true);
    });
});
