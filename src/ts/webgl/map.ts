module map {
    export function generateSectionPoints(keyPoints: Float32Array, stripCount: number, radius: number, sectorAngle: number): Float32Array {
        console.assert((keyPoints.length % 3) == 0);
        var n = keyPoints.length / 3,
            points = new Float32Array(n * 3 * (stripCount + 1));

        for (var i = 0; i < n; i++) {
            var prev = util.pickVec3(keyPoints, Math.max(i - 1, 0)),
                cur = util.pickVec3(keyPoints, i),
                next = util.pickVec3(keyPoints, Math.min(i + 1, n - 1)),
                normal = vec3.normalize(vec3.add(vec3.direction(prev, cur, prev), vec3.direction(cur, next, next))),
                axisZ = vec3.cross([normal[0], normal[1], 0], [1, 0, 0]),
                axisY = vec3.cross([normal[0], normal[1], 0], normal),
                transform = mat4.identity([]);
            mat4.translate(transform, cur);
            mat4.rotate(transform, Math.asin(vec3.length(axisY)), axisY);
            mat4.rotate(transform, Math.asin(vec3.length(axisZ)), axisZ);

            var minAngle = (Math.PI - sectorAngle) / 2,
                maxAngle = (Math.PI + sectorAngle) / 2;

            for (var j = 0; j <= stripCount; j++) {
                var angle = minAngle + (maxAngle - minAngle) / stripCount * j,
                    vec = mat4.multiplyVec3(transform, [
                        0,
                        -Math.cos(angle) * radius,
                        Math.sin(angle) * radius
                    ]);
                for (var k = 0; k < 3; ++k)
                    points[(i * (stripCount + 1) + j) * 3 + k] = vec[k];
            }
        }
        return points;
    }

}