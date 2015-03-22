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

    function av(a: vec3, b: vec3): vec3 {
        return vec3.scale(vec3.add(a, b, []), 0.5);
    }

    export function generateBlocks(sectorsPoints: Float32Array, blocks, stripCount: number, blockSize: vec3) {
        var result = new Float32Array(blocks.length * 8 * 3);
        blocks.forEach((block, idx) => {
            var kp = block[0],
                strip = block[1];

            var stripOffset = kp * (stripCount + 1) + strip,
                bottomLeft = util.pickVec3(sectorsPoints, stripOffset),
                bottomRight = util.pickVec3(sectorsPoints, stripOffset + 1),
                topLeft = util.pickVec3(sectorsPoints, stripOffset + stripCount + 1),
                topRight = util.pickVec3(sectorsPoints, stripOffset + stripCount + 2);

            var stripCenter = av(topRight, bottomLeft),
                dx = vec3.scale(vec3.direction(av(topLeft, topRight), av(bottomLeft, bottomRight)), blockSize[0] / 2),
                dy = vec3.scale(vec3.direction(av(topRight, bottomRight), av(topLeft, bottomLeft)), blockSize[1] / 2),
                dz = vec3.scale(vec3.normalize(vec3.cross(dx, dy)), blockSize[2]),

                dxdy = vec3.add(dx, dy, []),
                dxmdy = vec3.subtract(dx, dy, []),
                dxdydz = vec3.add(dxdy, dz, []),
                dxmdydz = vec3.add(dxmdy, dz, []);

            util.putVec3(result, idx * 8, vec3.add(stripCenter, dxdy, []));
            util.putVec3(result, idx * 8 + 1, vec3.add(stripCenter, dxmdy, []));
            util.putVec3(result, idx * 8 + 2, vec3.subtract(stripCenter, dxdy, []));
            util.putVec3(result, idx * 8 + 3, vec3.subtract(stripCenter, dxmdy, []));

            util.putVec3(result, idx * 8 + 4, vec3.add(stripCenter, dxdydz, []));
            util.putVec3(result, idx * 8 + 5, vec3.add(stripCenter, dxmdydz, []));
            util.putVec3(result, idx * 8 + 6, vec3.subtract(stripCenter, dxdydz, []));
            util.putVec3(result, idx * 8 + 7, vec3.subtract(stripCenter, dxmdydz, []));
        });
        return result;
    }
}