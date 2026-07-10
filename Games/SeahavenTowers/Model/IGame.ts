import { IGameBase } from "~CardLib/Model/IGameBase";
import { IPile } from "~CardLib/Model/IPile";
import { GameOptions } from "./GameOptions";

export interface IGame extends IGameBase {
    readonly options: GameOptions;
    readonly tableaux: IPile[];
    readonly freeCells: IPile[];
    readonly foundations: IPile[];
    readonly stock: IPile;
}
