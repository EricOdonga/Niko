import { Game } from "./Games/Canfield/Model/Game";
import { GameOptions } from "./Games/Canfield/Model/GameOptions";
import { GamePresenter } from "./Games/Canfield/Presenter/GamePresenter";
import { JSDOM } from "jsdom";

const dom = new JSDOM('<!DOCTYPE html><div id="root"></div>');
global.document = dom.window.document;
global.window = dom.window;

const game = new Game(new GameOptions());
const presenter = new GamePresenter(game, {
    element: document.getElementById('root'),
    width: 800,
    height: 600
} as any);

console.log("Success!");
