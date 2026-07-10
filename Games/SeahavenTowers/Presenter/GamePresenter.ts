import { error } from "~CardLib/Debug";
import { GamePresenterBase } from "~CardLib/Presenter/GamePresenterBase";
import { IView } from "~CardLib/View/IView";
import { PileView } from "~CardLib/View/PileView";
import { Rect } from "~CardLib/View/Rect";
import { IGame } from "../Model/IGame";

const margin = 1;
const sizeY = 20 / 1.2;
const sizeX = sizeY / 1.555555555555;

export class GamePresenter extends GamePresenterBase<IGame> {
    private readonly tableauPiles_: PileView[] = [];
    private readonly freeCellPiles_: PileView[] = [];
    private readonly foundationPiles_: PileView[] = [];

    protected get saveDataKey_() {
        return JSON.stringify({
            gameName: "seahaventowers",
            version: 0,
            options: this.game_.options.saveKey,
        });
    }

    constructor(game: IGame, rootView: IView) {
        super(game, rootView);

        for (let i = 0; i < this.game_.tableaux.length; ++i) {
            const pileView = this.createPileView_(game.tableaux[i] ?? error());
            pileView.showFrame = true;
            pileView.zIndex = 800;
            this.tableauPiles_.push(pileView);
        }

        for (let i = 0; i < this.game_.freeCells.length; ++i) {
            const pileView = this.createPileView_(game.freeCells[i] ?? error());
            pileView.showFrame = true;
            pileView.zIndex = 800;
            this.freeCellPiles_.push(pileView);
        }

        for (let i = 0; i < this.game_.foundations.length; ++i) {
            const pileView = this.createPileView_(game.foundations[i] ?? error());
            pileView.showFrame = true;
            pileView.zIndex = 800;
            this.foundationPiles_.push(pileView);
        }

        // Create an off-screen/invisible PileView for the Stock Reserve so that getPileView_ is successful
        const stockPileView = this.createPileView_(game.stock);
        stockPileView.showFrame = false;

        for (const card of game.cards) {
            this.createCardView_(card);
        }

        this.layoutPiles_();
        this.relayoutAll_();
    }

    protected onResize_() {
        this.layoutPiles_();
        this.relayoutAll_();
    }

    private layoutPiles_() {
        const tableSize = 10; // 10 columns total

        let vExpand = 1;
        if (window.matchMedia("screen and (max-aspect-ratio: 100/130)").matches) {
            vExpand = 1.5;
        }
        const xPos = (i: number) => {
            return (i - 0.5 * (tableSize - 1)) * (sizeX + margin);
        };

        const yStartRow1 = vExpand * -35 + margin;
        const yStartRow2 = vExpand * -15 + margin;

        for (let i = 0; i < this.game_.tableaux.length; ++i) {
            const pile = this.game_.tableaux[i] ?? error();
            const pileView = this.getPileView_(pile);
            pileView.rect = new Rect(sizeX, sizeY, xPos(i), yStartRow2);
            pileView.fanYDown = 3.5 / 1.2;
            pileView.fanYUp = (vExpand * 3.5) / 1.2;
        }

        for (let i = 0; i < this.game_.freeCells.length; ++i) {
            const pile = this.game_.freeCells[i] ?? error();
            const pileView = this.getPileView_(pile);
            // Place 4 free cells in top columns 0, 1, 2, 3
            pileView.rect = new Rect(sizeX, sizeY, xPos(i), yStartRow1);
        }

        for (let i = 0; i < this.game_.foundations.length; ++i) {
            const pile = this.game_.foundations[i] ?? error();
            const pileView = this.getPileView_(pile);
            // Place 4 foundations in top columns 6, 7, 8, 9
            pileView.rect = new Rect(sizeX, sizeY, xPos(i + 6), yStartRow1);
        }

        const stockPile = this.game_.stock;
        const stockPileView = this.getPileView_(stockPile);
        stockPileView.rect = new Rect(0, 0, 9999, 9999);
    }
}
