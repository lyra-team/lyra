///<reference path='../glMatrix.d.ts'/>

module mapRasterization {

    function generateSectionPoints(pathPoints:Float32Array, stripN, radius, sectorAngle) {
        console.assert((pathPoints.length % 3) == 0);
        var n = pathPoints.length / 3;
        var points = new Float32Array(n * 3 * (stripN + 1));
        for (var i = 0; i < n; i++) {
            var x1 = pathPoints[i * 3], y1 = pathPoints[i * 3 + 1], z1 = pathPoints[i * 3 + 2];
            var dx, dy, dz;
            if (i < n - 1) {
                dx = pathPoints[(i+1) * 3] - x1;
                dy = pathPoints[(i+1) * 3 + 1] - y1;
                dz = pathPoints[(i+1) * 3 + 2] - z1;
            } else {
                dx = x1 - pathPoints[(i-1) * 3];
                dy = y1 - pathPoints[(i-1) * 3 + 1];
                dz = z1 - pathPoints[(i-1) * 3 + 2];
            }

            //for (var j = 0; j <= stripN; j++) {
            //    var course = Math.atan2(dy, dx);
            //    var pitch = Math.atan2(dz, Math.sqrt(dx * dx + dy * dy));
            //    var rotate = matrix.rotationMtx(-course, -pitch, 0);
            //    var translate = matrix.translationMtx(x1, y1, z1-radius);
            //    var angle = sectorAngle * (-0.5 + j / (stripN + 1));
            //    var x = 0, y = Math.sin(angle), z = Math.cos(angle);
            //    var xyz = translate.translate(x, y, z);
            //    x = xyz[0], y = xyz[1], z = xyz[2];
            //    xyz = rotate.translate(x, y, z);
            //    points[i * 3 * (stripN + 1) + j * 3] = xyz[0];
            //    points[i * 3 * (stripN + 1) + j * 3 + 1] = xyz[1];
            //    points[i * 3 * (stripN + 1) + j * 3 + 2] = xyz[2];
            //}
        //    * @param course XY
        //    * @param pitch ZX
        //    * @param roll YZ
        }
        return points;
    }

}