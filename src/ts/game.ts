///<reference path="ui.ts"/>
module game {
    var C_GAME_CANVAS = "game--canvas";

    export class Game {
        private root: HTMLElement;
        private canvas: HTMLCanvasElement;

        constructor(rootId) {
            this.root = ui.$(rootId);
            this.canvas = ui.$$<HTMLCanvasElement>("." + C_GAME_CANVAS, this.root);

            this.initWebGL();
            this.initInputEvents();
            this.start();
        }

        private initWebGL() {
            // init webgl
        }

        private initInputEvents() {
            var handler = new input.InputHandler();
            handler.attach(document);
            handler.onDown(input.Key.W, () => {
                console.log("W!");
                return false;
            });
        }

        start() {

        }
    }
}