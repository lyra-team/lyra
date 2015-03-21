module mapRasterization {
    export function generateSectionPoints(pathPoints: Float32Array, stripSize: number, radius: number, sectorAngle: number): Float32Array {
        function pickVec(idx: number) : vec3 {
            return [
                pathPoints[idx * 3],
                pathPoints[idx * 3 + 1],
                pathPoints[idx * 3 + 2]
            ];
        }
        console.assert((pathPoints.length % 3) == 0);
        var n = pathPoints.length / 3,
            points = new Float32Array(n * 3 * (stripSize + 1));

        for (var i = 0; i < n; i++) {
            var prev = pickVec(Math.max(i - 1, 0)),
                cur = pickVec(i),
                next = pickVec(Math.min(i + 1, n - 1)),
                normal = vec3.add(vec3.direction(cur, prev, prev), vec3.direction(next, cur, next)),
                axis = vec3.cross(normal, [1, 0, 0]),
                rotate = mat4.rotate(mat4.identity(mat4.create()), Math.asin(vec3.length(axis)), axis), // may be -asin
                transform = mat4.translate(rotate, cur);

            var minAngle = (Math.PI - sectorAngle) / 2,
                maxAngle = (Math.PI + sectorAngle) / 2;

            for (var j = 0; j <= stripSize; j++) {
                var angle = minAngle + (maxAngle - minAngle) * j,
                    vec = mat4.multiplyVec3(transform, [
                        0,
                        -Math.cos(angle) * radius,
                        Math.sin(angle) * radius
                    ]);
                for (var k = 0; k < 3; ++k)
                    points[(i * (stripSize + 1) + j) * 3 + k] = vec[k];
            }
        }
        return points;
    }

}