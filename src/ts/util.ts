module util {
    export function pickVec3(coords: number[], idx: number);
    export function pickVec3(coords: ArrayBufferView, idx: number);
    export function pickVec3(coords, idx): vec3 {
        return [].slice.call(coords, idx * 3, idx * 3 + 3);
    }
}