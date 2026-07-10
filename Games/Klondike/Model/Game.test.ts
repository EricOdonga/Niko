/* eslint-disable */
import { describe, it, expect } from 'vitest';
import { Game } from './Game';
import { GameOptions } from './GameOptions';

describe('Klondike Game', () => {
    it('produces a deterministic deal for a given seed', () => {
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

        // Check if tableaux top cards are the same
        for (let i = 0; i < game1.tableaux.length; i++) {
            const card1 = game1.tableaux[i].peek();
            const card2 = game2.tableaux[i].peek();
            expect(card1?.suit).toBe(card2?.suit);
            expect(card1?.rank).toBe(card2?.rank);
        }
    });

    it('rejects illegal moves', () => {
        const game = new Game(new GameOptions(new URLSearchParams()));
        const it = game.restart(12345);
        while (!it.next().done) {}

        const tableau0 = game.tableaux[0];
        const tableau1 = game.tableaux[1];

        // Ensure we try to drag a face up card
        const card0 = tableau0.peek();
        expect(card0).toBeDefined();

        if (card0) {
            // Cannot drag a face down card
            const faceDownCard = tableau1.at(0);
            expect(game.canDrag(faceDownCard).canDrag).toBe(false);

            // Cannot drop onto a random tableau if not alternating colors and descending rank
            // For a specific seed, we'd need to know the cards, but we can just test the rule.
            // Let's find a card from stock/waste and try dropping it on tableau0
            const stockIt = game.cardPrimary(game.stock.peek()!);
            while (!stockIt.next().done) {}
            
            const wasteCard = game.waste.peek();
            if (wasteCard) {
                // If it's not exactly (topCard.value - 1) and opposite color, it will fail
                // To be safe, let's just assert previewDrop logic for some arbitrary drop that we know is invalid (e.g. dropping a card onto itself or its own pile)
                expect(game.previewDrop(wasteCard, game.waste)).toBe(false);
            }
        }
    });

    it('handles winning state correctly', () => {
        const game = new Game(new GameOptions(new URLSearchParams()));
        const it = game.restart(12345);
        while (!it.next().done) {}

        expect(game.won).toBe(false);

        // Manually move all cards to foundation to trigger win
        for (const card of game.cards) {
            // push to foundation (automatically removes from old pile)
            game.foundations[0].push(card);
        }

        // checkWon is private, so we trigger a pile interaction or call dropCard to trigger it
        // Or we can just call an empty dropCard on a foundation
        const dropIt = game.dropCard(game.cards[0], game.foundations[0]);
        while (!dropIt.next().done) {}

        // Since checkWon requires won logic (sum of foundations = 52), it should be true now
        // But dropCard only checks if it was a valid drop... wait, GameBase.dropCard triggers checkWon()
        expect(game.won).toBe(true);
    });
});
