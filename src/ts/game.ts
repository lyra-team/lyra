///<reference path="ui.ts"/>
///<reference path="webgl/gl.ts"/>
///<reference path="glMatrix.d.ts"/>
///<reference path="webgl/map.ts"/>

module game {
    var C_GAME_STARTED = "game-started",
        C_GAME_CANVAS = "game--canvas",
        C_GAME_SCORE = "game--score",
        C_GAME_SCORE_CHANGED = "game--score-changed";
    var LIGHTS_COUNT = 2;
    var FREQS_BINS_COUNT = 6;
    var gl;

    var EYE_SHIFT = 0.2;
    var STRIP_COUNT = 5;
    var TUBE_RADIUS = 20;
    var SECTOR_ANGLE = Math.PI / 4;
    var CAM_HEIGHT = 5;
    var CAM_VIEW_DISTANCE = 20;
    var CAM_TARGET_HEIGHT = 3;
    var CAM_BACK_OFFSET = 10;
    var TILT_STEP = 0.03;

    var BLOCK_SCORE = 239;

    function complexNorm(real, imag) {
        return Math.sqrt(real * real + imag * imag);
    }

    function isMaximum (prev, current, thresh) {
        if (prev.length == 0)
            return false;

        var cnt = 0
        for (var i = 0; i < prev.length; i++) {
            if (complexNorm(prev.real[i], prev.imag[i]) < complexNorm(current.real[i], current.imag[i]))
                cnt++;
        }

        //console.log(cnt + " " + current.length + " " + current.length * thresh);

        return cnt >= current.length * thresh;
    }

    export class Game {
        private root:HTMLElement;
        private canvas:HTMLCanvasElement;
        private scoreEl:HTMLElement;
        private glContext:webgl.GLContext;

        private mapShader:webgl.Shader;
        private lightShader:webgl.Shader;
        private backgroundShader:webgl.Shader;
        private planeShader: webgl.Shader;
        private blocksShader: webgl.Shader;

        private posBuf:webgl.ArrayBuffer;
        private normBuf:webgl.ArrayBuffer;
        private colBuf:webgl.ArrayBuffer;
        private hackBuf:webgl.ArrayBuffer;
        private indBuf:webgl.ElementArrayBuffer;

        private blockPosBuf:webgl.ArrayBuffer;
        private blockNormBuf:webgl.ArrayBuffer;
        private blockColBuf:webgl.ArrayBuffer;
        private blockIndBuf:webgl.ElementArrayBuffer;

        private planePosBuf: webgl.ArrayBuffer;
        private planeNormBuf: webgl.ArrayBuffer;
        private planeColorBuf: webgl.ArrayBuffer;
        private planeIndBuf: webgl.ElementArrayBuffer;

        private posRectBuf:webgl.ArrayBuffer;
        private indRectBuf:webgl.ElementArrayBuffer;

        private songBuffer;
        private song;
        private songLastOffset;
        private timeLastOffset;

        private analyser;
        private freqData;
        private freqBins;

        private tiltAngle = 0;

        private planeModel;
        private eye;
        private lookAt;
        private viewAngleVert = 45;

        private keyPoints;
        private sectorsPoints;
        private blockPositions;

        // Buffer data for map
        private keyPointCountB;
        private pointsB;
        private colorsB;
        private indiciesB;
        private hacksB;

        // Bufer data for blocks
        private keyPointCountBB;
        private blockPointsBB;
        private pointsBB;
        private colorsBB;
        private indiciesBB;
        private normalsBB;

        private nextBlockIndex = 0;
        private blocksWereUpdated = false;

        private lastBufsUpdatedT = 0;

        private anaglyph = false;
        private stereo = false;

        private score = 0;

        constructor(rootId) {
            this.root = ui.$(rootId);
            this.canvas = ui.$$<HTMLCanvasElement>("." + C_GAME_CANVAS, this.root);
            this.scoreEl = ui.$$("." + C_GAME_SCORE, this.root);

            this.initWebGL();
            this.initInputEvents();
        }

