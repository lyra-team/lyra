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

        private startTime;

        constructor(rootId) {
            this.root = ui.$(rootId);
            this.canvas = ui.$$<HTMLCanvasElement>("." + C_GAME_CANVAS, this.root);

            this.initWebGL();
            this.initInputEvents();

            this.startTime = new Date().getTime();
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

        private createPoints(points, n, splinesN) {
            var res = new Float32Array((n - 1) * splinesN * 2 * 3 * 3);
            var next = 0;
            for (var i = 0; i < n - 1; i++) {
                for (var j = 0; j < splinesN; j++) {
                    var ax = points[i * (splinesN + 1) * 3 + j * 3 + 0], ay = points[i * (splinesN + 1) * 3 + j * 3 + 1], az = points[i * (splinesN + 1) * 3 + j * 3 + 2];
                    var bx = points[i * (splinesN + 1) * 3 + (j + 1) * 3 + 0], by = points[i * (splinesN + 1) * 3 + (j + 1) * 3 + 1], bz = points[i * (splinesN + 1) * 3 + (j + 1) * 3 + 2];
                    var cx = points[(i + 1) * (splinesN + 1) * 3 + j * 3 + 0], cy = points[(i + 1) * (splinesN + 1) * 3 + j * 3 + 1], cz = points[(i + 1) * (splinesN + 1) * 3 + j * 3 + 2];
                    var dx = points[(i + 1) * (splinesN + 1) * 3 + (j + 1) * 3 + 0], dy = points[(i + 1) * (splinesN + 1) * 3 + (j + 1) * 3 + 1], dz = points[(i + 1) * (splinesN + 1) * 3 + (j + 1) * 3 + 2];
                    res[next * 3] = ax, res[next * 3 + 1] = ay, res[next * 3 + 2] = az;
                    next += 1;
                    res[next * 3] = bx, res[next * 3 + 1] = by, res[next * 3 + 2] = bz;
                    next += 1;
                    res[next * 3] = cx, res[next * 3 + 1] = cy, res[next * 3 + 2] = cz;
                    next += 1;

                    res[next * 3] = bx, res[next * 3 + 1] = by, res[next * 3 + 2] = bz;
                    next += 1;
                    res[next * 3] = cx, res[next * 3 + 1] = cy, res[next * 3 + 2] = cz;
                    next += 1;
                    res[next * 3] = dx, res[next * 3 + 1] = dy, res[next * 3 + 2] = dz;
                    next += 1;
                }
            }
            return res;
        }

        private createColors(n, r, g, b) {
            var colors = new Float32Array(n * 3);
            for (var i = 0; i < n; i++) {
                colors[i * 3] = r;
                colors[i * 3 + 1] = g;
                colors[i * 3 + 2] = b;
            }
            return colors;
        }

        private createIndicies(n, splinesN) {
            var indicies = new Uint16Array((n - 1) * splinesN * 2 * 3);
            console.assert(indicies.length <= 65535);
            var next = 0;
            for (var i = 0; i < n - 1; i++) {
                for (var j = 0; j < splinesN; j++) {
                    indicies[next] = next;
                    next += 1;
                    indicies[next] = next;
                    next += 1;
                    indicies[next] = next;
                    next += 1;
                    indicies[next] = next;
                    next += 1;
                    indicies[next] = next;
                    next += 1;
                    indicies[next] = next;
                    next += 1;
                }
            }
            return indicies;
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
                var normal = vec3.create();
                vec3.cross(ab, ac, normal);
                normal = vec3.normalize(normal);
                normals[3 * i] = normal[0];
                normals[3 * i + 1] = normal[1];
                normals[3 * i + 2] = normal[2];
            }
            return normals;
        }

        private createCameraMtx(x, y, z, angleOfView) {
            var pMatrix = mat4.create();
            mat4.perspective(angleOfView, this.canvas.width / this.canvas.height, 0.1, 100.0, pMatrix);
            var mvMatrix = mat4.create();
            mat4.identity(mvMatrix);
            mat4.translate(mvMatrix, [-x, -y, -z]);
            mat4.rotate(mvMatrix, Math.PI / 2, [0, 1, 0]);
            mat4.rotate(mvMatrix, -Math.PI / 2, [1, 0, 0]);
            var cameraMtx = mat4.create();
            mat4.multiply(pMatrix, mvMatrix, cameraMtx);
            return cameraMtx;
        }

        private setUniformLight(name, x, y, z, intensity, attenuation, ambient) {
            this.mapShader.uniformF(name + '.position', x, y, z);
            this.mapShader.uniformF(name + '.intensities', intensity, intensity, intensity);
            this.mapShader.uniformF(name + '.attenuation', attenuation);
            this.mapShader.uniformF(name + '.ambientCoefficient', ambient);
        }

        start() {
            this.loop();
        }

        private loop() {
            this.makeFullPage();

            var points = this.createPoints(new Float32Array([
                4, 2, 1,
                4, 1, 2,
                4, 0, 2.2,
                4, -1, 2,
                4, -2, 1,
                6, 2, 1,
                6, 1, 2,
                6, 0, 2.2,
                6, -1, 2,
                6, -2, 1]), 2, 4);
            var colors = this.createColors(4*2*3, 0, 1, 0);
            var indicies = this.createIndicies(2, 4);
            var normals = this.generateNormals(points, indicies);

            this.posBuf.uploadData(points);
            this.normBuf.uploadData(normals);
            this.colBuf.uploadData(colors);
            this.indBuf.uploadData(indicies);

            this.mapShader.vertexAttribute('aNormal', this.normBuf);
            this.mapShader.vertexAttribute('aPosition', this.posBuf);
            this.mapShader.vertexAttribute('aColor', this.colBuf);

            var curTime = new Date().getTime();
            var time = (curTime - this.startTime) / 1000.0;
            var camX = 0, camY = 3, camZ = 0 - time;
            var viewAngleVert = 45;
            this.mapShader.uniformMatrixF('uCameraMtx', this.createCameraMtx(camX, camY, camZ, viewAngleVert));
            this.mapShader.uniformF('uCameraPosition', camX, camY, camZ);
            this.setUniformLight('uLight', camX, camY, camZ, 2.0, 0.1, 0.5);

            gl.enable(gl.DEPTH_TEST);
            gl.clear(gl.DEPTH | gl.COLOR);
            this.mapShader.draw(this.canvas.width, this.canvas.height, gl.TRIANGLES, this.indBuf);
            window.requestAnimationFrame(this.loop.bind(this));
        }
    }
}