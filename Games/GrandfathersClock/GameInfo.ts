import { IGameInfo } from "~CardLib/IGameInfo";
import { GamePresenterFactory } from "./Presenter/GamePresenterFactory";

class GameInfo implements IGameInfo {
    public gameId = "grandfathersclock";
    public gameName = "Grandfather's Clock";
    public gamePresenterFactory = new GamePresenterFactory();
}

export default new GameInfo();
