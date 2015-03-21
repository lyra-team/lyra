///<reference path='gl.ts'/>
var gl;
var glContext;
var shader;
var canvas;

function makeFullPage() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
}

function start(vshader, fshader) {
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
}


function loop() {
    makeFullPage();
    shader.vertexAttribute('position', new webgl.ArrayBuffer(new Float32Array(
        [-1, -1,
         -1, 1,
         1, 1,
         1, -1]), 2, gl.FLOAT));
    shader.vertexAttribute('color', new webgl.ArrayBuffer(new Float32Array(
        [1, 0, 0, 1,
         0, 1, 0, 1,
         0, 0, 1, 1,
         0, 1, 1, 1]),
        4, gl.FLOAT));
    shader.draw(canvas.width, canvas.height,
        gl.TRIANGLES, new webgl.ElementArrayBuffer(new Uint16Array([0, 1, 2, 0, 2, 3])));
    window.requestAnimationFrame(loop);
}