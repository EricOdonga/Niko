import { error } from "~CardLib/Debug";
import { GamePresenterBase } from "~CardLib/Presenter/GamePresenterBase";
import { IView } from "~CardLib/View/IView";
import { PileView } from "~CardLib/View/PileView";
import { Rect } from "~CardLib/View/Rect";
import { IGame } from "../Model/IGame";

const margin = 1;
const baseSizeY = 20;
const baseSizeX = baseSizeY / 1.555555555555;
const sizeY = baseSizeY / 1.3;
const sizeX = baseSizeX / 1.3;

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
        const tableSize = 7; // 7 columns

        let vExpand = 1;
        if (window.matchMedia("screen and (max-aspect-ratio: 100/130)").matches) {
            vExpand = 1.5;
        }

        const xPos = (i: number) => {
            return (i - 0.5 * (tableSize - 1)) * (sizeX + margin);
        };

        const yStartRow1 = vExpand * -35 + margin;
        const yStartRow2 = yStartRow1 + sizeY + margin * 2;

        // Row 1:
        // Foundations at 0, 1, 2, 3
        for (let i = 0; i < this.foundationPiles_.length; ++i) {
            this.foundationPiles_[i].rect = new Rect(sizeX, sizeY, xPos(i), yStartRow1);
        }

        // Waste fan at Col 4. We will fan it to the right (x direction).
        this.wastePile_.fanXUp = 3 / 1.3; // Fan horizontally
        this.wastePile_.rect = new Rect(sizeX, sizeY, xPos(4), yStartRow1);

        // Stock at Col 6
        this.stockPile_.rect = new Rect(sizeX, sizeY, xPos(6), yStartRow1);

        // Row 2:
        // Reserve at Col 0
        this.reservePile_.rect = new Rect(sizeX, sizeY, xPos(0), yStartRow2);
        // We fan the reserve downwards slightly if we want, but usually it's just stacked, or only top card visible.
        // The rule says "Deal 13 cards to the Reserve pile (Stack 4), top card face up." So the others are hidden or stacked. We'll add a tiny fan.
        this.reservePile_.fanYDown = 0.5;

        // Tableaux at Cols 1, 2, 3, 4
        for (let i = 0; i < this.tableauPiles_.length; ++i) {
            this.tableauPiles_[i].rect = new Rect(sizeX, sizeY, xPos(i + 1), yStartRow2);
            this.tableauPiles_[i].fanYDown = 3.5 / 1.3;
            this.tableauPiles_[i].fanYUp = vExpand * 3.5 / 1.3;
        }
    }
}
