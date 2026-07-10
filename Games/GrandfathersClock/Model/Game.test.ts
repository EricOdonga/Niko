/* eslint-disable */
import { describe, it, expect } from 'vitest';
import { Game } from './Game';
import { GameOptions } from './GameOptions';
import { Rank } from "~CardLib/Model/Rank";
import { Suit } from "~CardLib/Model/Suit";

describe('GrandfathersClock Game', () => {
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

        // Check foundations
        for (let i = 0; i < 12; i++) {
            const card1 = game1.foundations[i].peek();
            const card2 = game2.foundations[i].peek();
            expect(card1?.suit).toBe(card2?.suit);
            expect(card1?.rank).toBe(card2?.rank);
        }
    });

    it('pre-seeds foundations correctly', () => {
        const game = new Game(new GameOptions(new URLSearchParams()));
        const it = game.restart(54321);
        while (!it.next().done) {}

        // Check if all foundations have 1 card each
        for (let i = 0; i < 12; i++) {
            expect(game.foundations[i].length).toBe(1);
        }

        // Verify some specific hours
        // 1 o'clock (foundation 0): 10 of Hearts
        const f0 = game.foundations[0].peek();
        expect(f0?.rank).toBe(Rank.Ten);
        expect(f0?.suit).toBe(Suit.Hearts);

        // 12 o'clock (foundation 11): 9 of Clubs
        const f11 = game.foundations[11].peek();
        expect(f11?.rank).toBe(Rank.Nine);
        expect(f11?.suit).toBe(Suit.Clubs);

        // 4 o'clock (foundation 3): King of Clubs
        const f3 = game.foundations[3].peek();
        expect(f3?.rank).toBe(Rank.King);
        expect(f3?.suit).toBe(Suit.Clubs);
    });

    it('validates tableau dragging/dropping rules', () => {
        const game = new Game(new GameOptions(new URLSearchParams()));
        const it = game.restart(111);
        while (!it.next().done) {}

        // Tableaus should have 5 cards each
        for (let i = 0; i < 8; i++) {
            expect(game.tableaux[i].length).toBe(5);
        }

        const tableau0 = game.tableaux[0];
        const cardTop = tableau0.peek();
        expect(cardTop).toBeDefined();

        if (cardTop) {
            // Top card is drag-eligible
            expect(game.canDrag(cardTop).canDrag).toBe(true);

            // Covered cards (index 0 to 3) are not drag-eligible
            const cardCovered = tableau0.at(3);
            expect(game.canDrag(cardCovered).canDrag).toBe(false);

            // Empty tableaus can accept any card
            const tableau1 = game.tableaux[1];
            // clear tableau1 to test empty drop
            while (tableau1.length > 0) {
                game.stock.push(tableau1.peek()!);
            }
            expect(game.previewDrop(cardTop, tableau1)).toBe(true);
        }
    });

    it('handles winning state correctly', () => {
        const game = new Game(new GameOptions(new URLSearchParams()));
        const it = game.restart(999);
        while (!it.next().done) {}

        expect(game.won).toBe(false);

        // Move all cards to foundations (to represent a won game)
        for (const card of game.cards) {
            game.foundations[0].push(card);
        }

        const dropIt = game.dropCard(game.cards[0], game.foundations[0]);
        while (!dropIt.next().done) {}

        expect(game.won).toBe(true);
    });
});
