///<reference path="ui.ts"/>
///<reference path="webgl/gl.ts"/>
///<reference path="glMatrix.d.ts"/>
///<reference path="webgl/map.ts"/>

module game {
    var C_GAME_CANVAS = "game--canvas";
    var LIGHTS_COUNT = 2;
    var FREQS_BINS_COUNT = 6;
    var gl;

    var EYE_SHIFT = 0.2;
    var STRIP_COUNT = 5;
    var TUBE_RADIUS = 10;
    var SECTOR_ANGLE = Math.PI / 2;
    var CAM_HEIGHT = 5;
    var CAM_VIEW_DISTANCE = 10;
    var CAM_BACK_OFFSET = 1;
    var MAX_FACE_TILT = 0.35;
    var MAX_HEAD_SHIFT = 15;
    var ANGLE_ALPHA = 0.1;
    var X_ALPHA = 0.1;
    var STICKING_ALPHA = 0.05;

    function complexNorm(real, imag) {
        return Math.sqrt(real * real + imag * imag);
    }

    export class Game {
        private root:HTMLElement;
        private canvas:HTMLCanvasElement;
        private glContext:webgl.GLContext;

        private mapShader:webgl.Shader;
        private lightShader:webgl.Shader;

        private posBuf:webgl.ArrayBuffer;
        private normBuf:webgl.ArrayBuffer;
        private colBuf:webgl.ArrayBuffer;
        private hackBuf:webgl.ArrayBuffer;
        private indBuf:webgl.ElementArrayBuffer;

        private posRectBuf:webgl.ArrayBuffer;
        private indRectBuf:webgl.ElementArrayBuffer;

        private songBuffer;
        private song;
        private songLastOffset;
        private timeLastOffset;

        private analyser;
        private freqData;
        private freqBins;

        private htracker:headtrackr.Tracker;
        private head:vec3 = [0, 0, 0];
        private faceAngle = 0;

        private keyPoints;

        private anaglyph = false;
        private stereo = false;

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

            var vert = (<HTMLScriptElement> document.getElementById('map_vshader')).text
                .split('FREQ_BINS_COUNT').join(FREQS_BINS_COUNT.toString());
            var frag = (<HTMLScriptElement> document.getElementById('map_fshader')).text
                .split('FREQ_BINS_COUNT').join(FREQS_BINS_COUNT.toString());
            this.mapShader = new webgl.Shader(vert, frag);
            vert = (<HTMLScriptElement> document.getElementById('lights_vshader')).text.split('LIGHTS_COUNT').join(LIGHTS_COUNT.toString())
                .split('FREQ_BINS_COUNT').join(FREQS_BINS_COUNT.toString());
            frag = (<HTMLScriptElement> document.getElementById('lights_fshader')).text.split('LIGHTS_COUNT').join(LIGHTS_COUNT.toString())
                .split('FREQ_BINS_COUNT').join(FREQS_BINS_COUNT.toString());
            this.lightShader = new webgl.Shader(vert, frag);

            this.posBuf = new webgl.ArrayBuffer(3, gl.FLOAT);
            this.normBuf = new webgl.ArrayBuffer(3, gl.FLOAT);
            this.colBuf = new webgl.ArrayBuffer(3, gl.FLOAT);
            this.hackBuf = new webgl.ArrayBuffer(1, gl.FLOAT);
            this.indBuf = new webgl.ElementArrayBuffer();

            this.posRectBuf = new webgl.ArrayBuffer(3, gl.FLOAT);
            this.indRectBuf = new webgl.ElementArrayBuffer();
        }

        private initInputEvents() {
            var handler = new input.InputHandler();
            handler.attach(document);
            handler.onDown(input.Key.SPACE, () => {
                this.togglePause();
                return true;
            });
            handler.onDown(input.Key.A, () => {
                this.anaglyph = !this.anaglyph;
                if (this.anaglyph) {
                    this.stereo = false;
                }
                return true;
            });
            handler.onDown(input.Key.S, () => {
                this.stereo = !this.stereo;
                if (this.stereo) {
                    this.anaglyph = false;
                }
                return true;
            });


            var statusMessages = {
                "whitebalance" : "checking for stability of camera whitebalance",
                "detecting" : "Detecting face",
                "hints" : "Hmm. Detecting the face is taking a long time",
                "redetecting" : "Lost track of face, redetecting",
                "lost" : "Lost track of face",
                "found" : "Tracking face"
            };

            document.addEventListener("headtrackrStatus", (event:any) => {
                if (event.status in statusMessages) {
                    console.log(statusMessages[event.status]);
                }
            }, true);

            document.addEventListener("headtrackingEvent", (event:any) => {
                this.onHeadMoved(event.x, event.y, event.z);
            });

            document.addEventListener("facetrackingEvent", (event:any) => {
                this.onFaceLeaned(event.angle);
            });

            this.htracker = new headtrackr.Tracker({calcAngles : true, ui : false});
            this.htracker.init(ui.$("inputVideo"), ui.$("inputCanvas"));
            this.htracker.start();
        }

