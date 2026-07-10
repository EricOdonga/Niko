import { IGameInfo } from "~CardLib/IGameInfo";
import { GamePresenterFactory } from "./Presenter/GamePresenterFactory";

class GameInfo implements IGameInfo {
    public gameId = "eightoff";
    public gameName = "Eight Off";
    public gamePresenterFactory = new GamePresenterFactory();
}

export default new GameInfo();
