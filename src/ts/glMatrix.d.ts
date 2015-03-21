declare module mat4 {
    export function frustum(left, right, bottom, top, near, far);
    export function transpose(mat);
    export function create();
    export function identity(mat);
    export function translate(mat, xyz);
    export function rotate(mat, angle, axis);
    export function perspective(fovy, aspect, near, far);
    export function perspective(fovy, aspect, near, far, dst);
    export function multiply(mat1, mat2, dst);
    export function multiplyVec3(mat, src)
}