///<reference path="ui.ts"/>
///<reference path="webgl/gl.ts"/>
///<reference path="glMatrix.d.ts"/>
///<reference path="webgl/map.ts"/>

module game {
    var C_GAME_CANVAS = "game--canvas";
    var LIGHTS_COUNT = 2;
    var gl;

    var STRIP_COUNT = 5;
    var TUBE_RADIUS = 5;
    var SECTOR_ANGLE = Math.PI / 2;
    var CAM_HEIGHT = 5;
    var CAM_VIEW_DISTANCE = 2;
    var CAM_BACK_OFFSET = 1;

    export class Game {
        private root:HTMLElement;
        private canvas:HTMLCanvasElement;
        private glContext:webgl.GLContext;

        private mapShader:webgl.Shader;
        private lightShader:webgl.Shader;

        private posBuf:webgl.ArrayBuffer;
        private normBuf:webgl.ArrayBuffer;
        private colBuf:webgl.ArrayBuffer;
        private indBuf:webgl.ElementArrayBuffer;

        private songBuffer;
        private song;
        private songLastOffset;
        private timeLastOffset;

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
            vert = (<HTMLScriptElement> document.getElementById('lights_vshader')).text.split('LIGHTS_COUNT').join(LIGHTS_COUNT.toString());
            frag = (<HTMLScriptElement> document.getElementById('lights_fshader')).text.split('LIGHTS_COUNT').join(LIGHTS_COUNT.toString());
            this.lightShader = new webgl.Shader(vert, frag);

            this.posBuf = new webgl.ArrayBuffer(3, gl.FLOAT);
            this.normBuf = new webgl.ArrayBuffer(3, gl.FLOAT);
            this.colBuf = new webgl.ArrayBuffer(3, gl.FLOAT);
            this.indBuf = new webgl.ElementArrayBuffer();
        }

        private initInputEvents() {
            var handler = new input.InputHandler();
            handler.attach(document);
            handler.onDown(input.Key.SPACE, () => {
                this.togglePause();
                return true;
            });
        }

