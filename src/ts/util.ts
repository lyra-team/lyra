module util {
    export function pickVec3(coords: number[], idx: number);
    export function pickVec3(coords: ArrayBufferView, idx: number);
    export function pickVec3(coords, idx): vec3 {
        return [].slice.call(coords, idx * 3, idx * 3 + 3);
    }

    export function putVec3(coords: number[], idx:number, vec: vec3);
    export function putVec3(coords: ArrayBufferView, idx:number, vec: vec3);
    export function putVec3(coords, idx, vec) {
        coords[idx * 3] = vec[0];
        coords[idx * 3 + 1] = vec[1];
        coords[idx * 3 + 2] = vec[2];
    }
}