import { error } from "~CardLib/Debug";
import { GamePresenterBase } from "~CardLib/Presenter/GamePresenterBase";
import { IView } from "~CardLib/View/IView";
import { PileView } from "~CardLib/View/PileView";
import { Rect } from "~CardLib/View/Rect";
import { IGame } from "../Model/IGame";

const margin = 1 / 1.2;
const sizeY = 20 / 1.2;
const sizeX = sizeY / 1.555555555555;

export class GamePresenter extends GamePresenterBase<IGame> {
    private readonly stockPile_: PileView;
    private readonly foundationPiles_: PileView[] = [];
    private readonly tableauPiles_: PileView[] = [];

    protected get saveDataKey_() {
        return JSON.stringify({
            gameName: "grandfathersclock",
            version: 0,
            options: this.game_.options.saveKey,
        });
    }

    constructor(game: IGame, rootView: IView) {
        super(game, rootView);

        // create piles:
        {
            const pileView = this.createPileView_(game.stock);
            pileView.showFrame = true;
            this.stockPile_ = pileView;
        }

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
        let vExpand = 1;
        if (window.matchMedia("screen and (max-aspect-ratio: 100/130)").matches) {
            vExpand = 1.5;
        }

        const cx = 0;
        const cy = vExpand * -21;
        const rx = 24;
        const ry = vExpand * 14;

        // Stock Pile (at center of the clock)
        {
            const pile = this.game_.stock;
            const pileView = this.getPileView_(pile);
            pileView.rect = new Rect(sizeX, sizeY, cx, cy);
        }

        // Foundations in a clock face layout:
        for (let i = 0; i < 12; ++i) {
            const hour = i + 1;
            const theta = (hour - 3) * Math.PI / 6;
            const x = cx + rx * Math.cos(theta);
            const y = cy + ry * Math.sin(theta);

            const pile = this.game_.foundations[i] ?? error();
            const pileView = this.getPileView_(pile);
            pileView.rect = new Rect(sizeX, sizeY, x, y);
        }

        // Tableaux centered below the clock face:
        const tableSize = this.game_.tableaux.length;
        const xPos = (i: number) => {
            return (i - 0.5 * (tableSize - 1)) * (sizeX + margin);
        };

        const tableauY = cy + ry + margin + margin + sizeY;

        for (let i = 0; i < tableSize; ++i) {
            const pile = this.game_.tableaux[i] ?? error();
            const pileView = this.getPileView_(pile);
            pileView.rect = new Rect(sizeX, sizeY, xPos(i), tableauY);
            pileView.fanYDown = 3.5 / 1.2;
            pileView.fanYUp = vExpand * 3.5 / 1.2;
        }
    }
}
