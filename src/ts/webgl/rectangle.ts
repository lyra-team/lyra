///<reference path='gl.ts'/>
module rectangle {

    var gl;
    var glContext;
    var shader;
    var canvas;

    var posBuf;
    var colBuf;
    var indBuf;

    function makeFullPage() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    export function start(vshader, fshader) {
        var canvas = <HTMLCanvasElement> document.getElementById('gl_canvas');
        init(canvas, vshader, fshader);
        loop();
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


    function loop() {
        makeFullPage();

        posBuf.uploadData(new Float32Array([
            -1, -1,
            -1, 1,
            1, 1,
            1, -1]));
        var r = 0, g = 1, b = 0;
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