module input {
    interface KeyboardState {
        [index: number]: boolean
    }

    export interface KeyHandler {
        (): boolean;
    }

    interface KeyHandlerMap {
        [key: number]: KeyHandler[]
    }

    export class InputHandler {
        private keyboard: KeyboardState = {};
        private downHandlers: KeyHandlerMap = {};
        private upHandlers: KeyHandlerMap = {};
        private whileDownHandlers: KeyHandlerMap = {};
        private attachedTo: HTMLElement;
        private eventListeners: {[type: string]: (Event) => any};

        constructor() {
            this.eventListeners = {
                "keydown": this.onKeyDown.bind(this),
                "keyup": this.onKeyUp.bind(this)
            };
            setInterval(() => {
                Object.getOwnPropertyNames(this.keyboard).forEach((key) => {
                    InputHandler.fire(this.whileDownHandlers, <Key> +key);
                });
            }, 20);
        }

        private static on(map: KeyHandlerMap, key: Key, handler: KeyHandler) {
            if (!map[key])
                map[key] = [];
            map[key].push(handler);
        }

        private static fire(map: KeyHandlerMap, key: Key) {
            if (!map[key])
                return;
            return map[key].reduce((captured, handler) => handler() || captured, false);
        }

        private onKeyDown(evt) {
            var key = evt.keyCode;
            if (!this.keyboard[key]) {
                this.keyboard[key] = true;
                if (InputHandler.fire(this.downHandlers, key)) {
                    evt.preventDefault();
                }
            }
        }

        private onKeyUp(evt) {
            var key = evt.keyCode;
            if (this.keyboard[key]) {
                delete this.keyboard[key];
                if (InputHandler.fire(this.upHandlers, key)) {
                    evt.preventDefault();
                }
            }
        }

        onDown(key: Key, handler: KeyHandler) {
            InputHandler.on(this.downHandlers, key, handler);
        }

        whileDown(key: Key, handler: KeyHandler) {
            InputHandler.on(this.whileDownHandlers, key, handler);
        }

        onUp(key: Key, handler: KeyHandler) {
            InputHandler.on(this.upHandlers, key, handler);
        }

        attach(id) {
            if (this.attachedTo)
                throw new Error("Already attached");
            this.attachedTo = ui.$(id);
            if (!this.attachedTo)
                throw new Error("Element not found");
            Object.getOwnPropertyNames(this.eventListeners).forEach((type) => {
                this.attachedTo.addEventListener(type, this.eventListeners[type]);
            }, this);
        }

        detach() {
            if (!this.attachedTo)
                throw new Error("Not attached");
            Object.getOwnPropertyNames(this.eventListeners).forEach((type) => {
                this.attachedTo.removeEventListener(type, this.eventListeners[type]);
            }, this);
            this.attachedTo = null;
        }
    }

    function code(char) {
        return char.toUpperCase().charCodeAt(0);
    }

    export enum Key {
        W = code('w'),
        A = code('a'),
        S = code('s'),
        D = code('d'),
        SPACE = code(' '),
        Z = code('z'),
        X = code('x'),
        LEFT_ARROW = 37,
        RIGHT_ARROW = 39
    }
}