        private makeFullscreen() {
            if (this.canvas.width !== this.canvas.clientWidth) {
                this.canvas.width = this.canvas.clientWidth;
            }
            if (this.canvas.height !== this.canvas.clientHeight) {
                this.canvas.height = this.canvas.clientHeight;
            }
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

        private createIndiciesLines(n, splinesN) {
            var indicies = new Uint16Array((n - 1) * splinesN * 2 * 3 * 2);
            console.assert(indicies.length <= 65535);
            var next = 0;
            var nextId = 0;
            for (var i = 0; i < n - 1; i++) {
                for (var j = 0; j < splinesN; j++) {
                    indicies[next] = nextId;
                    indicies[next + 1] = nextId + 1;

                    indicies[next + 2 ] = nextId + 1 ;
                    indicies[next + 3] = nextId + 2;

                    indicies[next + 4] = nextId + 2;
                    indicies[next + 5] = nextId;

                    next += 6;
                    nextId += 3;
                    indicies[next] = nextId;
                    indicies[next + 1] = nextId + 1;

                    indicies[next + 2 ] = nextId + 1 ;
                    indicies[next + 3] = nextId + 2;

                    indicies[next + 4] = nextId + 2;
                    indicies[next + 5] = nextId;
                    next += 6;
                    nextId += 3;
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

        private createCameraMtx(eye, angleOfView, lookAt) {
            var pMatrix = mat4.perspective(angleOfView, this.canvas.width / this.canvas.height, 0.1, 100.0),
                vMatrix = mat4.lookAt(eye, lookAt, [0, 0, 1]);
            return mat4.multiply(pMatrix, vMatrix);
        }

        private setUniformCameraLight(name, x, y, z, intensity, attenuation, ambient) {
            this.mapShader.uniformF(name + '.position', x, y, z);
            this.mapShader.uniformF(name + '.intensities', intensity, intensity, intensity);
            this.mapShader.uniformF(name + '.attenuation', attenuation);
            this.mapShader.uniformF(name + '.ambientCoefficient', ambient);
        }

        start(songBuffer: AudioBuffer) {
            this.songBuffer = songBuffer;
            this.song = audio.context.createBufferSource();
            this.song.buffer = songBuffer;
            this.song.connect(audio.context.destination);
            this.song.start();
            this.songLastOffset = 0;
            this.timeLastOffset = audio.context.currentTime;
            this.loop();
        }

        private isPaused() {
            return audio.context.state !== 'running';
        }

        private togglePause() {
            if (this.isPaused())
                this.resume();
            else
                this.pause();
        }

        private pause() {
            this.songLastOffset = this.getAbsoluteTime();
            this.timeLastOffset = audio.context.currentTime;
            audio.context.suspend();
        }

        private resume() {
            audio.context.resume();
        }

        private getAbsoluteTime() {
            return audio.context.currentTime - this.timeLastOffset + this.songLastOffset;
        }

        private getRelativeTime() {
            return this.getAbsoluteTime() / this.songBuffer.duration;
        }

        renderMap() {
            var keyPoints = new Float32Array([
                5, 0, 1.1,
                6, 0, 1.5,
                7, 0, 1.1,
                8, 0.1, 1.1,
                9, 0.0, 1.1,
                10, 0.0, 1.1
            ]),
                keyPointCount = keyPoints.length / 3,
                sectorsPoints = map.generateSectionPoints(keyPoints, STRIP_COUNT, TUBE_RADIUS, SECTOR_ANGLE),
                points = this.createPoints(sectorsPoints, keyPointCount, STRIP_COUNT),
                colors = this.createColors(points.length / 3, 0, 1, 0),
                indicies = this.createIndiciesLines(keyPointCount, STRIP_COUNT),
                normals = this.generateNormals(points, indicies);

            this.posBuf.uploadData(points);
            this.normBuf.uploadData(normals);
            this.colBuf.uploadData(colors);
            this.indBuf.uploadData(indicies);

            this.mapShader.vertexAttribute('aNormal', this.normBuf);
            this.mapShader.vertexAttribute('aPosition', this.posBuf);
            this.mapShader.vertexAttribute('aColor', this.colBuf);

            function getAbsPosition(relPosition) {
                var prevPointIdx = Math.floor(relPosition),
                    nextPointIdx = Math.ceil(relPosition),
                    prevPoint = util.pickVec3(keyPoints, prevPointIdx),
                    nextPoint = util.pickVec3(keyPoints, nextPointIdx);
                return vec3.add(prevPoint, vec3.scale(vec3.subtract(nextPoint, prevPoint), relPosition - prevPointIdx));
            }

            var relTime = this.getRelativeTime(),
                relPosition = relTime * keyPointCount,
                absPosition = getAbsPosition(relPosition),
                absTarget = getAbsPosition(Math.min(relPosition + CAM_VIEW_DISTANCE, keyPointCount));

            var offPosition = vec3.scale(vec3.direction(absTarget, absPosition, []), CAM_BACK_OFFSET),
                eye = vec3.add([0, 0, TUBE_RADIUS + CAM_HEIGHT], offPosition),
                lookAt = vec3.add([0, 0, TUBE_RADIUS], absTarget);

            var viewAngleVert = 45;
            this.mapShader.uniformMatrixF('uCameraMtx', this.createCameraMtx(eye, viewAngleVert, lookAt));
            this.mapShader.uniformF('uCameraPosition', eye[0], eye[1], eye[2]);
            this.setUniformCameraLight('uLight', eye[0], eye[1], eye[2], 2.0, 0.1, 0.5);

            gl.enable(gl.DEPTH_TEST);
            gl.clear(gl.DEPTH | gl.COLOR);
            this.mapShader.draw(this.canvas.width, this.canvas.height, gl.LINES, this.indBuf);
        }

        private renderLights() {
            this.lightShader.vertexAttribute('aPosition', this.posBuf);

            var screenCorners = new Float32Array([
                -1, -1, 0,
                -1, 1, 0,
                1, 1, 0,
                1, -1, 0
            ]);
            this.posBuf.uploadData(screenCorners);
            this.indBuf.uploadData(new Uint16Array([0, 1, 2, 0, 2, 3]));

            this.lightShader.vertexAttribute('aPosition', this.posBuf);

            var lightPositions = [
                [-0.5, 0.0],
                [0.5, 0.0]
            ];
            var lightColors = [
                [0, 1, 0],
                [1, 0, 0]
            ];
            for (var i = 0; i < LIGHTS_COUNT; i++) {
                this.lightShader.uniformF('lightPosition[' + i.toString() + ']', lightPositions[i][0], lightPositions[i][1]);
                this.lightShader.uniformF('lightColor[' + i.toString() + ']', lightColors[i][0], lightColors[i][1], lightColors[i][2]);
            }
            this.lightShader.uniformF('uRatio', this.canvas.height/this.canvas.width);
            this.lightShader.uniformF('uTime', this.getAbsoluteTime());

            gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
            gl.enable(gl.BLEND);
            gl.disable(gl.DEPTH_TEST);
            this.lightShader.draw(this.canvas.width, this.canvas.height, gl.TRIANGLES, this.indBuf);
            gl.disable(gl.BLEND);
        }

        private loop() {
            this.makeFullscreen();

            this.renderMap();
            this.renderLights();
            window.requestAnimationFrame(this.loop.bind(this));
        }
    }
}