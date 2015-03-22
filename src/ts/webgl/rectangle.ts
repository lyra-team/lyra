///<reference path='gl.ts'/>
module rectangle {

    var gl;
    var glContext;
    var shader;
    var canvas;

    var posBuf;
    var colBuf;
    var indBuf;

    var W_SIZE = 1024 * 4;
    var STEP = 0.025;
    var MAX_THRESH = 0.7;

    var num = 0;
    var global_ret, global_start;
    var audioCtx = new (window.AudioContext || window.webkitAudioContext)();

                    
    function makeFullPage() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    export function start(vshader, fshader) {
        var canvas = <HTMLCanvasElement> document.getElementById('gl_canvas');
        init(canvas, vshader, fshader);

        precalculate();

        //loop();
    }

    function init(glCanvas, vshader, fshader) {
        canvas = glCanvas;
        makeFullPage();
        glContext = new webgl.GLContext(canvas);
        glContext.activate();
        gl = webgl.gl;
        shader = new webgl.Shader(vshader, fshader);

        posBuf = new webgl.ArrayBuffer(2, gl.FLOAT);
        colBuf = new webgl.ArrayBuffer(4, gl.FLOAT);
        indBuf = new webgl.ElementArrayBuffer();
    }

    function toPowerOfTwo(n) {
        n--;
        n |= n >> 1;
        n |= n >> 2;
        n |= n >> 4;
        n |= n >> 8;
        n |= n >> 16;
        n++;
        return n;
    }

    function complexLength(real, imag) {
        return Math.sqrt(real * real + imag * imag);
    }

    function calculateMetrics (prev, current) {
        if (prev.length == 0)
            return 0;

        var sum = 0;
        for (var i = 0; i < prev.length; i++)
            sum += complexLength(prev.real[i] - current.real[i], prev.imag[i] - current.imag[i]);
    
        return sum;
    }

    function isMaximum (prev, current, thres) {
        if (prev.length == 0)
            return false;

        var cnt = 0
        for (var i = 0; i < prev.length; i++)
            if (complexLength(prev.real[i], prev.imag[i]) < complexLength(current.real[i], current.imag[i]))
                cnt++;

        console.log(cnt + " " + current.length + " " + current.length * thresh);

        return cnt >= current.length * thresh;
    }

    function precalculate ()
    {
        console.log("123");

        var request = new XMLHttpRequest();
        request.open('GET', 'metallica.mp3', true);
        request.responseType = 'arraybuffer';

        request.onload = function() {
            var audioData = request.response;

            audioCtx.decodeAudioData(audioData, function(buffer) {
                var offlineCtx = new OfflineAudioContext(1, buffer.length, buffer.sampleRate);
                
                var source = offlineCtx.createBufferSource();
                source.buffer = buffer;
                source.connect(offlineCtx.destination);

                source.start();
                offlineCtx.startRendering();

                var cnt = 0;

                offlineCtx.oncomplete = function(e) {
                    console.log("cnt " + cnt++);
                    var buffer = e.renderedBuffer;

                    var song = audioCtx.createBufferSource();
                    song.buffer = e.renderedBuffer;
                    song.connect(audioCtx.destination);

                    var channelData = song.buffer.getChannelData(0);

                    var frames_step = STEP * song.buffer.sampleRate | 0;
                    console.log(song.buffer.sampleRate);

                    var prev_array = new complex_array.ComplexArray(0);
                    var current_array = new complex_array.ComplexArray(0);
                    var fft_buffer = new Float32Array(W_SIZE * 2);
                    
                    global_ret = new Array();

                    console.log("! " + STEP + " " + frames_step + " " + channelData.length);

                    for (var i = frames_step; i + W_SIZE < channelData.length; i += frames_step) {
                        prev_array = current_array;

                        for (var j = -W_SIZE; j < W_SIZE; j++)
                            fft_buffer[W_SIZE + j] = channelData[j + i];
                        
                        var complex = new complex_array.ComplexArray(fft_buffer);
                        complex.FFT();

                        current_array = complex

                        //global_ret.push(calculateMetrics(prev_array, current_array))
                        if (isMaximum(prev_array, current_array)) {
                            global_ret[global_ret.length - 1] = 0;
                            global_ret.push(1);
                        }
                        else {
                            global_ret.push(0);
                        }
                    }

                    /*global_ret.map(function(value, i, n) {
                        global_ret[i] = [-value, i]
                    });
                    global_ret.sort();
                    var tmp = global_ret.slice();
                    tmp.map(function(value, i, n) {
                        if (i < 500)
                            global_ret[value[1]] = 1;//value[0];
                        else
                            global_ret[value[1]] = 0;
                    });*/

                    song.start();
                    global_start = audioCtx.currentTime;

                    loop();
                }
            }, function(e){"Error with decoding audio data" + e.err});
    }

        request.send();
    }

    function loop() {
        makeFullPage();

        var time = audioCtx.currentTime - global_start;

        while (time - num * STEP >= 0) {
            num++;
            console.log(num);
        }

        var value = global_ret[num];
        console.log(time + " " + value + " " + num);

        var r = value, g = value, b = value;
        
        posBuf.uploadData(new Float32Array([
            -1, -1,
            -1, 1,
             1, 1,
             1, -1]));
        colBuf.uploadData(new Float32Array([
            r, g, b, 1,
            r, g, b, 1,
            r, g, b, 1,
            r, g, b, 1]));
        indBuf.uploadData(new Uint16Array([
            0, 1, 2,
            0, 2, 3]));

        shader.vertexAttribute('position', posBuf);
        shader.vertexAttribute('color', colBuf);
        shader.draw(canvas.width, canvas.height, gl.TRIANGLES, indBuf);
        window.requestAnimationFrame(loop);
    }

}