///<reference path='gl.ts'/>
///<reference path='matrix.ts'/>
///<reference path='../glMatrix.d.ts'/>
module camera {

    var gl;
    var glContext;
    var shader;
    var canvas;

    var posBuf;
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

        posBuf = new webgl.ArrayBuffer(3, gl.FLOAT);;
        indBuf = new webgl.ElementArrayBuffer();
    }


    function loop() {
        makeFullPage();
        var positions = new Float32Array([
            0.0,  1.0,  0.0,
            -1.0, -1.0,  0.0,
            1.0, -1.0,  0.0
        ]);

        var pMatrix = mat4.create();
        var mvMatrix= mat4.create();
        mat4.perspective(45, canvas.width / canvas.height, 0.1, 100.0, pMatrix);
        mat4.identity(mvMatrix);
        mat4.translate(mvMatrix, [-1.5, 0.0, -7.0]);

        posBuf.uploadData(positions);
        indBuf.uploadData(new Uint16Array([0, 1, 2]));
        shader.vertexAttribute('aVertexPosition', posBuf);
        shader.uniformMatrixF('uPMatrix', pMatrix);
        shader.uniformMatrixF('uMVMatrix', mvMatrix);
        shader.draw(canvas.width, canvas.height, gl.TRIANGLES, indBuf);
        window.requestAnimationFrame(loop);
    }

}