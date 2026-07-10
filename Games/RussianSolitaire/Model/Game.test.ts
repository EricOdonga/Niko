/* eslint-disable */
import { describe, it, expect } from 'vitest';
import { Game } from './Game';
import { GameOptions } from './GameOptions';
import { Suit } from '~CardLib/Model/Suit';
import { Rank } from '~CardLib/Model/Rank';

describe('RussianSolitaire Game', () => {
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

    it('enforces build-down-by-same-suit rules in tableaux', () => {
        const game = new Game(new GameOptions(new URLSearchParams()));
        const it = game.restart(12345);
        while (!it.next().done) {}

        const tableau0 = game.tableaux[0];
        const tableau1 = game.tableaux[1];

        // Clear all cards out of tableau0 and tableau1 to have a predictable test
        for (const card of [...tableau0]) {
            game.foundations[0].push(card);
        }
        for (const card of [...tableau1]) {
            game.foundations[0].push(card);
        }

        expect(tableau0.length).toBe(0);
        expect(tableau1.length).toBe(0);

        const card8Spades = game.cards.find(c => c.suit === Suit.Spades && c.rank === Rank.Eight)!;
        const card7Spades = game.cards.find(c => c.suit === Suit.Spades && c.rank === Rank.Seven)!;
        const card7Hearts = game.cards.find(c => c.suit === Suit.Hearts && c.rank === Rank.Seven)!;
        const cardKing = game.cards.find(c => c.rank === Rank.King)!;

        // Turn them face up
        card8Spades.faceUp = true;
        card7Spades.faceUp = true;
        card7Hearts.faceUp = true;
        cardKing.faceUp = true;

        // Place 8 of Spades in tableau0
        tableau0.push(card8Spades);

        // Put card7Spades in tableau1 so it has a valid source pile
        tableau1.push(card7Spades);

        // Can we drop 7 of Spades on 8 of Spades? (Same suit, build down: YES)
        expect(game.previewDrop(card7Spades, tableau0)).toBe(true);

        // Put card7Hearts in tableau1 so it has a valid source pile
        tableau1.push(card7Hearts);

        // Can we drop 7 of Hearts on 8 of Spades? (Different suit: NO)
        expect(game.previewDrop(card7Hearts, tableau0)).toBe(false);

        // Clean tableau1
        game.foundations[0].push(card7Spades);
        game.foundations[0].push(card7Hearts);

        // Can we drop a King on empty tableau1? (YES)
        tableau0.push(cardKing);
        expect(game.previewDrop(cardKing, tableau1)).toBe(true);

        // Can we drop 7 of Spades on empty tableau1? (Only Kings allowed on empty slots: NO)
        tableau0.push(card7Spades);
        expect(game.previewDrop(card7Spades, tableau1)).toBe(false);
    });

    it('allows moving groups of cards regardless of their internal sequence', () => {
        const game = new Game(new GameOptions(new URLSearchParams()));
        const it = game.restart(12345);
        while (!it.next().done) {}

        const tableau0 = game.tableaux[0];
        const tableau1 = game.tableaux[1];

        // Clear both
        for (const card of [...tableau0]) {
            game.foundations[0].push(card);
        }
        for (const card of [...tableau1]) {
            game.foundations[0].push(card);
        }

        const card8Spades = game.cards.find(c => c.suit === Suit.Spades && c.rank === Rank.Eight)!;
        const card7Spades = game.cards.find(c => c.suit === Suit.Spades && c.rank === Rank.Seven)!;
        const cardKing = game.cards.find(c => c.rank === Rank.King)!;
        const cardAceSpades = game.cards.find(c => c.suit === Suit.Spades && c.rank === Rank.Ace)!;

        card8Spades.faceUp = true;
        card7Spades.faceUp = true;
        cardKing.faceUp = true;
        cardAceSpades.faceUp = true;

        // setup tableau1: 7 of Spades, then Ace of Spades (out of sequence)
        tableau1.push(card7Spades);
        tableau1.push(cardAceSpades);

        // setup tableau0: 8 of Spades
        tableau0.push(card8Spades);

        // Can we drag 7 of Spades? Yes, and it carries Ace with it.
        const drag7 = game.canDrag(card7Spades);
        expect(drag7.canDrag).toBe(true);
        expect(drag7.extraCards).toContain(cardAceSpades);

        // Can we drop 7 of Spades onto tableau0 (8 of Spades)?
        // Yes, because 7 of Spades is same suit and builds down from 8 of Spades!
        // The fact that Ace of Spades is on top of 7 of Spades doesn't matter for the drop check.
        expect(game.previewDrop(card7Spades, tableau0)).toBe(true);
    });

    it('handles winning state correctly', () => {
        const game = new Game(new GameOptions(new URLSearchParams()));
        const it = game.restart(12345);
        while (!it.next().done) {}

        expect(game.won).toBe(false);

        // Manually move all cards to foundation to trigger win
        for (const card of game.cards) {
            game.foundations[0].push(card);
        }

        const dropIt = game.dropCard(game.cards[0], game.foundations[0]);
        while (!dropIt.next().done) {}

        expect(game.won).toBe(true);
    });
});
