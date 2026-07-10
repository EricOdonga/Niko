import { IGameInfo } from "~CardLib/IGameInfo";
import { GamePresenterFactory } from "./Presenter/GamePresenterFactory";

class GameInfo implements IGameInfo {
    public gameId = "freecell";
    public gameName = "Freecell";
    public gamePresenterFactory = new GamePresenterFactory();
}

export default new GameInfo();