        private onHeadMoved(x, y, z) {
            var alpha = X_ALPHA;
            this.head = vec3.add(vec3.scale([x, y, z], alpha), vec3.scale(this.head, 1 - alpha));
        }

        private onFaceLeaned(angle) {
            var alpha = ANGLE_ALPHA;
            angle -= Math.PI / 2;
            this.faceAngle = angle * alpha + this.faceAngle * (1 - alpha);
        }

        private makeFullscreen() {
            if (this.canvas.width !== this.canvas.clientWidth) {
                this.canvas.width = this.canvas.clientWidth;
            }
            if (this.canvas.height !== this.canvas.clientHeight) {
                this.canvas.height = this.canvas.clientHeight;
            }
        }

        private generateHacks(n) {
            var uvs = new Float32Array(n);
            for(var i =0; 6 * i < n; i++) {
                uvs[i * 6] = 1;
                uvs[i * 6 + 1] = -1;
                uvs[i * 6 + 2] = 1;
                uvs[i * 6 + 3] = -1;
                uvs[i * 6 + 4] = 1;
                uvs[i * 6 + 5] = -1;
            }
            return uvs;
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

        private createCameraMtx(eye, angleOfView, lookAt, eyeShift) {
            var pMatrix = mat4.perspective(angleOfView, this.canvas.width / this.canvas.height, 0.1, 300.0),
                vMatrix = mat4.lookAt(eye, lookAt, [0, 0, 1]);
            var shift = mat4.create();
            mat4.identity(shift);
            shift = mat4.translate(shift, [eyeShift, 0, 0]);
            vMatrix = mat4.multiply(shift, vMatrix);
            return mat4.multiply(pMatrix, vMatrix);
        }

        private setUniformCameraLight(name, x, y, z, intensity, attenuation, ambient) {
            this.mapShader.uniformF(name + '.position', x, y, z);
            this.mapShader.uniformF(name + '.intensities', intensity, intensity, intensity);
            this.mapShader.uniformF(name + '.attenuation', attenuation);
            this.mapShader.uniformF(name + '.ambientCoefficient', ambient);
        }

        private preprocessSong (buffer) {
            var W_SIZE = 1024 * 4;
            var STEP = 0.1;
            var MAX_THRESH = 0.7;
            var STANDART_V = 1;
            var T = 0.1;

            var channelData = buffer.getChannelData(0);
            var frames_step = STEP * buffer.sampleRate | 0;

            var fft_buffer = new Float32Array(W_SIZE * 2);

            this.keyPoints = [0, 0, 0];
            var last_point : vec3 = [0, 0, 0];

            for (var i = frames_step, time = 0; i + W_SIZE < channelData.length; i += frames_step, time++) {
                for (var j = -W_SIZE; j < W_SIZE; j++)
                    fft_buffer[W_SIZE + j] = channelData[j + i];
                var complex = new complex_array.ComplexArray(fft_buffer);
                complex.FFT();

                var low = 0, high = 0;
                complex.map(function(value, i, n) {
                    if (i * 5 < n || i * 5 > 4 * n) {
                        low += complexNorm(value.real, value.imag);
                    }
                    else {
                        high += complexNorm(value.real, value.imag);
                    }
                });

                low /= 150;
                high /= 70;

                console.log(low + " " + high);
                var delta : vec3 = [1, Math.cos(T * (time + high)), T * T * T * time + high - 0.5];
                delta = vec3.scale(delta, (STANDART_V + low));
                last_point = vec3.add(last_point, delta);

                this.keyPoints.push(last_point[0])
                this.keyPoints.push(last_point[1])
                this.keyPoints.push(last_point[2])
            }

            console.log("!!!! " + this.keyPoints.length);
        }

        start(songBuffer: AudioBuffer) {
            this.songBuffer = songBuffer;
            this.song = audio.context.createBufferSource();

            this.preprocessSong(songBuffer);

            this.song.buffer = songBuffer;
            this.analyser = audio.context.createAnalyser();
            this.analyser.fftSize = 64;
            this.analyser.smoothingTimeConstant = 0.8;
            this.song.connect(this.analyser);
            this.analyser.connect(audio.context.destination);
            this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
            this.freqBins = new Uint8Array(FREQS_BINS_COUNT);
            this.song.start();
            this.songLastOffset = 0;
            this.timeLastOffset = audio.context.currentTime;
            this.uploadMapBufs();
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

        private getShipTilt() {
            var signA = this.faceAngle < 0 ? -1 : 1,
               absA = Math.abs(this.faceAngle);
            var faceLean = (signA * Math.min(absA, MAX_FACE_TILT) + MAX_FACE_TILT) /
                    (2 * MAX_FACE_TILT);

            var signX = this.head[0] < 0 ? -1 : 1,
               absX = Math.abs(this.head[0]);
            var headShift = (-signX * Math.min(absX, MAX_HEAD_SHIFT) + MAX_HEAD_SHIFT) /
                    (2 * MAX_HEAD_SHIFT);

            var p = (2 * faceLean + 3 * headShift) / 5;

            return this.solveAngle(p);
        }

        private solveAngle(p) {
            var a = SECTOR_ANGLE * 2.5 / STRIP_COUNT;
            var b = 1 / (2 * a);
            var alpha = STICKING_ALPHA;

            var A = a * alpha / Math.PI;
            var B = b;
            var C = p - 0.5;
            var w = 5 * Math.PI / a;

            var l = -a;
            var r = a;
            var it = 0;
            while (it < 100 && r - l > Math.PI / 500) {
                var x = (l + r) / 2;
                var y = A * Math.sin(w * x) + B * x;
                if (y < C) {
                    l = x;
                } else {
                    r = x;
                }
            }


            console.log(x);
            return x;
        }

        private uploadMapBufs() {
            var keyPointCount = this.keyPoints.length / 3,
                sectorsPoints = map.generateSectionPoints(this.keyPoints, STRIP_COUNT, TUBE_RADIUS, SECTOR_ANGLE),
                points = this.createPoints(sectorsPoints, keyPointCount, STRIP_COUNT),
                colors = this.createColors(points.length / 3, 0.8, 0, 0.7),
                indicies = this.createIndicies(keyPointCount, STRIP_COUNT),
                hacks = this.generateHacks(points.length / 3);

            this.posBuf.uploadData(points);
            this.colBuf.uploadData(colors);
            this.hackBuf.uploadData(hacks);
            this.indBuf.uploadData(indicies);
        }

        private renderMap() {
            this.mapShader.vertexAttribute('aPosition', this.posBuf);
            this.mapShader.vertexAttribute('aColor', this.colBuf);
            this.mapShader.vertexAttribute('aHack', this.hackBuf);

            var getAbsPosition = (relPosition) => {
                var prevPointIdx = Math.floor(relPosition),
                    nextPointIdx = Math.ceil(relPosition),
                    prevPoint = util.pickVec3(this.keyPoints, prevPointIdx),
                    nextPoint = util.pickVec3(this.keyPoints, nextPointIdx);
                return vec3.add(prevPoint, vec3.scale(vec3.subtract(nextPoint, prevPoint), relPosition - prevPointIdx));
            };

            var keyPointsCount = this.keyPoints.length / 3,
                relTime = this.getRelativeTime(),
                relPosition = relTime * keyPointsCount;
            var relTime = this.getRelativeTime(),
                relPosition = relTime * this.keyPoints.length / 3,
                absPosition = getAbsPosition(relPosition),
                absTarget = getAbsPosition(Math.min(relPosition + CAM_VIEW_DISTANCE, keyPointsCount)),
                look = vec3.direction(absPosition, absTarget, []),
                up = vec3.cross(look, vec3.cross([0, 0, 1], look), []),
                tilt = mat4.rotate(mat4.identity([]), this.getShipTilt(), look),
                offPosition = vec3.subtract(absPosition, vec3.scale(look, CAM_BACK_OFFSET)),
                eye = vec3.add(mat4.multiplyVec3(tilt, vec3.scale(up, TUBE_RADIUS + CAM_HEIGHT, [])), offPosition),
                lookAt = vec3.add(mat4.multiplyVec3(tilt, vec3.scale(up, TUBE_RADIUS, [])), absTarget);
                absTarget = getAbsPosition(Math.min(relPosition + CAM_VIEW_DISTANCE, this.keyPoints.length / 3));

            var viewAngleVert = 45;
            this.mapShader.uniformF('uCameraPosition', eye[0], eye[1], eye[2]);
            this.setUniformCameraLight('uLight', eye[0], eye[1], eye[2], 2.0, 0.1, 0.5);

            for (var i = 0; i < FREQS_BINS_COUNT; i++) {
                this.mapShader.uniformF('uFreqBins[' + i.toString() + ']', this.freqBins[i]/255.0);
            }
            this.mapShader.uniformF('uTime', this.getAbsoluteTime());

            if (this.anaglyph) {
                gl.enable(gl.DEPTH_TEST);
                gl.clear(gl.DEPTH | gl.COLOR);
                this.mapShader.uniformMatrixF('uCameraMtx', this.createCameraMtx(eye, viewAngleVert, lookAt, -EYE_SHIFT));
                gl.colorMask(1, 0, 0, 0);
                this.mapShader.draw(this.canvas.width, this.canvas.height, gl.TRIANGLES, this.indBuf);
                this.mapShader.uniformMatrixF('uCameraMtx', this.createCameraMtx(eye, viewAngleVert, lookAt, EYE_SHIFT));
                gl.colorMask(0, 1, 1, 1);
                gl.clear(gl.DEPTH_BUFFER_BIT);
                this.mapShader.draw(this.canvas.width, this.canvas.height, gl.TRIANGLES, this.indBuf);
                gl.colorMask(1, 1, 1, 1);
            } else if (this.stereo) {
                gl.enable(gl.DEPTH_TEST);
                gl.clear(gl.DEPTH | gl.COLOR);
                this.mapShader.uniformMatrixF('uCameraMtx', this.createCameraMtx(eye, viewAngleVert, lookAt, -EYE_SHIFT));
                this.mapShader.draw(this.canvas.width/2, this.canvas.height, gl.TRIANGLES, this.indBuf, 0);
                this.mapShader.uniformMatrixF('uCameraMtx', this.createCameraMtx(eye, viewAngleVert, lookAt, EYE_SHIFT));
                this.mapShader.draw(this.canvas.width/2, this.canvas.height, gl.TRIANGLES, this.indBuf, this.canvas.width/2);
            } else {
                this.mapShader.uniformMatrixF('uCameraMtx', this.createCameraMtx(eye, viewAngleVert, lookAt, 0));
                gl.enable(gl.DEPTH_TEST);
                gl.clear(gl.DEPTH | gl.COLOR);
                this.mapShader.draw(this.canvas.width, this.canvas.height, gl.TRIANGLES, this.indBuf);
            }
        }

        private renderLights() {
            this.lightShader.vertexAttribute('aPosition', this.posRectBuf);

            var screenCorners = new Float32Array([
                -1, -1, 0,
                -1, 1, 0,
                1, 1, 0,
                1, -1, 0
            ]);
            this.posRectBuf.uploadData(screenCorners);
            this.indRectBuf.uploadData(new Uint16Array([0, 1, 2, 0, 2, 3]));

            this.lightShader.vertexAttribute('aPosition', this.posRectBuf);

            var lightPositions = [
                [-0.5, 0.0],
                [0.5, 0.0]
            ];
            var lightColors = [
                [0, 1, 0],
                [1, 0, 0]
            ];
            for (var i = 0; i < LIGHTS_COUNT; i++) {
                this.lightShader.uniformF('uLightPosition[' + i.toString() + ']', lightPositions[i][0], lightPositions[i][1]);
                this.lightShader.uniformF('uLightColor[' + i.toString() + ']', lightColors[i][0], lightColors[i][1], lightColors[i][2]);
            }
            for (var i = 0; i < FREQS_BINS_COUNT; i++) {
                this.lightShader.uniformF('uFreqBins[' + i.toString() + ']', this.freqBins[i]/255.0);
            }
            this.lightShader.uniformF('uRatio', this.canvas.height/this.canvas.width);
            this.lightShader.uniformF('uTime', this.getAbsoluteTime());

            gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
            gl.enable(gl.BLEND);
            gl.disable(gl.DEPTH_TEST);
            this.lightShader.draw(this.canvas.width, this.canvas.height, gl.TRIANGLES, this.indRectBuf);
            gl.disable(gl.BLEND);
        }

        private getFreqs() {
            this.analyser.getByteFrequencyData(this.freqData);
            for (var i = 0; i < FREQS_BINS_COUNT; i++) {
                var from = Math.floor(this.freqData.length * i / FREQS_BINS_COUNT);
                var to = Math.floor(this.freqData.length * (i + 1) / FREQS_BINS_COUNT);
                var freq = 0;
                for (var j = from; j < to; j++) {
                    freq = Math.max(freq, this.freqData[j]);
                }
                this.freqBins[i] = freq;
            }
        }

        private loop() {
            this.makeFullscreen();

            this.getFreqs();

            this.renderMap();
            //this.renderLights();
            window.requestAnimationFrame(this.loop.bind(this));
        }
    }
}