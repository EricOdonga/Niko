/* eslint-disable */
import { describe, it, expect } from 'vitest';
import { Game } from './Game';
import { GameOptions } from './GameOptions';

describe('Pyramid Game', () => {
    it('produces a deterministic deal for a given seed', () => {
        const game1 = new Game(new GameOptions(new URLSearchParams()));
        const it1 = game1.restart(12345);
        while (!it1.next().done) {}

        const game2 = new Game(new GameOptions(new URLSearchParams()));
        const it2 = game2.restart(12345);
        while (!it2.next().done) {}

        expect(game1.cards.length).toBe(52);
        for (let i = 0; i < 52; i++) {
            expect(game1.cards[i].suit).toBe(game2.cards[i].suit);
            expect(game1.cards[i].rank).toBe(game2.cards[i].rank);
        }

        // Check if pyramid structure is the same
        for (let y = 0; y < game1.pyramid.length; y++) {
            for (let x = 0; x <= y; x++) {
                const card1 = game1.pyramid[y][x].peek();
                const card2 = game2.pyramid[y][x].peek();
                expect(card1?.suit).toBe(card2?.suit);
                expect(card1?.rank).toBe(card2?.rank);
            }
        }
    });

    it('rejects illegal moves', () => {
        const game = new Game(new GameOptions(new URLSearchParams()));
        const it = game.restart(12345);
        while (!it.next().done) {}

        // In pyramid, the bottom row is y=6
        const bottomRow = game.pyramid[6];
        const card1 = bottomRow[0].peek();
        const card2 = bottomRow[1].peek();

        expect(card1).toBeDefined();
        if (card1) {
            // Uncovered cards can be dragged
            expect(game.canDrag(card1).canDrag).toBe(true);

            // A covered card from the row above cannot be dragged
            const coveredCard = game.pyramid[5][0].peek();
            if (coveredCard) {
                expect(game.canDrag(coveredCard).canDrag).toBe(false);
            }
            
            // Should reject a drop if they don't sum to 13
            // Assuming card1 and card2 don't sum to 13, but if they do, previewDrop will be true.
            // Let's test a self-drop or dropping on something that definitely doesn't sum.
            expect(game.previewDrop(card1, bottomRow[0])).toBe(false);
        }
    });

    it('handles winning state correctly', () => {
        const game = new Game(new GameOptions(new URLSearchParams()));
        const it = game.restart(12345);
        while (!it.next().done) {}

        expect(game.won).toBe(false);

        // Clear the pyramid manually to trigger win
        for (let y = 0; y < game.pyramid.length; y++) {
            for (let x = 0; x <= y; x++) {
                const pile = game.pyramid[y][x];
                while (pile.length > 0) {
                    const card = pile.peek();
                    if (card) {
                        game.foundation.push(card);
                    }
                }
            }
        }

        // Trigger a move that checks win condition, cardPrimary on an empty pile might not check
        // Or just trigger a cardPrimary on stock
        const stockCard = game.stock.peek();
        if (stockCard) {
            const stockIt = game.cardPrimary(stockCard);
            while (!stockIt.next().done) {}
        }

        expect(game.won).toBe(true);
    });
});
