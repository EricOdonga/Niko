import * as MathEx from "~CardLib/MathEx";
import { GameOptionsBase } from "~CardLib/Model/GameOptionsBase";
import * as URLSearchParamsEx from "~CardLib/URLSearchParamsEx";

export class GameOptions extends GameOptionsBase {
    public drawCount = 3;
    public restockLimit = -1; // Infinite restocks usually, or sometimes limited. The prompt didn't specify a limit, let's say infinite (-1)
    public autoReveal = true;

    public get saveKey() {
        return {
            drawCount: this.drawCount,
            restockLimit: this.restockLimit,
            autoReveal: this.autoReveal,
        };
    }

    constructor(params: URLSearchParams) {
        super();
        this.drawCount = URLSearchParamsEx.getNumber(params, "drawCount", 3);
        this.restockLimit = URLSearchParamsEx.getNumber(params, "restockLimit", -1);
        this.autoReveal = URLSearchParamsEx.getBool(params, "autoReveal", true);
    }

    public toURLSearchParams(): URLSearchParams {
        const params = new URLSearchParams();
        URLSearchParamsEx.setNumber(params, "drawCount", this.drawCount, 3);
        URLSearchParamsEx.setNumber(params, "restockLimit", this.restockLimit, -1);
        URLSearchParamsEx.setBool(params, "autoReveal", this.autoReveal, true);
        return params;
    }
}
