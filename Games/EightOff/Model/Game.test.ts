/* eslint-disable */
import { describe, it, expect } from "vitest";
import { Rank } from "~CardLib/Model/Rank";
import { Game } from "./Game";
import { GameOptions } from "./GameOptions";

describe("EightOff Game", () => {
    it("produces a deterministic deal for a given seed", () => {
        const game1 = new Game(new GameOptions(new URLSearchParams()));
        const it1 = game1.restart(12345);
        while (!it1.next().done) {}

        const game2 = new Game(new GameOptions(new URLSearchParams()));
        const it2 = game2.restart(12345);
        while (!it2.next().done) {}

        // Check if both games have the exact same deck order
        expect(game1.cards.length).toBe(52);
        for (let i = 0; i < 52; i++) {
            const card1 = game1.cards[i];
            const card2 = game2.cards[i];
            if (!card1 || !card2) throw new Error();
            expect(card1.suit).toBe(card2.suit);
            expect(card1.rank).toBe(card2.rank);
        }

        // Check if tableaux top cards are the same
        for (let i = 0; i < game1.tableaux.length; i++) {
            const tab1 = game1.tableaux[i];
            const tab2 = game2.tableaux[i];
            if (!tab1 || !tab2) throw new Error();
            const card1 = tab1.peek();
            const card2 = tab2.peek();
            expect(card1?.suit).toBe(card2?.suit);
            expect(card1?.rank).toBe(card2?.rank);
        }
    });

    it("rejects illegal moves on empty tableau", () => {
        const game = new Game(new GameOptions(new URLSearchParams()));
        const it = game.restart(12345);
        while (!it.next().done) {}

        const tableau0 = game.tableaux[0];
        if (!tableau0) throw new Error();
        const card0 = tableau0.peek();
        expect(card0).toBeDefined();

        // Empty tableau can only be filled by Kings.
        // Let's clear tableau0 by pushing cards to the first foundation
        const foundation0 = game.foundations[0];
        if (!foundation0) throw new Error();

        while (tableau0.length > 0) {
            const card = tableau0.peek();
            if (card) {
                foundation0.push(card);
            }
        }

        // Now tableau0 is empty. Let's find a card that is not a King, and verify previewDrop returns false
        for (const card of game.cards) {
            if (card.rank !== Rank.King) {
                expect(game.previewDrop(card, tableau0)).toBe(false);
            } else {
                // If it is a King, and it is a valid single-card drop source (e.g. from a Free Cell or Tableau top)
                // then previewDrop is true.
                if (game.canDrag(card).canDrag) {
                    expect(game.previewDrop(card, tableau0)).toBe(true);
                }
            }
        }
    });
});
