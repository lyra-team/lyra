///<reference path='../glMatrix.d.ts'/>

module matrix {

    export function createCameraMtx(x, y, z, course, pitch, roll, angleView, ratioYX) {
        var right = Math.sin(angleView/2);
        var left = -right;
        var bottom = left * ratioYX;
        var top = right * ratioYX;
        var near = 0.01;
        var far = 100.0;

        var modelView = mat4.create();

        mat4.identity(modelView);
        mat4.translate(modelView, [0, 0, -10]);
        mat4.rotate(modelView, Math.PI/2, [0, 1, 0]);
        var frustum = mat4.frustum(left, right, bottom, top, near, far);
        return frustum;
    }

}