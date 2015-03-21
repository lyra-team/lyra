///<reference path="../glMatrix.d.ts"/>

module webgl {

    export var gl;

    interface Bindable {
        bind();
        unbind();
    }

    class BufferObject implements Bindable {

        handle;
        data;

        constructor() {
            this.handle = gl.createBuffer();
        }

        uploadData(data) {
            this.bind();
            this.data = data;
            gl.bufferData(this.getTarget(), data, gl.STATIC_DRAW);
            this.unbind();
        }

        bind() {
            gl.bindBuffer(this.getTarget(), this.handle);
        }

        unbind() {
            gl.bindBuffer(this.getTarget(), null);
        }

        getTarget() {
            return -1;
        }
    }

    export class ArrayBuffer extends BufferObject {

        itemCount;
        elementSize;
        elementGlType;

        constructor(itemCount, elementGlType) {
            super();
            this.itemCount = itemCount;
            this.elementGlType = elementGlType;
            if (this.elementGlType == gl.FLOAT) {
                this.elementSize = 4;
            } else {
                throw Error('Unsupported!');
            }
        }

        getTarget() {
            return gl.ARRAY_BUFFER;
        }
    }

    export class ElementArrayBuffer extends BufferObject {
        getTarget() {
            return gl.ELEMENT_ARRAY_BUFFER;
        }

        getCount() {
            return this.data.length;
        }
    }

    export class Shader {

        handle;

        bound:boolean;
        nextTexSlot;

        linked:boolean;
        log:string;

        constructor(vert = '', frag = '') {
            this.handle = gl.createProgram();
            this.linked = false;
            this.bound = false;
            this.log = '';

            if (!this.compileShader(vert, gl.VERTEX_SHADER)) {
                console.error('Source code of vertex shader:\n' + vert);
                throw Error('Compilation of vertex shader failed!');
            }
            if (!this.compileShader(frag, gl.FRAGMENT_SHADER)) {
                console.error('Source code of fragment shader:\n' + frag);
                throw Error('Compilation of fragment shader failed!');
            }
            if (!this.link()) {
                console.error('Linking failed. Source code of vertex shader:\n' + vert);
                console.error('Linking failed. Source code of fragment shader:\n' + frag);
                throw Error('Linking failed!');
            }
        }

        compileShader(code, shaderType) {
            var shader = gl.createShader(shaderType);
            gl.shaderSource(shader, code);
            gl.compileShader(shader);
            var status = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
            var log = gl.getShaderInfoLog(shader);
            this.log += log;
            if (status == 0) {
                console.error(log);
                return false;
            } else {
                gl.attachShader(this.handle, shader);
                return true;
            }
        }

        link() {
            gl.linkProgram(this.handle);
            var status = gl.getProgramParameter(this.handle, gl.LINK_STATUS);
            var log = gl.getProgramInfoLog(this.handle);
            this.log += log;
            if (status == 0) {
                console.error(log);
                return false;
            } else {
                this.linked = true;
                return true;
            }
        }

        bind() {
            this.nextTexSlot = 0;
            gl.useProgram(this.handle);
            this.bound = true;
        }

        unbind() {
            gl.useProgram(null);
            this.bound = false;
        }

        uniformI(name, ...values:number[]) {
            var loc = gl.getUniformLocation(this.handle, name);
            var n = values.length;
            this.bind();
            if (n == 1) {
                gl.uniform1i(loc, values[0]);
            } else if (n == 2) {
                gl.uniform2i(loc, values[0], values[1]);
            } else if (n == 3) {
                gl.uniform3i(loc, values[0], values[1], values[2]);
            } else if (n == 4) {
                gl.uniform4i(loc, values[0], values[1], values[2], values[3]);
            } else {
                console.error('Unsupported values: ' + values);
            }
            this.unbind();
        }

        uniformF(name, ...values:number[]) {
            var loc = gl.getUniformLocation(this.handle, name);
            var n = values.length;
            this.bind();
            if (n == 1) {
                gl.uniform1f(loc, values[0]);
            } else if (n == 2) {
                gl.uniform2f(loc, values[0], values[1]);
            } else if (n == 3) {
                gl.uniform3f(loc, values[0], values[1], values[2]);
            } else if (n == 4) {
                gl.uniform4f(loc, values[0], values[1], values[2], values[3]);
            } else {
                console.error('Unsupported values: ' + values);
            }
            this.unbind();
        }

        uniformMatrixF(name, matrix:Float32Array);

        uniformMatrixF(name, matrix:mat4);

        uniformMatrixF(name, matrix) {
            var loc = gl.getUniformLocation(this.handle, name);
            this.bind();
            if (matrix.length == 2 * 2) {
                gl.uniformMatrix2fv(loc, false, matrix);
            } else if (matrix.length == 3 * 3) {
                gl.uniformMatrix3fv(loc, false, matrix);
            } else if (matrix.length == 4 * 4) {
                gl.uniformMatrix4fv(loc, false, matrix);
            } else {
                console.error('Unsupported matrix: ' + matrix);
            }
            this.unbind();
        }

        locateAttribute(name) {
            return gl.getAttribLocation(this.handle, name);
        }

        vertexAttribute(name, buffer:ArrayBuffer) {
            var loc = this.locateAttribute(name);
            gl.enableVertexAttribArray(loc);
            buffer.bind();
            gl.vertexAttribPointer(loc, buffer.itemCount, buffer.elementGlType, false,
                buffer.itemCount * buffer.elementSize, 0);
            buffer.unbind();
        }

        draw(width, height, mode, buffer:ElementArrayBuffer) {
            this.bind();
            gl.viewport(0, 0, width, height);
            buffer.bind();
            gl.drawElements(mode, buffer.getCount(), gl.UNSIGNED_SHORT, 0);
            buffer.unbind();
            this.unbind();
        }
    }

    export class GLContext {
        webGlContext;

        constructor(canvas:HTMLCanvasElement) {
            this.webGlContext = createContext(canvas);
        }

        activate() {
            gl = this.webGlContext;
        }

        deactivate() {
            gl = null;
        }
    }

    function createContext(canvas:HTMLCanvasElement) {
        var names = ["webgl", "experimental-webgl", "webkit-3d", "moz-webgl"];
        var glContext = null;
        for (var i = 0; i < names.length; ++i) {
            try {
                glContext = canvas.getContext(names[i]);
                if (glContext != null) {
                    break;
                }
            } catch (e) {
            }
        }
        if (glContext != null) {
            return glContext;
        } else {
            return null;
        }
    }

}