        private initWebGL() {
            this.glContext = new webgl.GLContext(this.canvas);
            this.glContext.activate();
            gl = webgl.gl;

            var vert = (<HTMLScriptElement> ui.$('map_vshader')).text
                .split('FREQ_BINS_COUNT').join(FREQS_BINS_COUNT.toString());
            var frag = (<HTMLScriptElement> ui.$('map_fshader')).text
                .split('FREQ_BINS_COUNT').join(FREQS_BINS_COUNT.toString());
            this.mapShader = new webgl.Shader(vert, frag);

            vert = (<HTMLScriptElement> document.getElementById('lights_vshader')).text.split('LIGHTS_COUNT').join(LIGHTS_COUNT.toString())
                .split('FREQ_BINS_COUNT').join(FREQS_BINS_COUNT.toString());
            frag = (<HTMLScriptElement> document.getElementById('lights_fshader')).text.split('LIGHTS_COUNT').join(LIGHTS_COUNT.toString())
                .split('FREQ_BINS_COUNT').join(FREQS_BINS_COUNT.toString());
            this.lightShader = new webgl.Shader(vert, frag);

            vert = (<HTMLScriptElement> document.getElementById('background_vshader')).text.split('FREQ_BINS_COUNT').join(FREQS_BINS_COUNT.toString());
            frag = (<HTMLScriptElement> document.getElementById('background_fshader')).text.split('FREQ_BINS_COUNT').join(FREQS_BINS_COUNT.toString());
            this.backgroundShader = new webgl.Shader(vert, frag);

            vert = (<HTMLScriptElement> ui.$('plane_vshader')).text;
            frag = (<HTMLScriptElement> ui.$('plane_fshader')).text;
            this.planeShader = new webgl.Shader(vert, frag);

            vert = (<HTMLScriptElement> ui.$('blocks_vshader')).text;
            frag = (<HTMLScriptElement> ui.$('blocks_fshader')).text;
            this.blocksShader = new webgl.Shader(vert, frag);

            this.posBuf = new webgl.ArrayBuffer(3, gl.FLOAT);
            this.normBuf = new webgl.ArrayBuffer(3, gl.FLOAT);
            this.colBuf = new webgl.ArrayBuffer(3, gl.FLOAT);
            this.hackBuf = new webgl.ArrayBuffer(1, gl.FLOAT);
            this.indBuf = new webgl.ElementArrayBuffer();

            this.blockPosBuf = new webgl.ArrayBuffer(3, gl.FLOAT);
            this.blockNormBuf = new webgl.ArrayBuffer(3, gl.FLOAT);
            this.blockColBuf = new webgl.ArrayBuffer(3, gl.FLOAT);
            this.blockIndBuf = new webgl.ElementArrayBuffer();

            this.posRectBuf = new webgl.ArrayBuffer(3, gl.FLOAT);
            this.indRectBuf = new webgl.ElementArrayBuffer();

            this.planePosBuf = new webgl.ArrayBuffer(3, gl.FLOAT);
            this.planeColorBuf = new webgl.ArrayBuffer(3, gl.FLOAT);
            this.planeNormBuf = new webgl.ArrayBuffer(3, gl.FLOAT);
            this.planeIndBuf = new webgl.ElementArrayBuffer();
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
            handler.onDown(input.Key.Z, () => {
                EYE_SHIFT /= 1.1;
                console.info(EYE_SHIFT);
                return true;
            });
            handler.onDown(input.Key.X, () => {
                EYE_SHIFT *= 1.1;
                console.info(EYE_SHIFT);
                return true;
            });
            handler.whileDown(input.Key.RIGHT_ARROW, () => {
                this.tiltAngle = Math.max(-SECTOR_ANGLE / 2, this.tiltAngle - TILT_STEP);
                return true;
            });
            handler.whileDown(input.Key.LEFT_ARROW, () => {
                this.tiltAngle = Math.min(SECTOR_ANGLE / 2, this.tiltAngle + TILT_STEP);
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

        private createBlockPoints(points) {
            var boxes = points.length / (8*3);
            var res = new Float32Array(boxes * 6 * 2 * 3 * 3);
            var ids = [
                0, 1, 3, 2, 3, 1,
                0, 3, 7, 0, 7, 4,
                1, 5, 6, 1, 6, 2,
                0, 5, 1, 0, 4, 5,
                3, 2, 6, 3, 6, 7,
                4, 7, 5, 5, 7, 6
            ];
            for (var i = 0; i < boxes; i++) {
                for(var j = 0; j < 6 * 6; j++) {
                    for (var k = 0; k < 3; k++) {
                        res[i * 6 * 6 * 3 + j * 3 + k] = points[i * 8 * 3 + ids[j] * 3 + k];
                    }
                }
            }
            return res;
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
            var indicies = new Uint32Array((n - 1) * splinesN * 2 * 3);
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

        private createBlockIndicies(n) {
            var indicies = new Uint32Array(n);
            for (var i = 0; i < n - 1; i++) {
                indicies[i] = i;
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
                var a = util.pickVec3(points, i * 3);
                var b = util.pickVec3(points, i * 3 + 1);
                var c = util.pickVec3(points, i * 3 + 2);
                var ab = vec3.subtract(b, a, []);
                var ac = vec3.subtract(c, a, []);
                var normal = vec3.normalize(vec3.cross(ab, ac, []));
                util.putVec3(normals, 3 * i, normal);
                util.putVec3(normals, 3 * i + 1, normal);
                util.putVec3(normals, 3 * i + 2, normal);
            }
            return normals;
        }

        private createCameraMtx(ratio_wh, eye, angleOfView, lookAt, eyeShift) {
            var pMatrix = mat4.perspective(angleOfView, ratio_wh, 0.1, 300.0),
                vMatrix = mat4.lookAt(eye, lookAt, [0, 0, 1]);
            var shift = mat4.create();
            mat4.identity(shift);
            shift = mat4.translate(shift, [eyeShift, 0, 0]);
            vMatrix = mat4.multiply(shift, vMatrix);
            return mat4.multiply(pMatrix, vMatrix);
        }

        private setUniformCameraLight(shader, name, x, y, z, intensity, attenuation, ambient) {
            shader.uniformF(name + '.position', x, y, z);
            shader.uniformF(name + '.intensities', intensity, intensity, intensity);
            shader.uniformF(name + '.attenuation', attenuation);
            shader.uniformF(name + '.ambientCoefficient', ambient);
        }

        private preprocessSong (buffer) {
            var W_SIZE = 1024 * 4;
            var STEP = 0.05;
            var STEP_CORRECTION = 20 * STEP;
            var MAX_THRESH = 0.7;
            var STANDART_V = 0.1;
            var STANDARD_LOW = 5;
            var STANDARD_HIGH = 4;
            var T = 0.5;
            var Z = 0.5;
            var Y = 1;
            var ALPHA = 0.3;
            var THRESH = 0.6;

            var channelData = buffer.getChannelData(0);
            var frames_step = STEP * buffer.sampleRate | 0;

            var fft_buffer = new Float32Array(W_SIZE * 2);

            this.keyPoints = [0, 0, 0];
            var last_point : vec3 = [0, 0, 0];
            var all_low = [], all_high = [];
            var magnitudes = [];

            var prev_complex = new complex_array.ComplexArray(0);
            for (var i = Math.max(frames_step, W_SIZE), time = 0; i + W_SIZE < channelData.length; i += frames_step, time += STEP) {
                for (var j = -W_SIZE; j < W_SIZE; j++)
                    fft_buffer[W_SIZE + j] = channelData[j + i];
                var complex = new complex_array.ComplexArray(fft_buffer);
                complex.FFT();

                magnitudes.push(false);
                if (isMaximum(prev_complex, complex, THRESH)) {
                    magnitudes[magnitudes.length - 2] = false;
                    magnitudes[magnitudes.length - 1] = true;
                }

                var low = 0, high = 0;
                complex.map(function (value, i, n) {
                    if (i * 5 < n || i * 5 > 4 * n) {
                        low += complexNorm(value.real, value.imag);
                    }
                    else {
                        high += complexNorm(value.real, value.imag);
                    }
                });

                all_low.push(low);
                all_high.push(high);
                prev_complex = complex;
            }

            this.blockPositions = [];
            magnitudes.map(function(value, i, n) {
                if (value == true) {
                    this.blockPositions.push([i, Math.floor(Math.random() * STRIP_COUNT)]);
                }
            }, this);

            console.log('magnitudes', magnitudes);
            // console.log(this.blockPositions.length);

            var max_low = Math.max.apply(Math, all_low);
            var max_high = Math.max.apply(Math, all_high);

            console.log(max_low, max_high);

            var current_low = 0;
            var current_high = 0;
            for (var i = 0; i < all_low.length; i++) {
                var low = all_low[i] / max_low * STANDARD_LOW;
                var high = all_high[i] / max_high * STANDARD_HIGH;
                var time = i * STEP;

                current_low = ALPHA * current_low + (1 - ALPHA) * low;
                current_high = ALPHA * current_high + (1 - ALPHA) * low;

                var delta : vec3 = [1, Y * Math.cos(T * (time/* + high*/)), Z * (-2 - 0.2 * low + high )];
                delta = vec3.scale(delta, (STANDART_V + low) * STEP_CORRECTION);
                last_point = vec3.add(last_point, delta);

                this.keyPoints.push(last_point[0])
                this.keyPoints.push(last_point[1])
                this.keyPoints.push(last_point[2])
            }

            console.log('keyPoints', this.keyPoints.length);
        }

        start(songBuffer: AudioBuffer) {
            this.songBuffer = songBuffer;
            this.song = audio.context.createBufferSource();

            ui.$('loadOverlay').classList.add('overlay-visible');
            setTimeout(() => {
                this.preprocessSong(songBuffer);
                ui.$('loadOverlay').classList.remove('overlay-visible');
                this.root.classList.add(C_GAME_STARTED);

                this.eye = [0, 0, 0];
                this.lookAt = [0, 0, 0];

                this.song.buffer = songBuffer;
                this.analyser = audio.context.createAnalyser();
                this.analyser.fftSize = 64;
                this.analyser.smoothingTimeConstant = 0.85;
                this.song.connect(this.analyser);
                this.analyser.connect(audio.context.destination);
                this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
                this.freqBins = new Uint8Array(FREQS_BINS_COUNT);
                this.song.start();
                this.songLastOffset = 0;
                this.timeLastOffset = audio.context.currentTime;
                this.createDataForBufs();
                this.loop();
            }, 100);
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

        private getShipStripNumber() {
            var relativeAngle = this.getShipTilt() - (-SECTOR_ANGLE / 2);
            return this.clamp(Math.floor((relativeAngle / SECTOR_ANGLE) * STRIP_COUNT), 0, STRIP_COUNT - 1);
        }

        private getShipTilt() {
            return this.tiltAngle;
        }

        private createDataForBufs() {
            // For map:
            this.keyPointCountB = this.keyPoints.length / 3;
            this.sectorsPoints = map.generateSectionPoints(this.keyPoints, STRIP_COUNT, TUBE_RADIUS, SECTOR_ANGLE);
            this.pointsB = this.createPoints(this.sectorsPoints, this.keyPointCountB, STRIP_COUNT);
            this.colorsB = this.createColors(this.pointsB.length / 3, 0.8, 0, 0.7);
            this.indiciesB = this.createIndicies(this.keyPointCountB, STRIP_COUNT);
            this.hacksB = this.generateHacks(this.pointsB.length / 3);

            // For blocks:
            this.keyPointCountBB = this.keyPoints.length / 3;
            this.blockPointsBB = map.generateBlocks(this.sectorsPoints, this.blockPositions, STRIP_COUNT, [1.0, 1.0, 1.0]);
            this.pointsBB = this.createBlockPoints(this.blockPointsBB);
            this.colorsBB = this.createColors(this.pointsBB.length / 3, 0.2, 0.2, 1.0);
            this.indiciesBB = this.createBlockIndicies(this.pointsBB.length / 3);
            this.normalsBB = this.generateNormals(this.pointsBB, this.indiciesBB);
        }

        private isBlockNotCatched(i) {
            return Math.round(this.colorsBB[i*3]*10) == 2 &&  Math.round(this.colorsBB[i*3+1]*10) == 2 &&  Math.round(this.colorsBB[i*3+2]*10) == 10;
        }

        private uploadMapBufs(from, to) {
            var points =this.pointsB,
                colors =this.colorsB,
                indicies =this.indiciesB,
                hacks = this.hacksB;

            var mini = indicies[from*3];
            var maxi = indicies[from*3];
            for(var i = from; i < to; i++) {
                mini = Math.min(mini, indicies[i*3], indicies[i*3+1], indicies[i*3+2]);
                maxi = Math.max(maxi, indicies[i*3], indicies[i*3+1], indicies[i*3+2]);
            }

            var n = maxi-mini+1;
            var points_part = new Float32Array(3*n),
                colors_part = new Float32Array(3*n),
                hacks_part = new Float32Array(n),
                indicies_part = new Uint16Array(3*(to-from));

            for (i = mini; i <= maxi; i++) {
                var i_part = i-mini;
                for (var j = 0; j < 3; j++) {
                    points_part[i_part*3+j] = points[i*3+j];
                    colors_part[i_part*3+j] = colors[i*3+j];
                }
                hacks_part[i_part] = hacks[i];
            }
            for (i = 0; i < 3*(to-from); i++) {
                indicies_part[i] = indicies[3*from + i] - mini;
            }

            points = points_part;
            colors = colors_part;
            hacks = hacks_part;
            indicies = indicies_part;

            console.assert(indicies.length <= 65535);

            this.posBuf.uploadData(points);//3
            this.colBuf.uploadData(colors);//3
            this.hackBuf.uploadData(hacks);//1
            this.indBuf.uploadData(indicies);//indicies

            var planePos = new Float32Array([
                -1, 1, 0,
                1, 0, 0,
                -0.8, 0, 1,
                -1, -1, 0
            ]);
            this.planePosBuf.uploadData(planePos);
            this.planeColorBuf.uploadData(new Float32Array([
                1, 1, 1,
                1, 1, 1,
                1, 1, 1,
                1, 1, 1
            ]));
            var planeInd = new Uint16Array([
                0, 1, 2,
                3, 2, 1
            ]);
            this.planeIndBuf.uploadData(planeInd);
            this.planeNormBuf.uploadData(this.generateNormals(planePos, planeInd));
        }

        private uploadBlockBufs(from, to) {
            var points = this.pointsBB,
                colors = this.colorsBB,
                indicies = this.indiciesBB,
                normals = this.normalsBB;

            var mini = indicies[from*3];
            var maxi = indicies[from*3];
            for(var i = from; i < to; i++) {
                mini = Math.min(mini, indicies[i*3], indicies[i*3+1], indicies[i*3+2]);
                maxi = Math.max(maxi, indicies[i*3], indicies[i*3+1], indicies[i*3+2]);
            }

            var n = maxi-mini+1;
            var points_part = new Float32Array(3*n),
                colors_part = new Float32Array(3*n),
                normals_part = new Float32Array(3*n),
                indicies_part = new Uint16Array(3*(to-from));

            for (i = mini; i <= maxi; i++) {
                var i_part = i-mini;
                for (var j = 0; j < 3; j++) {
                    points_part[i_part*3+j] = points[i*3+j];
                    colors_part[i_part*3+j] = colors[i*3+j];
                    normals_part[i_part*3+j] = normals[i*3+j];
                }
            }
            for (i = 0; i < 3*(to-from); i++) {
                indicies_part[i] = indicies[3*from + i] - mini;
            }

            points = points_part;
            colors = colors_part;
            normals = normals_part;
            indicies = indicies_part;

            console.assert(indicies.length <= 65535);

            this.blockPosBuf.uploadData(points);//3
            this.blockColBuf.uploadData(colors);//3
            this.blockNormBuf.uploadData(normals);//3
            this.blockIndBuf.uploadData(indicies);//indicies
        }

        private initCamera() {
            var keyPointsCount = this.keyPoints.length / 3,
                relTime = this.getRelativeTime(),
                relPosition = relTime * keyPointsCount;

            var getAbsPosition = (relPosition): any => {
                relPosition = Math.max(0, Math.min(relPosition, keyPointsCount));
                var prevPointIdx = Math.floor(relPosition),
                    nextPointIdx = Math.min(prevPointIdx + 1, keyPointsCount),
                    prevPoint = util.pickVec3(this.keyPoints, prevPointIdx),
                    nextPoint = util.pickVec3(this.keyPoints, nextPointIdx);
                return vec3.add(prevPoint, vec3.scale(vec3.subtract(nextPoint, prevPoint), relPosition - prevPointIdx));
            };

            var getAbsPositionAndUp = (relPosition): any => {
                var past = getAbsPosition(relPosition - 0.5),
                    present = getAbsPosition(relPosition),
                    future = getAbsPosition(relPosition + 0.5),
                    guide = vec3.direction(past, future, []),
                    up = vec3.normalize(vec3.cross(guide, vec3.cross([0, 0, 1], guide), []));
                return {
                    pos: present,
                    up: up,
                    guide: guide
                };
            };

            var relTime = this.getRelativeTime(),
                relPosition = relTime * keyPointsCount,
                absPosition = getAbsPositionAndUp(relPosition);
            var l = relPosition, r = keyPointsCount;
            while (r - l > 1e-6) {
                var m = (r + l) / 2;
                var dist = vec3.length(vec3.subtract(getAbsPosition(m), absPosition.pos));
                if (dist > CAM_VIEW_DISTANCE)
                    r = m;
                else
                    l = m;
            }
            var absTarget = getAbsPositionAndUp((l + r) / 2);

            var look = vec3.direction(absTarget.pos, absPosition.pos, []),
                tilt = mat4.rotate(mat4.identity([]), this.getShipTilt(), absPosition.guide),
                offPosition = vec3.subtract(absPosition.pos, vec3.scale(look, CAM_BACK_OFFSET, []), []);

            var eye_ALPHA = 0.2;
            var lookAt_ALPHA = 0.3;

            var eye = vec3.add(mat4.multiplyVec3(tilt, vec3.scale(absPosition.up, TUBE_RADIUS + CAM_HEIGHT, [])), offPosition);
            var lookAt = vec3.add(vec3.scale(absTarget.up, TUBE_RADIUS + CAM_TARGET_HEIGHT, []), absTarget.pos);

            // this.eye = vec3.add(mat4.multiplyVec3(tilt, vec3.scale(absPosition.up, TUBE_RADIUS + CAM_HEIGHT, [])), absPosition.pos);
            // this.lookAt = vec3.add(vec3.scale(absTarget.up, TUBE_RADIUS + CAM_TARGET_HEIGHT, []), absTarget.pos);

            this.eye = vec3.add(vec3.scale(eye, eye_ALPHA), vec3.scale(this.eye, 1 - eye_ALPHA), []);
            this.lookAt = vec3.add(vec3.scale(lookAt, lookAt_ALPHA), vec3.scale(this.lookAt, 1 - lookAt_ALPHA), []);
            var planePos = vec3.add(mat4.multiplyVec3(tilt, vec3.scale(absPosition.up, TUBE_RADIUS + 1, [])), absPosition.pos);
            var axis = vec3.cross(vec3.direction(this.lookAt, this.eye, []), [1, 0, 0]);
            this.planeModel = mat4.identity(mat4.create());
            mat4.translate(this.planeModel, planePos);
            mat4.rotate(this.planeModel, -Math.asin(vec3.length(axis)), axis);
        }

        private renderBackground() {
            this.backgroundShader.vertexAttribute('aPosition', this.posRectBuf);

            var screenCorners = new Float32Array([
                -1, -1, 0,
                -1, 1, 0,
                1, 1, 0,
                1, -1, 0
            ]);
            this.posRectBuf.uploadData(screenCorners);
            this.indRectBuf.uploadData(new Uint16Array([0, 1, 2, 0, 2, 3]));

            this.backgroundShader.vertexAttribute('aPosition', this.posRectBuf);

            for (var i = 0; i < FREQS_BINS_COUNT; i++) {
                this.backgroundShader.uniformF('uFreqBins[' + i.toString() + ']', this.freqBins[i]/255.0);
            }
            this.backgroundShader.uniformF('uRatio', this.canvas.height/this.canvas.width);
            this.backgroundShader.uniformF('uTime', this.getAbsoluteTime());
            var cameraMtx = this.createCameraMtx(this.canvas.width/this.canvas.height, this.eye, this.viewAngleVert, this.lookAt, 0);
            var center = mat4.multiplyVec3(cameraMtx, [1000000000.0, 0.0, 0.0]);
            var x = center[0] / center[2];
            var y = center[1] / center[2];
            this.backgroundShader.uniformF('uCenter', x, y);

            gl.disable(gl.DEPTH_TEST);
            if (this.stereo) {
                this.backgroundShader.draw(this.canvas.width/2, this.canvas.height, gl.TRIANGLES, this.indRectBuf, 0);
                this.backgroundShader.draw(this.canvas.width/2, this.canvas.height, gl.TRIANGLES, this.indRectBuf, this.canvas.width/2);
            } else {
                this.backgroundShader.draw(this.canvas.width, this.canvas.height, gl.TRIANGLES, this.indRectBuf);
            }
        }

        private renderMap() {
            this.mapShader.vertexAttribute('aPosition', this.posBuf);
            this.mapShader.vertexAttribute('aColor', this.colBuf);
            this.mapShader.vertexAttribute('aHack', this.hackBuf);

            this.mapShader.uniformF('uCameraPosition', this.eye[0], this.eye[1], this.eye[2]);
            this.setUniformCameraLight(this.mapShader, 'uLight', this.eye[0], this.eye[1], this.eye[2], 2.0, 0.1, 0.5);

            for (var i = 0; i < FREQS_BINS_COUNT; i++) {
                this.mapShader.uniformF('uFreqBins[' + i.toString() + ']', this.freqBins[i]/255.0);
            }
            this.mapShader.uniformF('uTime', this.getAbsoluteTime());

            if (this.anaglyph) {
                var leftCameraMtx = this.createCameraMtx(this.canvas.width/this.canvas.height, this.eye, this.viewAngleVert, this.lookAt, -EYE_SHIFT),
                    rightCameraMtx = this.createCameraMtx(this.canvas.width/this.canvas.height, this.eye, this.viewAngleVert, this.lookAt, EYE_SHIFT);
                gl.enable(gl.DEPTH_TEST);
                gl.clear(gl.DEPTH | gl.COLOR);

                this.mapShader.uniformMatrixF('uCameraMtx', leftCameraMtx);
                gl.colorMask(1, 0, 0, 0);
                this.mapShader.draw(this.canvas.width, this.canvas.height, gl.TRIANGLES, this.indBuf);

                this.mapShader.uniformMatrixF('uCameraMtx', rightCameraMtx);
                gl.colorMask(0, 1, 1, 1);
                gl.clear(gl.DEPTH_BUFFER_BIT);
                this.mapShader.draw(this.canvas.width, this.canvas.height, gl.TRIANGLES, this.indBuf);

                gl.colorMask(1, 1, 1, 1);
            } else if (this.stereo) {
                var leftCameraMtx = this.createCameraMtx(0.5*this.canvas.width/this.canvas.height, this.eye, this.viewAngleVert, this.lookAt, -EYE_SHIFT),
                    rightCameraMtx = this.createCameraMtx(0.5*this.canvas.width/this.canvas.height, this.eye, this.viewAngleVert, this.lookAt, EYE_SHIFT);
                gl.enable(gl.DEPTH_TEST);
                gl.clear(gl.DEPTH | gl.COLOR);

                this.mapShader.uniformMatrixF('uCameraMtx', leftCameraMtx);
                this.mapShader.draw(this.canvas.width/2, this.canvas.height, gl.TRIANGLES, this.indBuf, 0);

                this.mapShader.uniformMatrixF('uCameraMtx', rightCameraMtx);
                this.mapShader.draw(this.canvas.width/2, this.canvas.height, gl.TRIANGLES, this.indBuf, this.canvas.width/2);
            } else {
                var centerMatrix = this.createCameraMtx(this.canvas.width/this.canvas.height, this.eye, this.viewAngleVert, this.lookAt, 0);
                this.mapShader.uniformMatrixF('uCameraMtx', centerMatrix);
                gl.enable(gl.DEPTH_TEST);
                gl.clear(gl.DEPTH | gl.COLOR);
                this.mapShader.draw(this.canvas.width, this.canvas.height, gl.TRIANGLES, this.indBuf);
            }
        }

        private renderBlocks() {
            this.blocksShader.vertexAttribute('aPosition', this.blockPosBuf);
            this.blocksShader.vertexAttribute('aColor', this.blockColBuf);
            this.blocksShader.vertexAttribute('aNormal', this.blockNormBuf);

            this.blocksShader.uniformF('uCameraPosition', this.eye[0], this.eye[1], this.eye[2]);
            this.setUniformCameraLight(this.blocksShader, 'uLight', this.eye[0], this.eye[1], this.eye[2], 2.0, 0.01, 0.2);

            if (this.anaglyph) {
                var leftCameraMtx = this.createCameraMtx(this.canvas.width/this.canvas.height, this.eye, this.viewAngleVert, this.lookAt, -EYE_SHIFT),
                    rightCameraMtx = this.createCameraMtx(this.canvas.width/this.canvas.height, this.eye, this.viewAngleVert, this.lookAt, EYE_SHIFT);
                gl.clear(gl.DEPTH);

                this.blocksShader.uniformMatrixF("uCameraMtx", leftCameraMtx);
                gl.colorMask(1, 0, 0, 0);
                this.blocksShader.draw(this.canvas.width, this.canvas.height, gl.TRIANGLES, this.blockIndBuf);

                this.blocksShader.uniformMatrixF("uCameraMtx", rightCameraMtx);
                gl.colorMask(0, 1, 1, 1);
                gl.clear(gl.DEPTH_BUFFER_BIT);
                this.blocksShader.draw(this.canvas.width, this.canvas.height, gl.TRIANGLES, this.blockIndBuf);

                gl.colorMask(1, 1, 1, 1);
            } else if (this.stereo) {
                var leftCameraMtx = this.createCameraMtx(0.5*this.canvas.width/this.canvas.height, this.eye, this.viewAngleVert, this.lookAt, -EYE_SHIFT),
                    rightCameraMtx = this.createCameraMtx(0.5*this.canvas.width/this.canvas.height, this.eye, this.viewAngleVert, this.lookAt, EYE_SHIFT);
                this.blocksShader.uniformMatrixF("uCameraMtx", leftCameraMtx);
                this.blocksShader.draw(this.canvas.width/2, this.canvas.height, gl.TRIANGLES, this.blockIndBuf, 0);

                this.blocksShader.uniformMatrixF("uCameraMtx", rightCameraMtx);
                this.blocksShader.draw(this.canvas.width/2, this.canvas.height, gl.TRIANGLES, this.blockIndBuf, this.canvas.width/2);
            } else {
                var centerMatrix = this.createCameraMtx(this.canvas.width/this.canvas.height, this.eye, this.viewAngleVert, this.lookAt, 0);
                this.blocksShader.uniformMatrixF('uCameraMtx', centerMatrix);
                this.blocksShader.draw(this.canvas.width, this.canvas.height, gl.TRIANGLES, this.blockIndBuf);
            }
        }

        private renderPlane() {
            this.planeShader.vertexAttribute('aPosition', this.planePosBuf);
            this.planeShader.vertexAttribute('aColor', this.planeColorBuf);
            //this.planeShader.vertexAttribute('aNormal', this.planeNormBuf);

            this.planeShader.uniformF("uCameraPosition", this.eye[0], this.eye[1], this.eye[2]);
            this.planeShader.uniformMatrixF("uModelMtx", this.planeModel);

            if (this.anaglyph) {
                var leftCameraMtx = this.createCameraMtx(this.canvas.width/this.canvas.height, this.eye, this.viewAngleVert, this.lookAt, -EYE_SHIFT),
                    rightCameraMtx = this.createCameraMtx(this.canvas.width/this.canvas.height, this.eye, this.viewAngleVert, this.lookAt, EYE_SHIFT);
                gl.clear(gl.DEPTH);

                this.planeShader.uniformMatrixF("uCameraMtx", leftCameraMtx);
                gl.colorMask(1, 0, 0, 0);
                this.planeShader.draw(this.canvas.width, this.canvas.height, gl.TRIANGLES, this.planeIndBuf);

                this.planeShader.uniformMatrixF("uCameraMtx", rightCameraMtx);
                gl.colorMask(0, 1, 1, 1);
                gl.clear(gl.DEPTH_BUFFER_BIT);
                this.planeShader.draw(this.canvas.width, this.canvas.height, gl.TRIANGLES, this.planeIndBuf);

                gl.colorMask(1, 1, 1, 1);
            } else if (this.stereo) {
                var leftCameraMtx = this.createCameraMtx(0.5*this.canvas.width/this.canvas.height, this.eye, this.viewAngleVert, this.lookAt, -EYE_SHIFT),
                    rightCameraMtx = this.createCameraMtx(0.5*this.canvas.width/this.canvas.height, this.eye, this.viewAngleVert, this.lookAt, EYE_SHIFT);
                this.planeShader.uniformMatrixF("uCameraMtx", leftCameraMtx);
                this.planeShader.draw(this.canvas.width/2, this.canvas.height, gl.TRIANGLES, this.planeIndBuf, 0);

                this.planeShader.uniformMatrixF("uCameraMtx", rightCameraMtx);
                this.planeShader.draw(this.canvas.width/2, this.canvas.height, gl.TRIANGLES, this.planeIndBuf, this.canvas.width/2);
            } else {
                var centerMatrix = this.createCameraMtx(this.canvas.width/this.canvas.height, this.eye, this.viewAngleVert, this.lookAt, 0);
                this.planeShader.uniformMatrixF('uCameraMtx', centerMatrix);
                this.planeShader.draw(this.canvas.width, this.canvas.height, gl.TRIANGLES, this.planeIndBuf);
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

            var lightColors = [
                [1, 1, 0],
                [1, 0, 1]
            ];

            for (var i = 0; i < FREQS_BINS_COUNT; i++) {
                this.lightShader.uniformF('uFreqBins[' + i.toString() + ']', this.freqBins[i] / 255.0);
            }
            this.lightShader.uniformF('uTime', this.getAbsoluteTime());

            var that = this;
            var draw = function (width, x) {
                that.lightShader.uniformF('uRatio', that.canvas.height / width);
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
                gl.enable(gl.BLEND);
                gl.disable(gl.DEPTH_TEST);
                that.lightShader.draw(width, that.canvas.height, gl.TRIANGLES, that.indRectBuf, x);
                gl.disable(gl.BLEND);
            };
            var setLightPoses = function(cameraMtx) {
                var lightPositions = [
                    [-1.0, 1.0, 0.0],
                    [-1.0, -1.0, 0.0]
                ];
                for (var i = 0; i < LIGHTS_COUNT; i++) {
                    var wldPos = mat4.multiplyVec3(that.planeModel, lightPositions[i]);
                    var pos = mat4.multiplyVec3(cameraMtx, wldPos);
                    pos[0] = pos[0] / pos[2];
                    pos[1] = pos[1] / pos[2];
                    var lightPositionX = pos[0];
                    var lightPositionY = pos[1];
                    that.lightShader.uniformF('uLightPosition[' + i.toString() + ']', lightPositionX, lightPositionY);
                    that.lightShader.uniformF('uLightColor[' + i.toString() + ']', lightColors[i][0], lightColors[i][1], lightColors[i][2]);
                }
            };
            if (this.anaglyph) {
                var leftCameraMtx = this.createCameraMtx(this.canvas.width/this.canvas.height, this.eye, this.viewAngleVert, this.lookAt, -EYE_SHIFT), rightCameraMtx = this.createCameraMtx(this.canvas.width/this.canvas.height, this.eye, this.viewAngleVert, this.lookAt, EYE_SHIFT);
                gl.clear(gl.DEPTH);
                gl.colorMask(1, 0, 0, 0);
                setLightPoses(leftCameraMtx);
                draw(this.canvas.width, 0);
                gl.colorMask(0, 1, 1, 1);
                gl.clear(gl.DEPTH_BUFFER_BIT);
                setLightPoses(rightCameraMtx);
                draw(this.canvas.width, 0);
                gl.colorMask(1, 1, 1, 1);
            }
            else if (this.stereo) {
                var leftCameraMtx = this.createCameraMtx(0.5*this.canvas.width/this.canvas.height, this.eye, this.viewAngleVert, this.lookAt, -EYE_SHIFT), rightCameraMtx = this.createCameraMtx(0.5*this.canvas.width/this.canvas.height, this.eye, this.viewAngleVert, this.lookAt, EYE_SHIFT);
                setLightPoses(leftCameraMtx);
                draw(this.canvas.width / 2, 0);
                setLightPoses(rightCameraMtx);
                draw(this.canvas.width / 2, this.canvas.width / 2);
            }
            else {
                var centerMatrix = this.createCameraMtx(this.canvas.width/this.canvas.height, this.eye, this.viewAngleVert, this.lookAt, 0);
                setLightPoses(centerMatrix);
                draw(this.canvas.width, 0);
            }
        }

        private getFreqs() {
            this.analyser.getByteFrequencyData(this.freqData);
            for (var i = 0; i < FREQS_BINS_COUNT; i++) {
                var from = Math.floor(this.freqData.length * i / FREQS_BINS_COUNT);
                var to = Math.floor(this.freqData.length * (i + 1) / FREQS_BINS_COUNT);
                var freq = 0;
                for (var j = from; j < to; j++) {
                    freq += this.freqData[j];
                }
                this.freqBins[i] = freq / (to - from);
            }
        }

        private clamp(value, min, max) {
            if (value < min) {
                return min;
            } else if (value > max) {
                return max;
            } else {
                return value;
            }
        }

        private trianglesChunkCount = 10239;

        private calcTrianglesOffset(trianglesCount) {
            var t = this.getRelativeTime();
            var trianglesToShow = Math.min(this.trianglesChunkCount, trianglesCount);
            var offset = Math.round(trianglesCount*t-trianglesToShow*0.5);
            return this.clamp(offset, 0, trianglesCount-1);
        }

        private calcTrianglesTill(trianglesCount) {
            var t = this.getRelativeTime();
            var trianglesToShow = Math.min(this.trianglesChunkCount, trianglesCount);
            var till = Math.round(trianglesCount*t+trianglesToShow*0.5);
            return this.clamp(till, 1, trianglesCount);
        }

        private isTimeToUpdateBufs(trianglesCount) {
            var t = this.getRelativeTime();
            var oldT = this.lastBufsUpdatedT;
            if (oldT == 0) {
                return true;
            } else if (trianglesCount*(t-oldT) > 0.25*this.trianglesChunkCount) {
                return true;
            } else {
                return false;
            }
        }

        private checkBlocksCollision() {
            var keyPointsCount = this.keyPoints.length / 3;
            var sectorPositionIndex = Math.round(this.getRelativeTime() * keyPointsCount);
            var planeStripPosition = this.getShipStripNumber();
            while (this.blockPositions[this.nextBlockIndex][0] < sectorPositionIndex) {
                this.nextBlockIndex += 1;
            }
            if (this.blockPositions[this.nextBlockIndex][0] > sectorPositionIndex) {
                return;
            }
            var scoreChanged = false;
            for (var i = this.nextBlockIndex; i < this.blockPositions.length && this.blockPositions[i][0] == sectorPositionIndex; i++) {
                if (this.blockPositions[i][1] == planeStripPosition && this.isBlockNotCatched(i)) {
                    this.score += BLOCK_SCORE;
                    for (var j = 0; j < 36; j++) {
                        this.colorsBB[3*i*36+3*j] = 0.2;
                        this.colorsBB[3*i*36+3*j+1] = 1.0;
                        this.colorsBB[3*i*36+3*j+2] = 0.2;
                    }
                    this.blocksWereUpdated = true;
                    scoreChanged = true;
                }
            }
            if (scoreChanged) {
                this.scoreEl.innerHTML = "Score: " + this.score;
                this.scoreEl.classList.add(C_GAME_SCORE_CHANGED);
                setTimeout(() => {
                    this.scoreEl.classList.remove(C_GAME_SCORE_CHANGED);
                }, 0);
            }
        }

        private updateBufs() {
            var mapTri = this.indiciesB.length/3;
            var blocksTri = this.indiciesBB.length/3;
            if (this.isTimeToUpdateBufs(mapTri) || this.isTimeToUpdateBufs(blocksTri)) {
                this.uploadMapBufs(this.calcTrianglesOffset(mapTri), this.calcTrianglesTill(mapTri));
                this.uploadBlockBufs(this.calcTrianglesOffset(blocksTri), this.calcTrianglesTill(blocksTri));
                this.lastBufsUpdatedT = this.getRelativeTime();
                console.debug('Bufs were updated!');
            } else if (this.blocksWereUpdated) {
                this.uploadBlockBufs(this.calcTrianglesOffset(blocksTri), this.calcTrianglesTill(blocksTri));
                console.debug('Blocks bufs were updated!');
                this.blocksWereUpdated = false;
            }
        }

        private loop() {
            this.makeFullscreen();

            this.getFreqs();

            this.checkBlocksCollision();

            this.updateBufs();

            this.initCamera();
            this.renderBackground();
            this.renderMap();
            this.renderBlocks();
            this.renderPlane();
            this.renderLights();
            window.requestAnimationFrame(this.loop.bind(this));
        }
    }
}
