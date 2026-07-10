import * as MathEx from "~CardLib/MathEx";
import { GameOptionsBase } from "~CardLib/Model/GameOptionsBase";
import * as URLSearchParamsEx from "~CardLib/URLSearchParamsEx";

export class GameOptions extends GameOptionsBase {
    public get saveKey() {
        return {};
    }

    constructor(params: URLSearchParams) {
        super();
    }

    public toURLSearchParams(): URLSearchParams {
        return new URLSearchParams();
    }
}
