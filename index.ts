import * as Debug from "~CardLib/Debug";
import { IGameInfo } from "~CardLib/IGameInfo";
import { IGamePresenter } from "~CardLib/Presenter/IGamePresenter";
import Canfield from "~Games/Canfield/GameInfo";
import Klondike from "~Games/Klondike/GameInfo";
import KlondikeEx from "~Games/KlondikeEx/GameInfo";
import Pyramid from "~Games/Pyramid/GameInfo";
import Yukon from "~Games/Yukon/GameInfo";
import Freecell from "~Games/Freecell/GameInfo";
import GrandfathersClock from "~Games/GrandfathersClock/GameInfo";

const gameInfos = new Map<string, IGameInfo>();
gameInfos.set(Canfield.gameId, Canfield);
gameInfos.set(Freecell.gameId, Freecell);
gameInfos.set(Klondike.gameId, Klondike);
gameInfos.set(KlondikeEx.gameId, KlondikeEx);
gameInfos.set(Pyramid.gameId, Pyramid);
gameInfos.set(Yukon.gameId, Yukon);
gameInfos.set(GrandfathersClock.gameId, GrandfathersClock);

const init = () => {
    const tableHolder = document.getElementById("tableHolder") ?? document.body;
    const homepage = document.getElementById("homepage");
    const gameContainer = document.getElementById("game-container");
    const gameGrid = document.getElementById("game-grid");
    const activeGameTitle = document.getElementById("active-game-title");
    const backLink = document.getElementById("back-link");

    let currentGame: IGamePresenter | undefined;

    // Build the grid
    if (gameGrid) {
        for (const [id, info] of gameInfos.entries()) {
            const card = document.createElement("a");
            card.className = "game-card";
            card.href = `#${id}`;
            const title = document.createElement("h2");
            title.textContent = info.gameName;
            card.appendChild(title);
            gameGrid.appendChild(card);
        }
    }

    const refreshGame = () => {
        if (currentGame) {
            currentGame.dispose();
            currentGame = undefined;
        }

        const hash = window.location.hash;
        if (!hash || hash === "#" || hash === "") {
            // Show homepage
            if (homepage) homepage.style.display = "block";
            if (gameContainer) gameContainer.style.display = "none";
            if (activeGameTitle) activeGameTitle.textContent = "";
            if (backLink) backLink.style.display = "none";
            document.title = "Solitaire Hub";
            return;
        }

        // Hide homepage, show game
        if (homepage) homepage.style.display = "none";
        if (gameContainer) gameContainer.style.display = "block";
        if (backLink) backLink.style.display = "inline";

        const qPos = hash.indexOf("?");
        let params;
        let gameKey;

        if (qPos >= 0) {
            params = new URLSearchParams(hash.substr(qPos + 1));
            gameKey = hash.substr(1, qPos - 1);
        } else if (hash.includes("&") || hash.includes("?") || hash.includes("=")) {
            params = new URLSearchParams(hash.substr(1));
            gameKey = params.get("game");
        } else {
            params = new URLSearchParams("");
            gameKey = hash.substr(1);
        }

        const gameInfo = gameInfos.get(gameKey?.toLowerCase() || "");
        if (!gameInfo) {
            window.location.hash = "";
            return;
        }

        if (activeGameTitle) activeGameTitle.textContent = gameInfo.gameName;
        document.title = `${gameInfo.gameName} — Solitaire Hub`;

        currentGame = gameInfo.gamePresenterFactory.createGame(tableHolder, params);
        currentGame.start();
    };

    window.addEventListener("hashchange", refreshGame);
    refreshGame();
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}

