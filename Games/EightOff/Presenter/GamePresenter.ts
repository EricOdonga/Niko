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
    private readonly freeCellPiles_: PileView[] = [];
    private readonly foundationPiles_: PileView[] = [];
    private readonly tableauPiles_: PileView[] = [];

    protected get saveDataKey_() {
        return JSON.stringify({
            gameName: "eightoff",
            version: 0,
            options: this.game_.options.saveKey,
        });
    }

    constructor(game: IGame, rootView: IView) {
        super(game, rootView);

        for (let i = 0; i < this.game_.freeCells.length; ++i) {
            const pileView = this.createPileView_(this.game_.freeCells[i] ?? error());
            pileView.showFrame = true;
            pileView.zIndex = 800;
            this.freeCellPiles_.push(pileView);
        }

        for (let i = 0; i < this.game_.foundations.length; ++i) {
            const pileView = this.createPileView_(this.game_.foundations[i] ?? error());
            pileView.showFrame = true;
            pileView.zIndex = 800;
            this.foundationPiles_.push(pileView);
        }

        for (let i = 0; i < this.game_.tableaux.length; ++i) {
            const pileView = this.createPileView_(this.game_.tableaux[i] ?? error());
            pileView.showFrame = true;
            pileView.zIndex = 800;
            this.tableauPiles_.push(pileView);
        }

        // create cards:
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
        const tableSize = 12; // 12 columns total

        let vExpand = 1;
        if (window.matchMedia("screen and (max-aspect-ratio: 100/130)").matches) {
            vExpand = 2.4;
        }

        const xPos = (i: number) => {
            return (i - 0.5 * (tableSize - 1)) * (sizeX + margin);
        };

        const yStartRow1 = vExpand * -35 + margin;
        const yStartRow2 = vExpand * -15 + margin;

        for (let i = 0; i < this.freeCellPiles_.length; ++i) {
            const pile = this.game_.freeCells[i] ?? error();
            const pileView = this.getPileView_(pile);
            pileView.rect = new Rect(sizeX, sizeY, xPos(i), yStartRow1);
        }

        for (let i = 0; i < this.foundationPiles_.length; ++i) {
            const pile = this.game_.foundations[i] ?? error();
            const pileView = this.getPileView_(pile);
            pileView.rect = new Rect(sizeX, sizeY, xPos(i + 8), yStartRow1);
        }

        for (let i = 0; i < this.tableauPiles_.length; ++i) {
            const pile = this.game_.tableaux[i] ?? error();
            const pileView = this.getPileView_(pile);
            pileView.rect = new Rect(sizeX, sizeY, xPos(i), yStartRow2);
            pileView.fanYDown = 3.5;
            pileView.fanYUp = vExpand * 3.5;
        }
    }
}
