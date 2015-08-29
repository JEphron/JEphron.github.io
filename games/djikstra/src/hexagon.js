var utils = require("./utils.js")
var input = require("./input.js")
var Hexagon = function(x, y, axX, axY, r) {

    // convert from odd-r style coordinates to axial coordinates
    var ax = utils.cubeToAxial(utils.oddRToCube({
        q: axX,
        r: axY
    }))

    this.axialX = ax.q;
    this.axialY = ax.r;

    this.x = x;
    this.y = y;


    this.r = r;

    this.setStrokeColor([5, 5, 5])
    this.setShadowColor([0, 0, 0])
    this.setFillColor([0, 0, 0])


    this.polygonalVertices = [];
    this.verts = [];
    this.edges = [];

    for (var i = 0; i < 6; i++) {
        var angle = i * (2.0 * Math.PI) / 6 + (90 * Math.PI / 180);
        var xp = this.r * Math.cos(angle);
        var yp = this.r * Math.sin(angle);

        var polygonalVert = {
            x: xp,
            y: yp
        };
        this.polygonalVertices.push(polygonalVert);
    }

}

Hexagon.prototype.isWall = function() {
    return this.isSolid;
};
Hexagon.prototype.getCost = function() {
    return 1;
};




Hexagon.prototype.update = function(dt) {

};

// todo: only draw shadows where shadows will be visible
Hexagon.prototype.draw = function(ctx) {
    if (this.isBorder)
        return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, this.x, this.y);
    ctx.fillStyle = this.fillShadowColorString;
    ctx.beginPath();
    for (var i = this.polygonalVertices.length - 1; i >= 0; i--) {
        var pt = this.polygonalVertices[i]
        ctx.lineTo(pt.x + 5, pt.y + 5);
    };
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = this.strokeColorString;
    ctx.lineWidth = 2;
    ctx.fillStyle = this.fillColorString;
    ctx.beginPath();
    for (var i = this.polygonalVertices.length - 1; i >= 0; i--) {
        var pt = this.polygonalVertices[i]
        ctx.lineTo(pt.x, pt.y);
    };
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    // ctx.fillStyle = "#000"
    // ctx.font = 'italic 12pt Calibri';
    // ctx.fillText(this.axialX + "," + this.axialY, -5, 0)
    ctx.restore();
};

Hexagon.prototype.setStrokeColor = function(color) {
    this.strokeColor = color;
    this.strokeColorString = "rgb(" + color[0] + "," + color[1] + "," + color[2] + ")";;
};

Hexagon.prototype.setFillColor = function(color) {
    this.fillColor = color;
    this.fillColorString = "rgb(" + color[0] + "," + color[1] + "," + color[2] + ")";
};

Hexagon.prototype.setShadowColor = function(color) {
    this.fillShadowColor = color;
    this.fillShadowColorString = "rgb(" + color[0] + "," + color[1] + "," + color[2] + ")";;
};

Hexagon.prototype.getSideLength = function() {
    return this.polygonalVertices[1].y - this.polygonalVertices[2].y;
};

Hexagon.prototype.getShortDiagonal = function() {
    var p1 = this.polygonalVertices[1];
    var p2 = this.polygonalVertices[3];
    var dist = utils.dist(p1.x, p1.y, p2.x, p2.y);
    return dist;
};


module.exports = Hexagon;