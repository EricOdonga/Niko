import { error } from "~CardLib/Debug";
import { GamePresenterBase } from "~CardLib/Presenter/GamePresenterBase";
import { IView } from "~CardLib/View/IView";
import { PileView } from "~CardLib/View/PileView";
import { Rect } from "~CardLib/View/Rect";
import { IGame } from "../Model/IGame";

const margin = 1;
const sizeY = 20;
const sizeX = sizeY / 1.555555555555;

export class GamePresenter extends GamePresenterBase<IGame> {
    private readonly freeCellPiles_: PileView[] = [];
    private readonly foundationPiles_: PileView[] = [];
    private readonly tableauPiles_: PileView[] = [];

    protected get saveDataKey_() {
        return JSON.stringify({
            gameName: "freecell",
            version: 0,
            options: this.game_.options.saveKey,
        });
    }

    constructor(game: IGame, rootView: IView) {
        super(game, rootView);

        for (const pile of game.freeCells) {
            const pileView = new PileView(pile);
            this.freeCellPiles_.push(pileView);
            this.addPileView_(pileView);
        }

        for (const pile of game.foundations) {
            const pileView = new PileView(pile);
            this.foundationPiles_.push(pileView);
            this.addPileView_(pileView);
        }

        for (const pile of game.tableaux) {
            const pileView = new PileView(pile);
            this.tableauPiles_.push(pileView);
            this.addPileView_(pileView);
        }

        this.onResize_();
    }

    protected onResize_() {
        this.layoutPiles_();
        super.onResize_();
    }

    private layoutPiles_() {
        const tableSize = 8; // 8 columns total

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
            this.freeCellPiles_[i].rect = new Rect(sizeX, sizeY, xPos(i), yStartRow1);
        }

        for (let i = 0; i < this.foundationPiles_.length; ++i) {
            this.foundationPiles_[i].rect = new Rect(sizeX, sizeY, xPos(i + 4), yStartRow1);
        }

        for (let i = 0; i < this.tableauPiles_.length; ++i) {
            this.tableauPiles_[i].rect = new Rect(sizeX, sizeY, xPos(i), yStartRow2);
            this.tableauPiles_[i].fanYDown = 3.5;
            this.tableauPiles_[i].fanYUp = vExpand * 3.5;
        }
    }
}
