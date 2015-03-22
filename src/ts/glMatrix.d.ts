declare class mat4 {
    [index: number]: number;
    static create(mat?: mat4): mat4;
    static frustum(left: number, right: number, bottom: number, top: number, near: number, far: number, dest?: mat4): mat4;
    static transpose(mat: mat4, dest?: mat4): mat4;
    static identity(mat: mat4): mat4;
    static translate(mat: mat4, xyz: vec3, dest?: mat4): mat4;
    static rotate(mat: mat4, angle: number, axis: vec3, dest?: mat4): mat4;
    static perspective(fovy: number, aspect: number, near: number, far: number, dest?: mat4): mat4;
    static lookAt(eye: vec3, center: vec3, up: vec3, dest?: mat4): mat4;
    static multiply(mat1: mat4, mat2: mat4, dest?: mat4): mat4;
    static multiplyVec3(mat: mat4, vec: vec3, dest?: vec3): vec3;
    static scale(mat: mat4, vec: vec3, dest?: mat4): mat4;
    static rotateZ(mat: mat4, angle: number, dest?: mat4): mat4;
}

declare class vec3 {
    [index: number]: number;
    static create(vec?: vec3): vec3;
    static set(vec: vec3, dest: vec3): vec3;
    static add(vec: vec3, vec2: vec3, dest?: vec3): vec3;
    static subtract(vec: vec3, vec2: vec3, dest?: vec3): vec3;
    static negate(vec: vec3, dest?: vec3): vec3;
    static scale(vec: vec3, val: number, dest?: vec3): vec3;
    static normalize(vec: vec3, dest?: vec3): vec3;
    static cross(vec: vec3, vec2: vec3, dest?: vec3): vec3;
    static length(vec: vec3): number;
    static dot(vec: vec3, vec2: vec3): number;
    static direction(vec: vec3, vec2: vec3, dest?: vec3): vec3;
    static lerp(vec: vec3, vec2: vec3, lerp: number, dest?: vec3): vec3;
    static str(vec: vec3): string;
}