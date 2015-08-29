// --------------------------------
// msc
// --------------------------------

// returns true if point is in within specified rectangle
module.exports.pointInRect = function(px, py, rx, ry, rw, rh) {
    return px > rx && py > ry && px < rx + rw && py < ry + rh;
}

// calculate euclidian distance
module.exports.dist = function(x1, y1, x2, y2) {
    return Math.sqrt(((x2 - x1) * (x2 - x1)) + ((y2 - y1) + (y2 - y1)))

}

// calls a function each frame, passes return value to next iteration until it returns false
module.exports.animate = function(animate, complete, startingValue) {
    complete = complete || function() {}
    var anim = function(lastResult) {
        var result = animate(lastResult);
        if (result === false)
            return complete();
        window.requestAnimationFrame(function() {
            anim(result);
        })
    }
    anim(startingValue || 0);
}

module.exports.lerp = function(a, b, t) {
    return (1 - t) * a + t * b;
}

// --------------------------------
// utils for drawing
// --------------------------------

module.exports.draw = {
    circle: function(x, y, r, ctx) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI);
        ctx.stroke();
    }
}

// --------------------------------
// utils for hex coords
//  todo: chaining would be nice
// --------------------------------

// converts from odd-r to cubic
module.exports.oddRToCube = function(o) {
    return {
        x: o.q - (o.r - (o.r & 1)) / 2,
        z: o.r,
        y: -o.x - o.z
    }
}

// converts cubic to axial
module.exports.cubeToAxial = function(c) {
    return {
        q: c.x,
        r: c.z
    }
}

// converts axial to cubic
module.exports.axialToCube = function(ax) {
    return {
        x: ax.q,
        z: ax.r,
        y: -ax.q - ax.r
    }
}

// converts pixel coords to axial
module.exports.pixelToAxial = function(x, y, size) {
    var q = (1 / 3 * Math.sqrt(3) * x - 1 / 3 * y) / size;
    var r = 2 / 3 * y / size;
    return module.exports.cubeToAxial(module.exports.hexRound(module.exports.axialToCube({
        r: r,
        q: q
    })));

}

// rounds to nearest cubic coordinate
module.exports.hexRound = function(cubicCoords) {
    var x = cubicCoords.x;
    var y = cubicCoords.y;
    var z = cubicCoords.z;
    var rx = Math.round(x);
    var ry = Math.round(y);
    var rz = Math.round(z);

    var x_diff = Math.abs(rx - x);
    var y_diff = Math.abs(ry - y);
    var z_diff = Math.abs(rz - z);

    if (x_diff > y_diff && x_diff > z_diff)
        rx = -ry - rz;
    else if (y_diff > z_diff)
        ry = -rx - rz;
    else
        rz = -rx - ry;

    return {
        x: rx,
        y: ry,
        z: rz
    };
}