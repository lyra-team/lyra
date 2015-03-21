///<reference path="ui.ts"/>
///<reference path="webgl/gl.ts"/>
///<reference path="glMatrix.d.ts"/>

module game {
    var C_GAME_CANVAS = "game--canvas";
    var gl;

    export class Game {
        private root: HTMLElement;
        private canvas: HTMLCanvasElement;
        private glContext: webgl.GLContext;

        private shader: webgl.Shader;

        private posBuf: webgl.ArrayBuffer;
        private colBuf: webgl.ArrayBuffer;
        private indBuf: webgl.ElementArrayBuffer;

        constructor(rootId) {
            this.root = ui.$(rootId);
            this.canvas = ui.$$<HTMLCanvasElement>("." + C_GAME_CANVAS, this.root);

            this.initWebGL();
            this.initInputEvents();
        }

        private initWebGL() {
            this.glContext = new webgl.GLContext(this.canvas);
            this.glContext.activate();
            gl = webgl.gl;

            var vert = (<HTMLScriptElement> document.getElementById('vshader')).text;
            var frag = (<HTMLScriptElement> document.getElementById('fshader')).text;
            this.shader = new webgl.Shader(vert, frag);

            this.posBuf = new webgl.ArrayBuffer(3, gl.FLOAT);
            this.colBuf = new webgl.ArrayBuffer(3, gl.FLOAT);
            this.indBuf = new webgl.ElementArrayBuffer();
        }

        private initInputEvents() {
            var handler = new input.InputHandler();
            handler.attach(document);
            handler.onDown(input.Key.W, () => {
                console.log("W!");
                return false;
            });
        }

        private makeFullPage() {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        }

        private createPoints() {
            return new Float32Array([
                1, 0, 0,
                0, 1, 0,
                1, 1, 0
            ]);
        }

        private createColors() {
            return new Float32Array([
                -11, 0, 0,
                -10, 0, 1,
                -10, 1, 0
            ]);
        }

        private createIndicies() {
            return new Uint16Array([
                0, 1, 2
            ]);
        }

        private createCameraMtx(x, y, z, angleOfView, course, pitch) {
            var pMatrix = mat4.create();
            mat4.perspective(angleOfView, this.canvas.width / this.canvas.height, 0.1, 100.0, pMatrix);
            var mvMatrix = mat4.create();
            mat4.identity(mvMatrix);
            mat4.translate(mvMatrix, [-x, -y, -z]);
            mat4.rotate(mvMatrix, Math.PI/2-pitch, [0, 1, 0]);
            mat4.rotate(mvMatrix, -course, [0, 0, 1]);
            var cameraMtx = mat4.create();
            mat4.multiply(pMatrix, mvMatrix, cameraMtx);
            return cameraMtx;
        }

        start() {
            this.loop();
        }

        private loop() {
            this.makeFullPage();

            var points = this.createPoints();
            var colors = this.createColors();
            var indicies = this.createIndicies();

            this.posBuf.uploadData(points);
            this.colBuf.uploadData(colors);
            this.indBuf.uploadData(indicies);

            this.shader.vertexAttribute('aPosition', this.posBuf);
            this.shader.vertexAttribute('aColor', this.colBuf);

            this.shader.uniformMatrixF('uCameraMtx', this.createCameraMtx(0, 0, 3, 45, 0, Math.PI/6));

            this.shader.draw(this.canvas.width, this.canvas.height, gl.TRIANGLES, this.indBuf);
            window.requestAnimationFrame(this.loop.bind(this));
        }
    }
}