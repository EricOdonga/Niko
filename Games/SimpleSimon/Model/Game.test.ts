/* eslint-disable */
import { describe, it, expect } from 'vitest';
import { Game } from './Game';
import { GameOptions } from './GameOptions';
import { Rank } from "~CardLib/Model/Rank";
import { Suit } from "~CardLib/Model/Suit";
import { Colour } from "~CardLib/Model/Colour";
import { Pile } from "~CardLib/Model/Pile";

describe('SimpleSimon Game', () => {
    it('produces a deterministic deal for a given seed and correct step pattern', () => {
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

        // Check step pattern counts: 8, 8, 8, 7, 6, 5, 4, 3, 2, 1
        const expectedCounts = [8, 8, 8, 7, 6, 5, 4, 3, 2, 1];
        for (let i = 0; i < 10; i++) {
            expect(game1.tableaux[i].length).toBe(expectedCounts[i]);
            // Every dealt card must be faceUp
            for (const card of game1.tableaux[i]) {
                expect(card.faceUp).toBe(true);
            }
        }
    });

    it('handles dragging rules correctly', () => {
        const game = new Game(new GameOptions(new URLSearchParams()));
        const it = game.restart(12345);
        while (!it.next().done) {}

        const tableau0 = game.tableaux[0];

        // Top card of tableau should always be draggable
        const topCard = tableau0.peek();
        expect(topCard).toBeDefined();
        if (topCard) {
            expect(game.canDrag(topCard).canDrag).toBe(true);
        }

        // Manually assemble a mixed-suit sequence and a same-suit sequence to test drag rules
        // Clear tableau0 and tableau1 first:
        const tempPile = new Pile(game);
        while (game.tableaux[0].length > 0) {
            tempPile.push(game.tableaux[0].peek()!);
        }
        while (game.tableaux[1].length > 0) {
            tempPile.push(game.tableaux[1].peek()!);
        }

        // Same suit descending run
        const spadeK = game.cards.find(c => c.suit === Suit.Spades && c.rank === Rank.King)!;
        const spadeQ = game.cards.find(c => c.suit === Suit.Spades && c.rank === Rank.Queen)!;
        const spadeJ = game.cards.find(c => c.suit === Suit.Spades && c.rank === Rank.Jack)!;

        // Push them to tableau0
        tableau0.push(spadeK);
        tableau0.push(spadeQ);
        tableau0.push(spadeJ);

        // Can drag spadeK (all 3 cards)
        const dragK = game.canDrag(spadeK);
        expect(dragK.canDrag).toBe(true);
        expect(dragK.extraCards.length).toBe(2);
        expect(dragK.extraCards[0]).toBe(spadeQ);
        expect(dragK.extraCards[1]).toBe(spadeJ);

        // Mixed-suit descending run
        const heartQ = game.cards.find(c => c.suit === Suit.Hearts && c.rank === Rank.Queen)!;
        // Push heartQ instead of spadeQ
        tempPile.push(tableau0.peek()!); // remove spadeJ
        tempPile.push(tableau0.peek()!); // remove spadeQ
        tableau0.push(heartQ);
        tableau0.push(spadeJ);

        // tableau0 now has: Spade K, Heart Q, Spade J
        // Descending but mixed-suit. Dragging Spade K should fail.
        const dragK_mixed = game.canDrag(spadeK);
        expect(dragK_mixed.canDrag).toBe(false);

        // But dragging Spade J (the top card) should still be true
        expect(game.canDrag(spadeJ).canDrag).toBe(true);
    });

    it('enforces building and empty column rules', () => {
        const game = new Game(new GameOptions(new URLSearchParams()));
        const it = game.restart(12345);
        while (!it.next().done) {}

        const tableau0 = game.tableaux[0];
        const tableau1 = game.tableaux[1];

        // Clear them
        const tempPile = new Pile(game);
        while (tableau0.length > 0) tempPile.push(tableau0.peek()!);
        while (tableau1.length > 0) tempPile.push(tableau1.peek()!);

        const spadeK = game.cards.find(c => c.suit === Suit.Spades && c.rank === Rank.King)!;
        const heartQ = game.cards.find(c => c.suit === Suit.Hearts && c.rank === Rank.Queen)!;
        const diamondJ = game.cards.find(c => c.suit === Suit.Diamonds && c.rank === Rank.Jack)!;
        const clubTen = game.cards.find(c => c.suit === Suit.Clubs && c.rank === Rank.Ten)!;

        // Any card can go to an empty column
        expect(game.previewDrop(heartQ, tableau0)).toBe(true);

        tableau0.push(spadeK);

        // Heart Q can drop on Spade K (descending rank, diff suit)
        expect(game.previewDrop(heartQ, tableau0)).toBe(true);

        // Club Ten CANNOT drop on Spade K (not rank - 1)
        expect(game.previewDrop(clubTen, tableau0)).toBe(false);
    });

    it('handles completed run auto-movement and win detection', () => {
        const game = new Game(new GameOptions(new URLSearchParams()));
        const it = game.restart(12345);
        while (!it.next().done) {}

        // Clear all tableaux and foundations
        const tempPile = new Pile(game);
        for (const t of game.tableaux) {
            while (t.length > 0) tempPile.push(t.peek()!);
        }
        for (const f of game.foundations) {
            while (f.length > 0) tempPile.push(f.peek()!);
        }

        // Build a complete run of Spades in tableau0
        const ranks = [
            Rank.King, Rank.Queen, Rank.Jack, Rank.Ten, Rank.Nine,
            Rank.Eight, Rank.Seven, Rank.Six, Rank.Five, Rank.Four,
            Rank.Three, Rank.Two, Rank.Ace
        ];

        for (const r of ranks) {
            const card = game.cards.find(c => c.suit === Suit.Spades && c.rank === r)!;
            game.tableaux[0].push(card);
        }

        expect(game.tableaux[0].length).toBe(13);

        // Find a card of another suit to drop to trigger the dropCard generator and auto moves
        const heartK = game.cards.find(c => c.suit === Suit.Hearts && c.rank === Rank.King)!;
        const dropIt = game.dropCard(heartK, game.tableaux[1]);
        while (!dropIt.next().done) {}

        // Simple Simon automatic run clearance should have moved the Spades run to a foundation
        expect(game.tableaux[0].length).toBe(0);
        expect(game.foundations[0].length).toBe(13);

        // If we move the remaining 3 suits to foundations, the game is won
        const remainingSuits = [Suit.Hearts, Suit.Diamonds, Suit.Clubs];
        for (let sIdx = 0; sIdx < remainingSuits.length; sIdx++) {
            const suit = remainingSuits[sIdx];
            for (const r of ranks) {
                const card = game.cards.find(c => c.suit === suit && c.rank === r)!;
                game.foundations[sIdx + 1].push(card);
            }
        }

        // Call doGetWon_ through normal win check or dropCard on its own pile to keep foundations intact
        const finalDrop = game.dropCard(game.cards[0], game.cards[0].pile);
        while (!finalDrop.next().done) {}

        expect(game.won).toBe(true);
    });
});
