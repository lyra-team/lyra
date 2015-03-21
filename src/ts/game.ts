///<reference path="ui.ts"/>
///<reference path="webgl/gl.ts"/>
///<reference path="glMatrix.d.ts"/>

module game {
    var C_GAME_CANVAS = "game--canvas";
    var gl;

    export class Game {
        private root:HTMLElement;
        private canvas:HTMLCanvasElement;
        private glContext:webgl.GLContext;

        private mapShader:webgl.Shader;

        private posBuf:webgl.ArrayBuffer;
        private normBuf:webgl.ArrayBuffer;
        private colBuf:webgl.ArrayBuffer;
        private indBuf:webgl.ElementArrayBuffer;

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

            var vert = (<HTMLScriptElement> document.getElementById('map_vshader')).text;
            var frag = (<HTMLScriptElement> document.getElementById('map_fshader')).text;
            this.mapShader = new webgl.Shader(vert, frag);

            this.posBuf = new webgl.ArrayBuffer(3, gl.FLOAT);
            this.normBuf = new webgl.ArrayBuffer(3, gl.FLOAT);
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
                4, 0, 0,
                4, 0, 1,
                4, 1, 0,
                4, 1, 1,
                5, 0, 0,
                5, 0, 1,
                5, 1, 0,
                5, 1, 1,
                4, 0, 0,
                4, 0, 1,
                4, 1, 0,
                4, 1, 1,
                5, 0, 0,
                5, 0, 1,
                5, 1, 0,
                5, 1, 1,
                4, 0, 0,
                4, 0, 1,
                4, 1, 0,
                4, 1, 1,
                5, 0, 0,
                5, 0, 1,
                5, 1, 0,
                5, 1, 1
            ]);
        }

        private createColors() {
            return new Float32Array([
                0, 1, 0,
                0, 1, 0,
                0, 1, 0,
                0, 1, 0,
                0, 1, 0,
                0, 1, 0,
                0, 1, 0,
                0, 1, 0
            ]);
        }

        private createIndicies() {
            return new Uint16Array([
                0, 1, 2,
                1, 2, 3,
                4, 5, 6,
                5, 6, 7,
                8+1, 8+3, 8+5,
                8+3, 8+5, 8+7,
                8+0, 8+2, 8+4,
                8+2, 8+4, 8+6,
                16+2, 16+3, 16+6,
                16+3, 16+6, 16+7,
                16+0, 16+1, 16+4,
                16+1, 16+4, 16+5
            ]);
        }

        private generateNormals(points, indicies) {
            var normals = new Float32Array(points.length);
            for (var i = 0; i < indicies.length / 3; i++) {
                var a = new Float32Array([points[3 * i], points[3 * i + 1], points[3 * i + 2]]);
                var b = new Float32Array([points[3 * (i + 1)], points[3 * (i + 1) + 1], points[3 * (i + 1) + 2]]);
                var c = new Float32Array([points[3 * (i + 2)], points[3 * (i + 2) + 1], points[3 * (i + 2) + 2]]);
                var ab = new Float32Array(3);
                vec3.subtract(b, a, ab);
                var ac = new Float32Array(3);
                vec3.subtract(c, a, ac);
                var normal = new Float32Array(3);
                vec3.cross(ab, ac, normal);
                normals[3 * i] = normal[0];
                normals[3 * i + 1] = normal[1];
                normals[3 * i + 2] = normal[2];
            }
            return normals;
        }

        private createCameraMtx(x, y, z, angleOfView, course, pitch) {
            var pMatrix = mat4.create();
            mat4.perspective(angleOfView, this.canvas.width / this.canvas.height, 0.1, 100.0, pMatrix);
            var mvMatrix = mat4.create();
            mat4.identity(mvMatrix);
            mat4.translate(mvMatrix, [-x, -y, -z]);
            mat4.rotate(mvMatrix, Math.PI / 2 - pitch, [0, 1, 0]);
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
            var normals = this.generateNormals(points, indicies);

            this.posBuf.uploadData(points);
            this.normBuf.uploadData(normals);
            this.colBuf.uploadData(colors);
            this.indBuf.uploadData(indicies);

            this.mapShader.vertexAttribute('aPosition', this.posBuf);
            this.mapShader.vertexAttribute('aColor', this.colBuf);
            this.mapShader.vertexAttribute('aNormal', this.normBuf);

            var camX = 0, camY = 0, camZ = 3;
            var course = Math.PI / 6, pitch = 0, viewAngleVert = 45;
            this.mapShader.uniformMatrixF('uCameraMtx', this.createCameraMtx(camX, camY, camZ, viewAngleVert, course, pitch));
            this.mapShader.uniformF('uCameraPosition', camX, camY, camZ);

            this.mapShader.draw(this.canvas.width, this.canvas.height, gl.TRIANGLES, this.indBuf);
            window.requestAnimationFrame(this.loop.bind(this));
        }
    }
}