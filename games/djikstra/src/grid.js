var Hexagon = require("./hexagon.js");
var input = require("./input.js")
var utils = require("./utils.js")
var colors = {
    green: [
        [106, 195, 151],
        [61, 150, 106]
    ],
    red: [
        [226, 88, 69],
        [181, 42, 24]
    ],
    yellow: [
        [226, 213, 87],
        [181, 168, 42]
    ]
}
//  blue: ["rgb(61, 154, 202)", "rgb(16, 109, 187)"]

var Grid = function(x, y, numCols, numRows, tileRadius) {
    this.tileHash = [];
    this.flatTileArray = [];
    this.edgeTiles = [];
    var xOff = Math.cos(30 * Math.PI / 180) * tileRadius;
    var yOff = Math.sin(30 * Math.PI / 180) * tileRadius;
    var gridX = x;
    var gridY = y;
    this.tileRadius = tileRadius;

    var tileWidth = Math.sqrt(3) / 2 * this.tileRadius


    // x and y of the grid in pixels
    this.gridX = gridX;
    this.gridY = gridY;

    // width and height of the grid in pixels
    this.gridH = tileRadius * numRows;
    this.gridW = tileWidth * numCols;


    for (var i = 0; i < numRows; i++) {
        for (j = 0; j < numCols; j++) {
            var xPos = j * xOff * 2 + gridX
            if (i % 2 != 0) {
                xPos += xOff;
            }
            var yPos = i * yOff * 3 + gridY;
            var self = this;
            var tile = new Hexagon(xPos, yPos, j, i, tileRadius)
            var keys = Object.keys(colors);
            var key = keys[Math.floor(Math.random() * keys.length)];
            var color = colors[key];
            color = colors.yellow;
            tile.setFillColor(color[0]);
            tile.setShadowColor(color[1])
            if (i == numRows - 1 || j == numCols - 1 || i == 0 || j == 0) {
                tile.setFillColor(color[0].map(function(v) {
                    return v - 100
                }));
                tile.isBorder = true;
                this.edgeTiles.push(tile);
            }
            self.addTile(tile);
        }
    }

    for (var i = 0; i < Math.floor(Math.random() * 15 + 6); i++) {
        var tile = this.flatTileArray[Math.floor(Math.random() * this.flatTileArray.length)];
        if (tile.occupied || tile.isBorder) {
            i--;
            continue;
        }
        tile.isSolid = true;
        tile.occupied = true;
        (function(tile) {
            setTimeout(function() {
                tile.animating = true;
                utils.animate(function(state) {
                    var color = tile.fillColor.map(function(v) {
                        return v - 10;
                    })

                    tile.setFillColor(color);

                    if (state == 0)
                        return 1;
                    else if (state < 5)
                        return state + 1;
                    else
                        return false;
                }, function() {
                    tile.animating = false;
                })

            }, Math.random() * 500)
        })(tile)
    }
}

// add a tile to the grid
Grid.prototype.addTile = function(tile) {
    this.flatTileArray.push(tile);
    this.tileHash[hashXY(tile.axialX, tile.axialY)] = tile;
};

// given the axial coordinates of the tile return it
Grid.prototype.getTileAxial = function(x, y) {
    return this.tileHash[hashXY(x, y)];
};

// given a pair of screen-space pixel coordinates return the tile that encloses those pixels
Grid.prototype.getTileWorld = function(x, y) {
    return this.tileHash[hashXY(x, y)];
};

function hashXY(x, y) {
    return Math.floor(x) + ',' + Math.floor(y);
}

function axialRoundedCoords(q, r, g) {
    var a = utils.axialToCube({
        q: q,
        r: r
    });
    var b = utils.hexRound(a);
    var c = utils.cubeToAxial(b);
    var d = g.getTileAxial(c.q, c.r);
    return d
}

Grid.prototype.neighbors = function(tile) {
    var neighbors = [];
    var r = this.tileRadius;
    neighbors.push(axialRoundedCoords(tile.axialX, tile.axialY + 1, this)); // north east
    neighbors.push(axialRoundedCoords(tile.axialX - 1, tile.axialY + 1, this)); // north west
    neighbors.push(axialRoundedCoords(tile.axialX + 1, tile.axialY, this)); // east
    neighbors.push(axialRoundedCoords(tile.axialX - 1, tile.axialY, this)); // west
    neighbors.push(axialRoundedCoords(tile.axialX + 1, tile.axialY - 1, this)); // south east
    neighbors.push(axialRoundedCoords(tile.axialX, tile.axialY - 1, this)); // south west

    return neighbors;
};


Grid.prototype.draw = function(ctx) {
    for (var k in this.tileHash)
        this.tileHash[k].draw(ctx);
};

Grid.prototype.update = function(dt) {


    for (var k in this.tileHash)
        this.tileHash[k].update(dt);
};
module.exports = Grid;