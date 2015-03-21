///<reference path='gl.ts'/>
module rectangle {

    var gl;
    var glContext;
    var shader;
    var canvas;

    var posBuf;
    var colBuf;
    var indBuf;

    var amplitude;
    var num = 0;

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

    function precalculate ()
    {
        console.log("123");

        var audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        var request = new XMLHttpRequest();
        request.open('GET', 'metallica.mp3', true);
        request.responseType = 'arraybuffer';

        request.onload = function() {
            var audioData = request.response;

                audioCtx.decodeAudioData(audioData, function(buffer) {

                console.log(buffer.length);

                var sz = toPowerOfTwo(buffer.length);
                var offlineCtx = new OfflineAudioContext(1, sz, 22050);
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
                    channelData = window_(channelData, windows.hann, 10);

                    var complex = new complex_array.ComplexArray(channelData);
                    console.log(complex.length);
                    complex.FFT();

                    song.start();
                    loop();
                }
            }, function(e){"Error with decoding audio data" + e.err});
        }

        request.send();
    }

    function loop() {
        makeFullPage();
        // var current = amplitude[num] * 500000 / 15;
        var current = 0;
        var r = current, g = current, b = current;
        console.log(current);
        num++;

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