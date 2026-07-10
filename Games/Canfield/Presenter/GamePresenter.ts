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
    private readonly stockPile_: PileView;
    private readonly wastePile_: PileView;
    private readonly reservePile_: PileView;
    private readonly foundationPiles_: PileView[] = [];
    private readonly tableauPiles_: PileView[] = [];

    protected get saveDataKey_() {
        return JSON.stringify({
            gameName: "canfield",
            version: 0,
            options: this.game_.options.saveKey,
        });
    }

    constructor(game: IGame, rootView: IView) {
        super(game, rootView);

        this.stockPile_ = this.createPileView_(game.stock);
        this.stockPile_.showFrame = true;

        this.wastePile_ = this.createPileView_(game.waste);
        this.wastePile_.showFrame = true;
        
        this.reservePile_ = this.createPileView_(game.reserve);
        this.reservePile_.showFrame = true;

        for (let i = 0; i < this.game_.foundations.length; ++i) {
            const pileView = this.createPileView_(game.foundations[i] ?? error());
            pileView.showFrame = true;
            pileView.zIndex = 800;
            this.foundationPiles_.push(pileView);
        }
        
        for (let i = 0; i < this.game_.tableaux.length; ++i) {
            const pileView = this.createPileView_(game.tableaux[i] ?? error());
            pileView.showFrame = true;
            pileView.zIndex = 800;
            this.tableauPiles_.push(pileView);
        }

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
        const tableSize = 6; // 6 columns: Stock, Waste, F1, F2, F3, F4

        let vExpand = 1;
        if (window.matchMedia("screen and (max-aspect-ratio: 100/130)").matches) {
            vExpand = 1.5;
        }

        const xPos = (i: number) => {
            return (i - 0.5 * (tableSize - 1)) * (sizeX + margin);
        };

        const yStartRow1 = vExpand * -35 + margin;
        const yStartRow2 = vExpand * -15 + margin;

        // Row 1: Stock at 0, Waste at 1, Foundations at 2, 3, 4, 5
        this.stockPile_.rect = new Rect(sizeX, sizeY, xPos(0), yStartRow1);
        
        this.wastePile_.fanXUp = 3;
        this.wastePile_.rect = new Rect(sizeX, sizeY, xPos(1), yStartRow1);

        for (let i = 0; i < this.foundationPiles_.length; ++i) {
            this.foundationPiles_[i].rect = new Rect(sizeX, sizeY, xPos(i + 2), yStartRow1);
        }

        // Row 2: Reserve at 0, Tableaux at 2, 3, 4, 5
        this.reservePile_.rect = new Rect(sizeX, sizeY, xPos(0), yStartRow2);
        this.reservePile_.fanYDown = 1.0;

        for (let i = 0; i < this.tableauPiles_.length; ++i) {
            this.tableauPiles_[i].rect = new Rect(sizeX, sizeY, xPos(i + 2), yStartRow2);
            this.tableauPiles_[i].fanYDown = 3.5;
            this.tableauPiles_[i].fanYUp = vExpand * 3.5;
        }
    }
}
