declare module complex_array {
    class ComplexArray {
        constructor (x);
        length();
        FFT();
    }
}

declare module windows {
    function hann(x, y);
}

declare function window_(x, y, z);