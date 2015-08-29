(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var utils = require("./utils.js");
var pf = require("./path.js");
var input = require("./input.js")
var AI = function(x, y, grid, scene) {
    this.x = x;
    this.y = y;
    this.grid = grid;
    this.scene = scene;
    var bbb = utils.pixelToAxial(x - grid.gridX, y - grid.gridY, grid.tileRadius)
    this.currentTile = grid.getTileAxial(bbb.q, bbb.r);
    this.x = this.currentTile.x;
    this.y = this.currentTile.y;
    this.currentTile.occupied = true;
    this.tookTurn = false;
    this.animating = false;
    this.startingDirection = Math.floor(Math.random() * 6);
}

AI.prototype.performActions = function(grid, scene) {
    if (this.animating) {
        return;
    }

    if (this.tookTurn) {
        this.tookTurn = false;
        scene.isPlayersTurn = true;
        return;
    }

    if (this.winsNextTurn) {
        this.win();
    }

    if (this.startingDirection) {
        var n = grid.neighbors(this.currentTile);
        var t = n[this.startingDirection];
        while (t.isSolid)
            t = n[Math.floor(Math.random() * 6)]
        this.startingDirection = null;
        this.animating = true;
        var self = this;
        this.moveTo(t, grid, function() {
            self.animating = false;
            self.tookTurn = true;
        });

        return;
    }

    var shortestDist = Number.MAX_VALUE;
    var shortestPath = null
    for (var i = grid.edgeTiles.length - 1; i >= 0; i--) {
        var edgeTile = grid.edgeTiles[i];
        if (edgeTile.isSolid)
            continue;
        var path = pf.search(grid, this.currentTile, edgeTile)
        if (path.length < shortestDist) {
            shortestDist = path.length;
            shortestPath = path;
        }
    };

    // this.moveTo(shortestPath.tiles[1] || null);

    // var edge1 = grid.edgeTiles[0];
    //     var n = grid.neighbors(this.currentTile)
    //     // for (var i = n.length - 1; i >= 0; i--) {
    //     //     n[i].setFillColor([0, 255, 0])
    //     // };
    //     var pathTo = pf.search(grid, this.currentTile, edge1);
    //     console.log(pathTo)
    if (shortestPath.length == 0) return this.lose() // len 0 means the AI has lost. 
    if (shortestPath[0].isBorder) this.win(shortestPath[0], grid);
    this.animating = true;
    var self = this;
    this.moveTo(shortestPath[0], grid, function() {
        self.animating = false;
        self.tookTurn = true;
    });


};

// todo: animate
AI.prototype.moveTo = function(tile, grid, cb) {
    if (!tile) return
    var self = this;


    utils.animate(function(v) {
        self.x = utils.lerp(self.x, tile.x, 0.5);
        self.y = utils.lerp(self.y, tile.y, 0.5);

        if (Math.round(self.x) == Math.round(tile.x) && Math.round(self.y) == Math.round(tile.y))
            return false;

    }, function() {
        self.occupied = true;
        this.animating = false;
        cb();
    })
    self.currentTile.occupied = false;
    var bbb = utils.pixelToAxial(tile.x - grid.gridX, tile.y - grid.gridY, grid.tileRadius)
    self.currentTile = grid.getTileAxial(bbb.q, bbb.r);
    self.currentTile.occupied = true;
};


AI.prototype.win = function(edgeTile, grid) {
    console.log("AI won...")

    var self = this;
    this.moveTo(edgeTile, grid, function() {
        self.scene.restart();
    })

};
// AI has lost, player has won
AI.prototype.lose = function() {
    console.log("AI lost...")
    this.scene.handlePlayerWin();
    this.scene.restart();
};

AI.prototype.update = function(dt) {

};

AI.prototype.draw = function(ctx) {
    ctx.fillStyle = "#000";
    utils.draw.circle(this.x, this.y, 10, ctx);
    ctx.fill()
    this.currentTile.setFillColor([255, 200, 200])
};

module.exports = AI;
},{"./input.js":5,"./path.js":7,"./utils.js":10}],2:[function(require,module,exports){
(function (global){
var Scene = require("./scene.js"),
    input = require("./input.js"),
    utils = require("./utils.js")
    Hexagon = require("./hexagon.js"),
    AI = require("./AI.js"),
    Player = require("./player.js"),
    Grid = require("./grid.js");

var GameScene = new Scene();

var playerScore = 0;
var needsShowScoreZoomAnim = false

GameScene.init = function() {
    var hexRadius = 35;
    var hexWidth = Math.sqrt(3) / 2 * hexRadius; // secretly the radius in the x direction
    var cols = 13,
        rows = 13;

    var scoreFontSize = 24;

    if (needsShowScoreZoomAnim) {
        needsShowScoreZoomAnim = false;
        scoreFontSize = 50;
        utils.animate(function(state) {
            scoreFontSize = utils.lerp(scoreFontSize, 24, 0.1);
            if (Math.floor(scoreFontSize) == 24) {
                scoreFontSize = 24;
                return false
            };
        })
    }
    // resorting to cheap hackery due to frustration
    var theDamnHexagon = new Hexagon(0, 0, 0, 0, hexRadius)

    var sideLen = theDamnHexagon.getShortDiagonal() / Math.sqrt(3);

    var grid = new Grid(app.width / 2 + hexWidth - (hexWidth * cols),
        app.height / 2 + hexRadius - (hexRadius * 2) * rows / 2 + sideLen * (rows / 2), //  close enough... 
        cols, rows, hexRadius);

    global.backgroundColor = "rgb(237, 217, 186)"

    this.isPlayersTurn = true;

    var player = new Player();
    var ai = new AI(app.width / 2, app.height / 2, grid, this);

    this.update = function(dt) {
        grid.update(dt);
        player.update(dt);
        ai.update(dt);

        if (this.isPlayersTurn)
            player.handleInput(grid, this);
        else
            ai.performActions(grid, this)
    }

    this.restart = function() {
        GameScene.goToScene(GameScene)
    }
    var fixedWidth = app.width / 2;
    this.draw = function(ctx) {
        grid.draw(ctx);
        player.draw(ctx);
        ai.draw(ctx);
        ctx.font = 'italic ' + scoreFontSize + 'pt Calibri';

        var scoreTxt = "Your score is " + playerScore;
        ctx.fillText(scoreTxt, fixedWidth - ctx.measureText(scoreTxt).width / 2, grid.gridY);

        ctx.font = 'bold 32pt Calibri';
        var titleText = "Djikstra";

        ctx.fillText(titleText, fixedWidth - ctx.measureText(titleText).width / 2, grid.gridY - 32);
    }

    this.handlePlayerWin = function() {
        console.log("player won!")
        playerScore++;
        needsShowScoreZoomAnim = true;
        console.log("player score is now", playerScore);
    }
}


module.exports = GameScene;
}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./AI.js":1,"./grid.js":3,"./hexagon.js":4,"./input.js":5,"./player.js":8,"./scene.js":9,"./utils.js":10}],3:[function(require,module,exports){
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
},{"./hexagon.js":4,"./input.js":5,"./utils.js":10}],4:[function(require,module,exports){
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

Hexagon.prototype.draw = function(ctx) {
    if(this.isBorder)
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
},{"./input.js":5,"./utils.js":10}],5:[function(require,module,exports){
module.exports.mouse = {
    x: 0,
    y: 0,
    down: false
}

module.exports.key = {
    down: false,
    code: ''
}

module.exports.init = function(canvas, document) {
    canvas.addEventListener("mousedown", function(event) {
        module.exports.mouse.down = true;
    })

    canvas.addEventListener("mouseup", function(event) {
        module.exports.mouse.down = false;
    })

    canvas.addEventListener("mousemove", function(event) {
        module.exports.mouse.x = event.pageX;
        module.exports.mouse.y = event.pageY;
    })

    canvas.addEventListener("touchstart", function(event) {
        module.exports.mouse.x = event.targetTouches[0].pageX;
        module.exports.mouse.y = event.targetTouches[0].pageY;
        module.exports.mouse.down = true;
    })

    canvas.addEventListener("touchend", function(event) {
        module.exports.mouse.down = false;
    })

    canvas.addEventListener("touchmove", function(event) {
        module.exports.mouse.x = event.targetTouches[0].pageX;
        module.exports.mouse.y = event.targetTouches[0].pageY;
    })

    document.addEventListener('keydown', function(event) {
        module.exports.key.down = true;
        module.exports.key.code = String.fromCharCode(event.keyCode);
    });

    document.addEventListener('keyup', function(event) {
        module.exports.key.down = false;
        module.exports.key.code = String.fromCharCode(event.keyCode);
    });

}


},{}],6:[function(require,module,exports){
(function (global){
global.backgroundColor = "#000";

var app = {
    initialize: function() {
        var canvas = document.getElementById("can");
        var width = window.innerWidth;
        var height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        require('./input.js').init(canvas, document);
        this.canvas = canvas;
        this.width = width;
        this.height = height;
        this.ctx = this.canvas.getContext("2d");
        this.start();
    },
    start: function() {

        var loadScene = function(nextScene) {
            nextScene.init();
            app.currentScene = nextScene;
            app.currentScene.onSceneEnd(loadScene);
        }

        loadScene(require('./gameScene.js'));

        var last = new Date();
        var loop = function() {
            var now = new Date();
            var ctx = app.ctx;
            ctx.fillStyle = global.backgroundColor;
            ctx.fillRect(0, 0, app.width, app.height)
            app.currentScene.update((now - last) / 1000);
            app.currentScene.draw(ctx);
            last = now;
            window.requestAnimationFrame(loop);
        }

        loop();
    }
}

window.onload = function() {
    app.initialize();
}

window.onresize = function(event) {
    app.width = window.innerWidth;
    app.height = window.innerHeight;
    app.canvas.width = app.width
    app.canvas.height = app.height
}

global.app = app;
}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./gameScene.js":2,"./input.js":5}],7:[function(require,module,exports){
function init(grid) {
    for (var i = 0, len = grid.flatTileArray.length; i < len; ++i) {
        var node = grid.flatTileArray[i];
        node.f = 0;
        node.g = 0;
        node.h = 0;
        node.visited = false;
        node.closed = false;
        node.parent = null;
    }
}

var heuristics = {
    manhattan: function(pos0, pos1) {
        var d1 = Math.abs(pos1.x - pos0.x);
        var d2 = Math.abs(pos1.y - pos0.y);
        return d1 + d2;
    },
    diagonal: function(pos0, pos1) {
        var D = 1;
        var D2 = Math.sqrt(2);
        var d1 = Math.abs(pos1.x - pos0.x);
        var d2 = Math.abs(pos1.y - pos0.y);
        return (D * (d1 + d2)) + ((D2 - (2 * D)) * Math.min(d1, d2));
    }
};

function pathTo(node) {
    var curr = node,
        path = [];
    while (curr.parent) {
        path.push(curr);
        curr = curr.parent;
    }
    return path.reverse();
}


module.exports.heuristics = heuristics;
module.exports.search = function(grid, start, end, options) {
    init(grid);

    options = options || {};
    var heuristic = options.heuristic || heuristics.diagonal;
    var closest = false;

    var openHeap = new BinaryHeap(function(node) {
        return node.f;
    });

    // set the start node to be the closest if required
    var closestNode = start;
    start.h = heuristic(start, end);

    openHeap.push(start);

    while (openHeap.size() > 0) {

        // Grab the lowest f(x) to process next.  Heap keeps this sorted for us.
        var currentNode = openHeap.pop();

        // End case -- result has been found, return the traced path.
        if (currentNode === end) {
            return pathTo(currentNode);
        }

        // Normal case -- move currentNode from open to closed, process each of its neighbors.
        currentNode.closed = true;

        // Find all neighbors for the current node.
        var neighbors = grid.neighbors(currentNode);

        for (var i = 0, il = neighbors.length; i < il; i++) {
            var neighbor = neighbors[i];

            if (!neighbor)
                continue
            if (neighbor.closed || neighbor.isWall()) {
                // Not a valid node to process, skip to next neighbor.
                continue;
            }

            // The g score is the shortest distance from start to current node.
            // We need to check if the path we have arrived at this neighbor is the shortest one we have seen yet.
            var gScore = currentNode.g + neighbor.getCost(currentNode);
            var beenVisited = neighbor.visited;

            if (!beenVisited || gScore < neighbor.g) {

                // Found an optimal (so far) path to this node.  Take score for node to see how good it is.
                neighbor.visited = true;
                neighbor.parent = currentNode;
                neighbor.h = neighbor.h || heuristic(neighbor, end);
                neighbor.g = gScore;
                neighbor.f = neighbor.g + neighbor.h;

                if (closest) {
                    // If the neighbour is closer than the current closestNode or if it's equally close but has
                    // a cheaper path than the current closest node then it becomes the closest node
                    if (neighbor.h < closestNode.h || (neighbor.h === closestNode.h && neighbor.g < closestNode.g)) {
                        closestNode = neighbor;
                    }
                }

                if (!beenVisited) {
                    // Pushing to heap will put it in proper place based on the 'f' value.
                    openHeap.push(neighbor);
                } else {
                    // Already seen the node, but since it has been rescored we need to reorder it in the heap
                    openHeap.rescoreElement(neighbor);
                }
            }
        }
    }

    if (closest) {
        return pathTo(closestNode);
    }

    // No result was found - empty array signifies failure to find path.
    return [];
};


function BinaryHeap(scoreFunction) {
    this.content = [];
    this.scoreFunction = scoreFunction;
}

BinaryHeap.prototype = {
    push: function(element) {
        // Add the new element to the end of the array.
        this.content.push(element);

        // Allow it to sink down.
        this.sinkDown(this.content.length - 1);
    },
    pop: function() {
        // Store the first element so we can return it later.
        var result = this.content[0];
        // Get the element at the end of the array.
        var end = this.content.pop();
        // If there are any elements left, put the end element at the
        // start, and let it bubble up.
        if (this.content.length > 0) {
            this.content[0] = end;
            this.bubbleUp(0);
        }
        return result;
    },
    remove: function(node) {
        var i = this.content.indexOf(node);

        // When it is found, the process seen in 'pop' is repeated
        // to fill up the hole.
        var end = this.content.pop();

        if (i !== this.content.length - 1) {
            this.content[i] = end;

            if (this.scoreFunction(end) < this.scoreFunction(node)) {
                this.sinkDown(i);
            } else {
                this.bubbleUp(i);
            }
        }
    },
    size: function() {
        return this.content.length;
    },
    rescoreElement: function(node) {
        this.sinkDown(this.content.indexOf(node));
    },
    sinkDown: function(n) {
        // Fetch the element that has to be sunk.
        var element = this.content[n];

        // When at 0, an element can not sink any further.
        while (n > 0) {

            // Compute the parent element's index, and fetch it.
            var parentN = ((n + 1) >> 1) - 1,
                parent = this.content[parentN];
            // Swap the elements if the parent is greater.
            if (this.scoreFunction(element) < this.scoreFunction(parent)) {
                this.content[parentN] = element;
                this.content[n] = parent;
                // Update 'n' to continue at the new position.
                n = parentN;
            }

            // Found a parent that is less, no need to sink any further.
            else {
                break;
            }
        }
    },
    bubbleUp: function(n) {
        // Look up the target element and its score.
        var length = this.content.length,
            element = this.content[n],
            elemScore = this.scoreFunction(element);

        while (true) {
            // Compute the indices of the child elements.
            var child2N = (n + 1) << 1,
                child1N = child2N - 1;
            // This is used to store the new position of the element,
            // if any.
            var swap = null;
            var child1Score;
            // If the first child exists (is inside the array)...
            if (child1N < length) {
                // Look it up and compute its score.
                var child1 = this.content[child1N];
                child1Score = this.scoreFunction(child1);

                // If the score is less than our element's, we need to swap.
                if (child1Score < elemScore) {
                    swap = child1N;
                }
            }

            // Do the same checks for the other child.
            if (child2N < length) {
                var child2 = this.content[child2N],
                    child2Score = this.scoreFunction(child2);
                if (child2Score < (swap === null ? elemScore : child1Score)) {
                    swap = child2N;
                }
            }

            // If the element needs to be moved, swap it, and continue.
            if (swap !== null) {
                this.content[n] = this.content[swap];
                this.content[swap] = element;
                n = swap;
            }

            // Otherwise, we are done.
            else {
                break;
            }
        }
    }
};
},{}],8:[function(require,module,exports){
var input = require("./input.js");
var utils = require("./utils.js")
var Player = function() {}

Player.prototype.update = function(dt) {

};

Player.prototype.draw = function(ctx) {

};

Player.prototype.handleInput = function(grid, scene) {
    if (input.mouse.down) {
        input.mouse.down = false;
        var x = input.mouse.x - grid.gridX;
        var y = input.mouse.y - grid.gridY;

        var coords = utils.pixelToAxial(x, y, grid.tileRadius);
        var tile = grid.getTileAxial(coords.q, coords.r);
        // if tile is not the AI

        if (!tile || tile.occupied || tile.isBorder)
            return;
        if (tile && !tile.animating) {
            tile.animating = true;

            utils.animate(function(state) {
                var color = tile.fillColor.map(function(v) {
                    return v - 10;
                })
                tile.isSolid = true;
                tile.setFillColor(color);

                if (state == 0)
                    return 1;
                else if (state < 5)
                    return state + 1;
                else
                    return false;
            }, function() {
                tile.animating = false;
                scene.isPlayersTurn = false;
                tile.occupied = true;
            })
            // tile.setShadowColor(color[1]);
        }
    }

};

module.exports = Player;
},{"./input.js":5,"./utils.js":10}],9:[function(require,module,exports){
/**
 * Prototype for all scenes
 **/

var Scene = function() {}

Scene.prototype.init = function() {
    console.log("init!");
};

Scene.prototype.onSceneEnd = function(cb) {
    this._onSceneEndCB = cb;
};

Scene.prototype.goToScene = function(nextScene) {
    this._onSceneEndCB(nextScene);
};

Scene.prototype.update = function(dt) {

};

Scene.prototype.draw = function(ctx) {

};

module.exports = Scene;
},{}],10:[function(require,module,exports){
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
},{}]},{},[6])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvd2F0Y2hpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9Kb3JkYW5lcGhyb24vRGVza3RvcC9KU19HYW1lL3NyYy9BSS5qcyIsIi9Vc2Vycy9Kb3JkYW5lcGhyb24vRGVza3RvcC9KU19HYW1lL3NyYy9nYW1lU2NlbmUuanMiLCIvVXNlcnMvSm9yZGFuZXBocm9uL0Rlc2t0b3AvSlNfR2FtZS9zcmMvZ3JpZC5qcyIsIi9Vc2Vycy9Kb3JkYW5lcGhyb24vRGVza3RvcC9KU19HYW1lL3NyYy9oZXhhZ29uLmpzIiwiL1VzZXJzL0pvcmRhbmVwaHJvbi9EZXNrdG9wL0pTX0dhbWUvc3JjL2lucHV0LmpzIiwiL1VzZXJzL0pvcmRhbmVwaHJvbi9EZXNrdG9wL0pTX0dhbWUvc3JjL21haW4uanMiLCIvVXNlcnMvSm9yZGFuZXBocm9uL0Rlc2t0b3AvSlNfR2FtZS9zcmMvcGF0aC5qcyIsIi9Vc2Vycy9Kb3JkYW5lcGhyb24vRGVza3RvcC9KU19HYW1lL3NyYy9wbGF5ZXIuanMiLCIvVXNlcnMvSm9yZGFuZXBocm9uL0Rlc2t0b3AvSlNfR2FtZS9zcmMvc2NlbmUuanMiLCIvVXNlcnMvSm9yZGFuZXBocm9uL0Rlc2t0b3AvSlNfR2FtZS9zcmMvdXRpbHMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIHV0aWxzID0gcmVxdWlyZShcIi4vdXRpbHMuanNcIik7XG52YXIgcGYgPSByZXF1aXJlKFwiLi9wYXRoLmpzXCIpO1xudmFyIGlucHV0ID0gcmVxdWlyZShcIi4vaW5wdXQuanNcIilcbnZhciBBSSA9IGZ1bmN0aW9uKHgsIHksIGdyaWQsIHNjZW5lKSB7XG4gICAgdGhpcy54ID0geDtcbiAgICB0aGlzLnkgPSB5O1xuICAgIHRoaXMuZ3JpZCA9IGdyaWQ7XG4gICAgdGhpcy5zY2VuZSA9IHNjZW5lO1xuICAgIHZhciBiYmIgPSB1dGlscy5waXhlbFRvQXhpYWwoeCAtIGdyaWQuZ3JpZFgsIHkgLSBncmlkLmdyaWRZLCBncmlkLnRpbGVSYWRpdXMpXG4gICAgdGhpcy5jdXJyZW50VGlsZSA9IGdyaWQuZ2V0VGlsZUF4aWFsKGJiYi5xLCBiYmIucik7XG4gICAgdGhpcy54ID0gdGhpcy5jdXJyZW50VGlsZS54O1xuICAgIHRoaXMueSA9IHRoaXMuY3VycmVudFRpbGUueTtcbiAgICB0aGlzLmN1cnJlbnRUaWxlLm9jY3VwaWVkID0gdHJ1ZTtcbiAgICB0aGlzLnRvb2tUdXJuID0gZmFsc2U7XG4gICAgdGhpcy5hbmltYXRpbmcgPSBmYWxzZTtcbiAgICB0aGlzLnN0YXJ0aW5nRGlyZWN0aW9uID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogNik7XG59XG5cbkFJLnByb3RvdHlwZS5wZXJmb3JtQWN0aW9ucyA9IGZ1bmN0aW9uKGdyaWQsIHNjZW5lKSB7XG4gICAgaWYgKHRoaXMuYW5pbWF0aW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAodGhpcy50b29rVHVybikge1xuICAgICAgICB0aGlzLnRvb2tUdXJuID0gZmFsc2U7XG4gICAgICAgIHNjZW5lLmlzUGxheWVyc1R1cm4gPSB0cnVlO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHRoaXMud2luc05leHRUdXJuKSB7XG4gICAgICAgIHRoaXMud2luKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuc3RhcnRpbmdEaXJlY3Rpb24pIHtcbiAgICAgICAgdmFyIG4gPSBncmlkLm5laWdoYm9ycyh0aGlzLmN1cnJlbnRUaWxlKTtcbiAgICAgICAgdmFyIHQgPSBuW3RoaXMuc3RhcnRpbmdEaXJlY3Rpb25dO1xuICAgICAgICB3aGlsZSAodC5pc1NvbGlkKVxuICAgICAgICAgICAgdCA9IG5bTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogNildXG4gICAgICAgIHRoaXMuc3RhcnRpbmdEaXJlY3Rpb24gPSBudWxsO1xuICAgICAgICB0aGlzLmFuaW1hdGluZyA9IHRydWU7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdGhpcy5tb3ZlVG8odCwgZ3JpZCwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBzZWxmLmFuaW1hdGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgc2VsZi50b29rVHVybiA9IHRydWU7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgc2hvcnRlc3REaXN0ID0gTnVtYmVyLk1BWF9WQUxVRTtcbiAgICB2YXIgc2hvcnRlc3RQYXRoID0gbnVsbFxuICAgIGZvciAodmFyIGkgPSBncmlkLmVkZ2VUaWxlcy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICB2YXIgZWRnZVRpbGUgPSBncmlkLmVkZ2VUaWxlc1tpXTtcbiAgICAgICAgaWYgKGVkZ2VUaWxlLmlzU29saWQpXG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgdmFyIHBhdGggPSBwZi5zZWFyY2goZ3JpZCwgdGhpcy5jdXJyZW50VGlsZSwgZWRnZVRpbGUpXG4gICAgICAgIGlmIChwYXRoLmxlbmd0aCA8IHNob3J0ZXN0RGlzdCkge1xuICAgICAgICAgICAgc2hvcnRlc3REaXN0ID0gcGF0aC5sZW5ndGg7XG4gICAgICAgICAgICBzaG9ydGVzdFBhdGggPSBwYXRoO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8vIHRoaXMubW92ZVRvKHNob3J0ZXN0UGF0aC50aWxlc1sxXSB8fCBudWxsKTtcblxuICAgIC8vIHZhciBlZGdlMSA9IGdyaWQuZWRnZVRpbGVzWzBdO1xuICAgIC8vICAgICB2YXIgbiA9IGdyaWQubmVpZ2hib3JzKHRoaXMuY3VycmVudFRpbGUpXG4gICAgLy8gICAgIC8vIGZvciAodmFyIGkgPSBuLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgLy8gICAgIC8vICAgICBuW2ldLnNldEZpbGxDb2xvcihbMCwgMjU1LCAwXSlcbiAgICAvLyAgICAgLy8gfTtcbiAgICAvLyAgICAgdmFyIHBhdGhUbyA9IHBmLnNlYXJjaChncmlkLCB0aGlzLmN1cnJlbnRUaWxlLCBlZGdlMSk7XG4gICAgLy8gICAgIGNvbnNvbGUubG9nKHBhdGhUbylcbiAgICBpZiAoc2hvcnRlc3RQYXRoLmxlbmd0aCA9PSAwKSByZXR1cm4gdGhpcy5sb3NlKCkgLy8gbGVuIDAgbWVhbnMgdGhlIEFJIGhhcyBsb3N0LiBcbiAgICBpZiAoc2hvcnRlc3RQYXRoWzBdLmlzQm9yZGVyKSB0aGlzLndpbihzaG9ydGVzdFBhdGhbMF0sIGdyaWQpO1xuICAgIHRoaXMuYW5pbWF0aW5nID0gdHJ1ZTtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5tb3ZlVG8oc2hvcnRlc3RQYXRoWzBdLCBncmlkLCBmdW5jdGlvbigpIHtcbiAgICAgICAgc2VsZi5hbmltYXRpbmcgPSBmYWxzZTtcbiAgICAgICAgc2VsZi50b29rVHVybiA9IHRydWU7XG4gICAgfSk7XG5cblxufTtcblxuLy8gdG9kbzogYW5pbWF0ZVxuQUkucHJvdG90eXBlLm1vdmVUbyA9IGZ1bmN0aW9uKHRpbGUsIGdyaWQsIGNiKSB7XG4gICAgaWYgKCF0aWxlKSByZXR1cm5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cblxuICAgIHV0aWxzLmFuaW1hdGUoZnVuY3Rpb24odikge1xuICAgICAgICBzZWxmLnggPSB1dGlscy5sZXJwKHNlbGYueCwgdGlsZS54LCAwLjUpO1xuICAgICAgICBzZWxmLnkgPSB1dGlscy5sZXJwKHNlbGYueSwgdGlsZS55LCAwLjUpO1xuXG4gICAgICAgIGlmIChNYXRoLnJvdW5kKHNlbGYueCkgPT0gTWF0aC5yb3VuZCh0aWxlLngpICYmIE1hdGgucm91bmQoc2VsZi55KSA9PSBNYXRoLnJvdW5kKHRpbGUueSkpXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG5cbiAgICB9LCBmdW5jdGlvbigpIHtcbiAgICAgICAgc2VsZi5vY2N1cGllZCA9IHRydWU7XG4gICAgICAgIHRoaXMuYW5pbWF0aW5nID0gZmFsc2U7XG4gICAgICAgIGNiKCk7XG4gICAgfSlcbiAgICBzZWxmLmN1cnJlbnRUaWxlLm9jY3VwaWVkID0gZmFsc2U7XG4gICAgdmFyIGJiYiA9IHV0aWxzLnBpeGVsVG9BeGlhbCh0aWxlLnggLSBncmlkLmdyaWRYLCB0aWxlLnkgLSBncmlkLmdyaWRZLCBncmlkLnRpbGVSYWRpdXMpXG4gICAgc2VsZi5jdXJyZW50VGlsZSA9IGdyaWQuZ2V0VGlsZUF4aWFsKGJiYi5xLCBiYmIucik7XG4gICAgc2VsZi5jdXJyZW50VGlsZS5vY2N1cGllZCA9IHRydWU7XG59O1xuXG5cbkFJLnByb3RvdHlwZS53aW4gPSBmdW5jdGlvbihlZGdlVGlsZSwgZ3JpZCkge1xuICAgIGNvbnNvbGUubG9nKFwiQUkgd29uLi4uXCIpXG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5tb3ZlVG8oZWRnZVRpbGUsIGdyaWQsIGZ1bmN0aW9uKCkge1xuICAgICAgICBzZWxmLnNjZW5lLnJlc3RhcnQoKTtcbiAgICB9KVxuXG59O1xuLy8gQUkgaGFzIGxvc3QsIHBsYXllciBoYXMgd29uXG5BSS5wcm90b3R5cGUubG9zZSA9IGZ1bmN0aW9uKCkge1xuICAgIGNvbnNvbGUubG9nKFwiQUkgbG9zdC4uLlwiKVxuICAgIHRoaXMuc2NlbmUuaGFuZGxlUGxheWVyV2luKCk7XG4gICAgdGhpcy5zY2VuZS5yZXN0YXJ0KCk7XG59O1xuXG5BSS5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24oZHQpIHtcblxufTtcblxuQUkucHJvdG90eXBlLmRyYXcgPSBmdW5jdGlvbihjdHgpIHtcbiAgICBjdHguZmlsbFN0eWxlID0gXCIjMDAwXCI7XG4gICAgdXRpbHMuZHJhdy5jaXJjbGUodGhpcy54LCB0aGlzLnksIDEwLCBjdHgpO1xuICAgIGN0eC5maWxsKClcbiAgICB0aGlzLmN1cnJlbnRUaWxlLnNldEZpbGxDb2xvcihbMjU1LCAyMDAsIDIwMF0pXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEFJOyIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbnZhciBTY2VuZSA9IHJlcXVpcmUoXCIuL3NjZW5lLmpzXCIpLFxuICAgIGlucHV0ID0gcmVxdWlyZShcIi4vaW5wdXQuanNcIiksXG4gICAgdXRpbHMgPSByZXF1aXJlKFwiLi91dGlscy5qc1wiKVxuICAgIEhleGFnb24gPSByZXF1aXJlKFwiLi9oZXhhZ29uLmpzXCIpLFxuICAgIEFJID0gcmVxdWlyZShcIi4vQUkuanNcIiksXG4gICAgUGxheWVyID0gcmVxdWlyZShcIi4vcGxheWVyLmpzXCIpLFxuICAgIEdyaWQgPSByZXF1aXJlKFwiLi9ncmlkLmpzXCIpO1xuXG52YXIgR2FtZVNjZW5lID0gbmV3IFNjZW5lKCk7XG5cbnZhciBwbGF5ZXJTY29yZSA9IDA7XG52YXIgbmVlZHNTaG93U2NvcmVab29tQW5pbSA9IGZhbHNlXG5cbkdhbWVTY2VuZS5pbml0ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGhleFJhZGl1cyA9IDM1O1xuICAgIHZhciBoZXhXaWR0aCA9IE1hdGguc3FydCgzKSAvIDIgKiBoZXhSYWRpdXM7IC8vIHNlY3JldGx5IHRoZSByYWRpdXMgaW4gdGhlIHggZGlyZWN0aW9uXG4gICAgdmFyIGNvbHMgPSAxMixcbiAgICAgICAgcm93cyA9IDE0O1xuXG4gICAgdmFyIHNjb3JlRm9udFNpemUgPSAyNDtcblxuICAgIGlmIChuZWVkc1Nob3dTY29yZVpvb21BbmltKSB7XG4gICAgICAgIG5lZWRzU2hvd1Njb3JlWm9vbUFuaW0gPSBmYWxzZTtcbiAgICAgICAgc2NvcmVGb250U2l6ZSA9IDUwO1xuICAgICAgICB1dGlscy5hbmltYXRlKGZ1bmN0aW9uKHN0YXRlKSB7XG4gICAgICAgICAgICBzY29yZUZvbnRTaXplID0gdXRpbHMubGVycChzY29yZUZvbnRTaXplLCAyNCwgMC4xKTtcbiAgICAgICAgICAgIGlmIChNYXRoLmZsb29yKHNjb3JlRm9udFNpemUpID09IDI0KSB7XG4gICAgICAgICAgICAgICAgc2NvcmVGb250U2l6ZSA9IDI0O1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSlcbiAgICB9XG4gICAgLy8gcmVzb3J0aW5nIHRvIGNoZWFwIGhhY2tlcnkgZHVlIHRvIGZydXN0cmF0aW9uXG4gICAgdmFyIHRoZURhbW5IZXhhZ29uID0gbmV3IEhleGFnb24oMCwgMCwgMCwgMCwgaGV4UmFkaXVzKVxuXG4gICAgdmFyIHNpZGVMZW4gPSB0aGVEYW1uSGV4YWdvbi5nZXRTaG9ydERpYWdvbmFsKCkgLyBNYXRoLnNxcnQoMyk7XG5cbiAgICB2YXIgZ3JpZCA9IG5ldyBHcmlkKGFwcC53aWR0aCAvIDIgKyBoZXhXaWR0aCAtIChoZXhXaWR0aCAqIGNvbHMpLFxuICAgICAgICBhcHAuaGVpZ2h0IC8gMiArIGhleFJhZGl1cyAtIChoZXhSYWRpdXMgKiAyKSAqIHJvd3MgLyAyICsgc2lkZUxlbiAqIChyb3dzIC8gMiksIC8vICBjbG9zZSBlbm91Z2guLi4gXG4gICAgICAgIGNvbHMsIHJvd3MsIGhleFJhZGl1cyk7XG5cbiAgICBnbG9iYWwuYmFja2dyb3VuZENvbG9yID0gXCJyZ2IoMjM3LCAyMTcsIDE4NilcIlxuXG4gICAgdGhpcy5pc1BsYXllcnNUdXJuID0gdHJ1ZTtcblxuICAgIHZhciBwbGF5ZXIgPSBuZXcgUGxheWVyKCk7XG4gICAgdmFyIGFpID0gbmV3IEFJKGFwcC53aWR0aCAvIDIsIGFwcC5oZWlnaHQgLyAyLCBncmlkLCB0aGlzKTtcblxuICAgIHRoaXMudXBkYXRlID0gZnVuY3Rpb24oZHQpIHtcbiAgICAgICAgZ3JpZC51cGRhdGUoZHQpO1xuICAgICAgICBwbGF5ZXIudXBkYXRlKGR0KTtcbiAgICAgICAgYWkudXBkYXRlKGR0KTtcblxuICAgICAgICBpZiAodGhpcy5pc1BsYXllcnNUdXJuKVxuICAgICAgICAgICAgcGxheWVyLmhhbmRsZUlucHV0KGdyaWQsIHRoaXMpO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICBhaS5wZXJmb3JtQWN0aW9ucyhncmlkLCB0aGlzKVxuICAgIH1cblxuICAgIHRoaXMucmVzdGFydCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBHYW1lU2NlbmUuZ29Ub1NjZW5lKEdhbWVTY2VuZSlcbiAgICB9XG4gICAgdmFyIGZpeGVkV2lkdGggPSBhcHAud2lkdGggLyAyO1xuICAgIHRoaXMuZHJhdyA9IGZ1bmN0aW9uKGN0eCkge1xuICAgICAgICBncmlkLmRyYXcoY3R4KTtcbiAgICAgICAgcGxheWVyLmRyYXcoY3R4KTtcbiAgICAgICAgYWkuZHJhdyhjdHgpO1xuICAgICAgICBjdHguZm9udCA9ICdpdGFsaWMgJyArIHNjb3JlRm9udFNpemUgKyAncHQgQ2FsaWJyaSc7XG5cbiAgICAgICAgdmFyIHNjb3JlVHh0ID0gXCJZb3VyIHNjb3JlIGlzIFwiICsgcGxheWVyU2NvcmU7XG4gICAgICAgIGN0eC5maWxsVGV4dChzY29yZVR4dCwgZml4ZWRXaWR0aCAtIGN0eC5tZWFzdXJlVGV4dChzY29yZVR4dCkud2lkdGggLyAyLCBncmlkLmdyaWRZKTtcblxuICAgICAgICBjdHguZm9udCA9ICdib2xkIDMycHQgQ2FsaWJyaSc7XG4gICAgICAgIHZhciB0aXRsZVRleHQgPSBcIkRvdCBOb2lyZVwiO1xuXG4gICAgICAgIGN0eC5maWxsVGV4dCh0aXRsZVRleHQsIGZpeGVkV2lkdGggLSBjdHgubWVhc3VyZVRleHQodGl0bGVUZXh0KS53aWR0aCAvIDIsIGdyaWQuZ3JpZFkgLSAzMik7XG4gICAgfVxuXG4gICAgdGhpcy5oYW5kbGVQbGF5ZXJXaW4gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJwbGF5ZXIgd29uIVwiKVxuICAgICAgICBwbGF5ZXJTY29yZSsrO1xuICAgICAgICBuZWVkc1Nob3dTY29yZVpvb21BbmltID0gdHJ1ZTtcbiAgICAgICAgY29uc29sZS5sb2coXCJwbGF5ZXIgc2NvcmUgaXMgbm93XCIsIHBsYXllclNjb3JlKTtcbiAgICB9XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSBHYW1lU2NlbmU7XG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsInZhciBIZXhhZ29uID0gcmVxdWlyZShcIi4vaGV4YWdvbi5qc1wiKTtcbnZhciBpbnB1dCA9IHJlcXVpcmUoXCIuL2lucHV0LmpzXCIpXG52YXIgdXRpbHMgPSByZXF1aXJlKFwiLi91dGlscy5qc1wiKVxudmFyIGNvbG9ycyA9IHtcbiAgICBncmVlbjogW1xuICAgICAgICBbMTA2LCAxOTUsIDE1MV0sXG4gICAgICAgIFs2MSwgMTUwLCAxMDZdXG4gICAgXSxcbiAgICByZWQ6IFtcbiAgICAgICAgWzIyNiwgODgsIDY5XSxcbiAgICAgICAgWzE4MSwgNDIsIDI0XVxuICAgIF0sXG4gICAgeWVsbG93OiBbXG4gICAgICAgIFsyMjYsIDIxMywgODddLFxuICAgICAgICBbMTgxLCAxNjgsIDQyXVxuICAgIF1cbn1cbi8vICBibHVlOiBbXCJyZ2IoNjEsIDE1NCwgMjAyKVwiLCBcInJnYigxNiwgMTA5LCAxODcpXCJdXG5cbnZhciBHcmlkID0gZnVuY3Rpb24oeCwgeSwgbnVtQ29scywgbnVtUm93cywgdGlsZVJhZGl1cykge1xuICAgIHRoaXMudGlsZUhhc2ggPSBbXTtcbiAgICB0aGlzLmZsYXRUaWxlQXJyYXkgPSBbXTtcbiAgICB0aGlzLmVkZ2VUaWxlcyA9IFtdO1xuICAgIHZhciB4T2ZmID0gTWF0aC5jb3MoMzAgKiBNYXRoLlBJIC8gMTgwKSAqIHRpbGVSYWRpdXM7XG4gICAgdmFyIHlPZmYgPSBNYXRoLnNpbigzMCAqIE1hdGguUEkgLyAxODApICogdGlsZVJhZGl1cztcbiAgICB2YXIgZ3JpZFggPSB4O1xuICAgIHZhciBncmlkWSA9IHk7XG4gICAgdGhpcy50aWxlUmFkaXVzID0gdGlsZVJhZGl1cztcblxuICAgIHZhciB0aWxlV2lkdGggPSBNYXRoLnNxcnQoMykgLyAyICogdGhpcy50aWxlUmFkaXVzXG5cblxuICAgIC8vIHggYW5kIHkgb2YgdGhlIGdyaWQgaW4gcGl4ZWxzXG4gICAgdGhpcy5ncmlkWCA9IGdyaWRYO1xuICAgIHRoaXMuZ3JpZFkgPSBncmlkWTtcblxuICAgIC8vIHdpZHRoIGFuZCBoZWlnaHQgb2YgdGhlIGdyaWQgaW4gcGl4ZWxzXG4gICAgdGhpcy5ncmlkSCA9IHRpbGVSYWRpdXMgKiBudW1Sb3dzO1xuICAgIHRoaXMuZ3JpZFcgPSB0aWxlV2lkdGggKiBudW1Db2xzO1xuXG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG51bVJvd3M7IGkrKykge1xuICAgICAgICBmb3IgKGogPSAwOyBqIDwgbnVtQ29sczsgaisrKSB7XG4gICAgICAgICAgICB2YXIgeFBvcyA9IGogKiB4T2ZmICogMiArIGdyaWRYXG4gICAgICAgICAgICBpZiAoaSAlIDIgIT0gMCkge1xuICAgICAgICAgICAgICAgIHhQb3MgKz0geE9mZjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciB5UG9zID0gaSAqIHlPZmYgKiAzICsgZ3JpZFk7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICB2YXIgdGlsZSA9IG5ldyBIZXhhZ29uKHhQb3MsIHlQb3MsIGosIGksIHRpbGVSYWRpdXMpXG4gICAgICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGNvbG9ycyk7XG4gICAgICAgICAgICB2YXIga2V5ID0ga2V5c1tNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBrZXlzLmxlbmd0aCldO1xuICAgICAgICAgICAgdmFyIGNvbG9yID0gY29sb3JzW2tleV07XG4gICAgICAgICAgICBjb2xvciA9IGNvbG9ycy55ZWxsb3c7XG4gICAgICAgICAgICB0aWxlLnNldEZpbGxDb2xvcihjb2xvclswXSk7XG4gICAgICAgICAgICB0aWxlLnNldFNoYWRvd0NvbG9yKGNvbG9yWzFdKVxuICAgICAgICAgICAgaWYgKGkgPT0gbnVtUm93cyAtIDEgfHwgaiA9PSBudW1Db2xzIC0gMSB8fCBpID09IDAgfHwgaiA9PSAwKSB7XG4gICAgICAgICAgICAgICAgdGlsZS5zZXRGaWxsQ29sb3IoY29sb3JbMF0ubWFwKGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHYgLSAxMDBcbiAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgdGlsZS5pc0JvcmRlciA9IHRydWU7XG4gICAgICAgICAgICAgICAgdGhpcy5lZGdlVGlsZXMucHVzaCh0aWxlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNlbGYuYWRkVGlsZSh0aWxlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTUgKyA2KTsgaSsrKSB7XG4gICAgICAgIHZhciB0aWxlID0gdGhpcy5mbGF0VGlsZUFycmF5W01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHRoaXMuZmxhdFRpbGVBcnJheS5sZW5ndGgpXTtcbiAgICAgICAgaWYgKHRpbGUub2NjdXBpZWQgfHwgdGlsZS5pc0JvcmRlcikge1xuICAgICAgICAgICAgaS0tO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgdGlsZS5pc1NvbGlkID0gdHJ1ZTtcbiAgICAgICAgdGlsZS5vY2N1cGllZCA9IHRydWU7XG4gICAgICAgIChmdW5jdGlvbih0aWxlKSB7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHRpbGUuYW5pbWF0aW5nID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB1dGlscy5hbmltYXRlKGZ1bmN0aW9uKHN0YXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjb2xvciA9IHRpbGUuZmlsbENvbG9yLm1hcChmdW5jdGlvbih2KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdiAtIDEwO1xuICAgICAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgICAgICAgIHRpbGUuc2V0RmlsbENvbG9yKGNvbG9yKTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoc3RhdGUgPT0gMClcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChzdGF0ZSA8IDUpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc3RhdGUgKyAxO1xuICAgICAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHRpbGUuYW5pbWF0aW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgfSwgTWF0aC5yYW5kb20oKSAqIDUwMClcbiAgICAgICAgfSkodGlsZSlcbiAgICB9XG59XG5cbi8vIGFkZCBhIHRpbGUgdG8gdGhlIGdyaWRcbkdyaWQucHJvdG90eXBlLmFkZFRpbGUgPSBmdW5jdGlvbih0aWxlKSB7XG4gICAgdGhpcy5mbGF0VGlsZUFycmF5LnB1c2godGlsZSk7XG4gICAgdGhpcy50aWxlSGFzaFtoYXNoWFkodGlsZS5heGlhbFgsIHRpbGUuYXhpYWxZKV0gPSB0aWxlO1xufTtcblxuLy8gZ2l2ZW4gdGhlIGF4aWFsIGNvb3JkaW5hdGVzIG9mIHRoZSB0aWxlIHJldHVybiBpdFxuR3JpZC5wcm90b3R5cGUuZ2V0VGlsZUF4aWFsID0gZnVuY3Rpb24oeCwgeSkge1xuICAgIHJldHVybiB0aGlzLnRpbGVIYXNoW2hhc2hYWSh4LCB5KV07XG59O1xuXG4vLyBnaXZlbiBhIHBhaXIgb2Ygc2NyZWVuLXNwYWNlIHBpeGVsIGNvb3JkaW5hdGVzIHJldHVybiB0aGUgdGlsZSB0aGF0IGVuY2xvc2VzIHRob3NlIHBpeGVsc1xuR3JpZC5wcm90b3R5cGUuZ2V0VGlsZVdvcmxkID0gZnVuY3Rpb24oeCwgeSkge1xuICAgIHJldHVybiB0aGlzLnRpbGVIYXNoW2hhc2hYWSh4LCB5KV07XG59O1xuXG5mdW5jdGlvbiBoYXNoWFkoeCwgeSkge1xuICAgIHJldHVybiBNYXRoLmZsb29yKHgpICsgJywnICsgTWF0aC5mbG9vcih5KTtcbn1cblxuZnVuY3Rpb24gYXhpYWxSb3VuZGVkQ29vcmRzKHEsIHIsIGcpIHtcbiAgICB2YXIgYSA9IHV0aWxzLmF4aWFsVG9DdWJlKHtcbiAgICAgICAgcTogcSxcbiAgICAgICAgcjogclxuICAgIH0pO1xuICAgIHZhciBiID0gdXRpbHMuaGV4Um91bmQoYSk7XG4gICAgdmFyIGMgPSB1dGlscy5jdWJlVG9BeGlhbChiKTtcbiAgICB2YXIgZCA9IGcuZ2V0VGlsZUF4aWFsKGMucSwgYy5yKTtcbiAgICByZXR1cm4gZFxufVxuXG5HcmlkLnByb3RvdHlwZS5uZWlnaGJvcnMgPSBmdW5jdGlvbih0aWxlKSB7XG4gICAgdmFyIG5laWdoYm9ycyA9IFtdO1xuICAgIHZhciByID0gdGhpcy50aWxlUmFkaXVzO1xuICAgIG5laWdoYm9ycy5wdXNoKGF4aWFsUm91bmRlZENvb3Jkcyh0aWxlLmF4aWFsWCwgdGlsZS5heGlhbFkgKyAxLCB0aGlzKSk7IC8vIG5vcnRoIGVhc3RcbiAgICBuZWlnaGJvcnMucHVzaChheGlhbFJvdW5kZWRDb29yZHModGlsZS5heGlhbFggLSAxLCB0aWxlLmF4aWFsWSArIDEsIHRoaXMpKTsgLy8gbm9ydGggd2VzdFxuICAgIG5laWdoYm9ycy5wdXNoKGF4aWFsUm91bmRlZENvb3Jkcyh0aWxlLmF4aWFsWCArIDEsIHRpbGUuYXhpYWxZLCB0aGlzKSk7IC8vIGVhc3RcbiAgICBuZWlnaGJvcnMucHVzaChheGlhbFJvdW5kZWRDb29yZHModGlsZS5heGlhbFggLSAxLCB0aWxlLmF4aWFsWSwgdGhpcykpOyAvLyB3ZXN0XG4gICAgbmVpZ2hib3JzLnB1c2goYXhpYWxSb3VuZGVkQ29vcmRzKHRpbGUuYXhpYWxYICsgMSwgdGlsZS5heGlhbFkgLSAxLCB0aGlzKSk7IC8vIHNvdXRoIGVhc3RcbiAgICBuZWlnaGJvcnMucHVzaChheGlhbFJvdW5kZWRDb29yZHModGlsZS5heGlhbFgsIHRpbGUuYXhpYWxZIC0gMSwgdGhpcykpOyAvLyBzb3V0aCB3ZXN0XG5cbiAgICByZXR1cm4gbmVpZ2hib3JzO1xufTtcblxuXG5HcmlkLnByb3RvdHlwZS5kcmF3ID0gZnVuY3Rpb24oY3R4KSB7XG4gICAgZm9yICh2YXIgayBpbiB0aGlzLnRpbGVIYXNoKVxuICAgICAgICB0aGlzLnRpbGVIYXNoW2tdLmRyYXcoY3R4KTtcbn07XG5cbkdyaWQucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKGR0KSB7XG5cblxuICAgIGZvciAodmFyIGsgaW4gdGhpcy50aWxlSGFzaClcbiAgICAgICAgdGhpcy50aWxlSGFzaFtrXS51cGRhdGUoZHQpO1xufTtcbm1vZHVsZS5leHBvcnRzID0gR3JpZDsiLCJ2YXIgdXRpbHMgPSByZXF1aXJlKFwiLi91dGlscy5qc1wiKVxudmFyIGlucHV0ID0gcmVxdWlyZShcIi4vaW5wdXQuanNcIilcbnZhciBIZXhhZ29uID0gZnVuY3Rpb24oeCwgeSwgYXhYLCBheFksIHIpIHtcblxuICAgIC8vIGNvbnZlcnQgZnJvbSBvZGQtciBzdHlsZSBjb29yZGluYXRlcyB0byBheGlhbCBjb29yZGluYXRlc1xuICAgIHZhciBheCA9IHV0aWxzLmN1YmVUb0F4aWFsKHV0aWxzLm9kZFJUb0N1YmUoe1xuICAgICAgICBxOiBheFgsXG4gICAgICAgIHI6IGF4WVxuICAgIH0pKVxuXG4gICAgdGhpcy5heGlhbFggPSBheC5xO1xuICAgIHRoaXMuYXhpYWxZID0gYXgucjtcblxuICAgIHRoaXMueCA9IHg7XG4gICAgdGhpcy55ID0geTtcblxuXG4gICAgdGhpcy5yID0gcjtcblxuICAgIHRoaXMuc2V0U3Ryb2tlQ29sb3IoWzUsIDUsIDVdKVxuICAgIHRoaXMuc2V0U2hhZG93Q29sb3IoWzAsIDAsIDBdKVxuICAgIHRoaXMuc2V0RmlsbENvbG9yKFswLCAwLCAwXSlcblxuXG4gICAgdGhpcy5wb2x5Z29uYWxWZXJ0aWNlcyA9IFtdO1xuICAgIHRoaXMudmVydHMgPSBbXTtcbiAgICB0aGlzLmVkZ2VzID0gW107XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IDY7IGkrKykge1xuICAgICAgICB2YXIgYW5nbGUgPSBpICogKDIuMCAqIE1hdGguUEkpIC8gNiArICg5MCAqIE1hdGguUEkgLyAxODApO1xuICAgICAgICB2YXIgeHAgPSB0aGlzLnIgKiBNYXRoLmNvcyhhbmdsZSk7XG4gICAgICAgIHZhciB5cCA9IHRoaXMuciAqIE1hdGguc2luKGFuZ2xlKTtcblxuICAgICAgICB2YXIgcG9seWdvbmFsVmVydCA9IHtcbiAgICAgICAgICAgIHg6IHhwLFxuICAgICAgICAgICAgeTogeXBcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5wb2x5Z29uYWxWZXJ0aWNlcy5wdXNoKHBvbHlnb25hbFZlcnQpO1xuICAgIH1cblxufVxuXG5IZXhhZ29uLnByb3RvdHlwZS5pc1dhbGwgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5pc1NvbGlkO1xufTtcbkhleGFnb24ucHJvdG90eXBlLmdldENvc3QgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gMTtcbn07XG5cblxuXG5cbkhleGFnb24ucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKGR0KSB7XG5cbn07XG5cbkhleGFnb24ucHJvdG90eXBlLmRyYXcgPSBmdW5jdGlvbihjdHgpIHtcbiAgICBpZih0aGlzLmlzQm9yZGVyKVxuICAgICAgICByZXR1cm47XG4gICAgY3R4LnNhdmUoKTtcbiAgICBjdHguc2V0VHJhbnNmb3JtKDEsIDAsIDAsIDEsIHRoaXMueCwgdGhpcy55KTtcbiAgICBjdHguZmlsbFN0eWxlID0gdGhpcy5maWxsU2hhZG93Q29sb3JTdHJpbmc7XG4gICAgY3R4LmJlZ2luUGF0aCgpO1xuICAgIGZvciAodmFyIGkgPSB0aGlzLnBvbHlnb25hbFZlcnRpY2VzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgIHZhciBwdCA9IHRoaXMucG9seWdvbmFsVmVydGljZXNbaV1cbiAgICAgICAgY3R4LmxpbmVUbyhwdC54ICsgNSwgcHQueSArIDUpO1xuICAgIH07XG4gICAgY3R4LmNsb3NlUGF0aCgpO1xuICAgIGN0eC5maWxsKCk7XG5cbiAgICBjdHguc3Ryb2tlU3R5bGUgPSB0aGlzLnN0cm9rZUNvbG9yU3RyaW5nO1xuICAgIGN0eC5saW5lV2lkdGggPSAyO1xuICAgIGN0eC5maWxsU3R5bGUgPSB0aGlzLmZpbGxDb2xvclN0cmluZztcbiAgICBjdHguYmVnaW5QYXRoKCk7XG4gICAgZm9yICh2YXIgaSA9IHRoaXMucG9seWdvbmFsVmVydGljZXMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgdmFyIHB0ID0gdGhpcy5wb2x5Z29uYWxWZXJ0aWNlc1tpXVxuICAgICAgICBjdHgubGluZVRvKHB0LngsIHB0LnkpO1xuICAgIH07XG4gICAgY3R4LmNsb3NlUGF0aCgpO1xuICAgIGN0eC5zdHJva2UoKTtcbiAgICBjdHguZmlsbCgpO1xuICAgIC8vIGN0eC5maWxsU3R5bGUgPSBcIiMwMDBcIlxuICAgIC8vIGN0eC5mb250ID0gJ2l0YWxpYyAxMnB0IENhbGlicmknO1xuICAgIC8vIGN0eC5maWxsVGV4dCh0aGlzLmF4aWFsWCArIFwiLFwiICsgdGhpcy5heGlhbFksIC01LCAwKVxuICAgIGN0eC5yZXN0b3JlKCk7XG59O1xuXG5IZXhhZ29uLnByb3RvdHlwZS5zZXRTdHJva2VDb2xvciA9IGZ1bmN0aW9uKGNvbG9yKSB7XG4gICAgdGhpcy5zdHJva2VDb2xvciA9IGNvbG9yO1xuICAgIHRoaXMuc3Ryb2tlQ29sb3JTdHJpbmcgPSBcInJnYihcIiArIGNvbG9yWzBdICsgXCIsXCIgKyBjb2xvclsxXSArIFwiLFwiICsgY29sb3JbMl0gKyBcIilcIjs7XG59O1xuXG5IZXhhZ29uLnByb3RvdHlwZS5zZXRGaWxsQ29sb3IgPSBmdW5jdGlvbihjb2xvcikge1xuICAgIHRoaXMuZmlsbENvbG9yID0gY29sb3I7XG4gICAgdGhpcy5maWxsQ29sb3JTdHJpbmcgPSBcInJnYihcIiArIGNvbG9yWzBdICsgXCIsXCIgKyBjb2xvclsxXSArIFwiLFwiICsgY29sb3JbMl0gKyBcIilcIjtcbn07XG5cbkhleGFnb24ucHJvdG90eXBlLnNldFNoYWRvd0NvbG9yID0gZnVuY3Rpb24oY29sb3IpIHtcbiAgICB0aGlzLmZpbGxTaGFkb3dDb2xvciA9IGNvbG9yO1xuICAgIHRoaXMuZmlsbFNoYWRvd0NvbG9yU3RyaW5nID0gXCJyZ2IoXCIgKyBjb2xvclswXSArIFwiLFwiICsgY29sb3JbMV0gKyBcIixcIiArIGNvbG9yWzJdICsgXCIpXCI7O1xufTtcblxuSGV4YWdvbi5wcm90b3R5cGUuZ2V0U2lkZUxlbmd0aCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnBvbHlnb25hbFZlcnRpY2VzWzFdLnkgLSB0aGlzLnBvbHlnb25hbFZlcnRpY2VzWzJdLnk7XG59O1xuXG5IZXhhZ29uLnByb3RvdHlwZS5nZXRTaG9ydERpYWdvbmFsID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHAxID0gdGhpcy5wb2x5Z29uYWxWZXJ0aWNlc1sxXTtcbiAgICB2YXIgcDIgPSB0aGlzLnBvbHlnb25hbFZlcnRpY2VzWzNdO1xuICAgIHZhciBkaXN0ID0gdXRpbHMuZGlzdChwMS54LCBwMS55LCBwMi54LCBwMi55KTtcbiAgICByZXR1cm4gZGlzdDtcbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBIZXhhZ29uOyIsIm1vZHVsZS5leHBvcnRzLm1vdXNlID0ge1xuICAgIHg6IDAsXG4gICAgeTogMCxcbiAgICBkb3duOiBmYWxzZVxufVxuXG5tb2R1bGUuZXhwb3J0cy5rZXkgPSB7XG4gICAgZG93bjogZmFsc2UsXG4gICAgY29kZTogJydcbn1cblxubW9kdWxlLmV4cG9ydHMuaW5pdCA9IGZ1bmN0aW9uKGNhbnZhcywgZG9jdW1lbnQpIHtcbiAgICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlZG93blwiLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICBtb2R1bGUuZXhwb3J0cy5tb3VzZS5kb3duID0gdHJ1ZTtcbiAgICB9KVxuXG4gICAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZXVwXCIsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzLm1vdXNlLmRvd24gPSBmYWxzZTtcbiAgICB9KVxuXG4gICAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZW1vdmVcIiwgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMubW91c2UueCA9IGV2ZW50LnBhZ2VYO1xuICAgICAgICBtb2R1bGUuZXhwb3J0cy5tb3VzZS55ID0gZXZlbnQucGFnZVk7XG4gICAgfSlcblxuICAgIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwidG91Y2hzdGFydFwiLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICBtb2R1bGUuZXhwb3J0cy5tb3VzZS54ID0gZXZlbnQudGFyZ2V0VG91Y2hlc1swXS5wYWdlWDtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMubW91c2UueSA9IGV2ZW50LnRhcmdldFRvdWNoZXNbMF0ucGFnZVk7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzLm1vdXNlLmRvd24gPSB0cnVlO1xuICAgIH0pXG5cbiAgICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcInRvdWNoZW5kXCIsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzLm1vdXNlLmRvd24gPSBmYWxzZTtcbiAgICB9KVxuXG4gICAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJ0b3VjaG1vdmVcIiwgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMubW91c2UueCA9IGV2ZW50LnRhcmdldFRvdWNoZXNbMF0ucGFnZVg7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzLm1vdXNlLnkgPSBldmVudC50YXJnZXRUb3VjaGVzWzBdLnBhZ2VZO1xuICAgIH0pXG5cbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMua2V5LmRvd24gPSB0cnVlO1xuICAgICAgICBtb2R1bGUuZXhwb3J0cy5rZXkuY29kZSA9IFN0cmluZy5mcm9tQ2hhckNvZGUoZXZlbnQua2V5Q29kZSk7XG4gICAgfSk7XG5cbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXl1cCcsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzLmtleS5kb3duID0gZmFsc2U7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzLmtleS5jb2RlID0gU3RyaW5nLmZyb21DaGFyQ29kZShldmVudC5rZXlDb2RlKTtcbiAgICB9KTtcblxufVxuXG4iLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG5nbG9iYWwuYmFja2dyb3VuZENvbG9yID0gXCIjMDAwXCI7XG5cbnZhciBhcHAgPSB7XG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNhblwiKTtcbiAgICAgICAgdmFyIHdpZHRoID0gd2luZG93LmlubmVyV2lkdGg7XG4gICAgICAgIHZhciBoZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG4gICAgICAgIGNhbnZhcy53aWR0aCA9IHdpZHRoO1xuICAgICAgICBjYW52YXMuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICByZXF1aXJlKCcuL2lucHV0LmpzJykuaW5pdChjYW52YXMsIGRvY3VtZW50KTtcbiAgICAgICAgdGhpcy5jYW52YXMgPSBjYW52YXM7XG4gICAgICAgIHRoaXMud2lkdGggPSB3aWR0aDtcbiAgICAgICAgdGhpcy5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgIHRoaXMuY3R4ID0gdGhpcy5jYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xuICAgICAgICB0aGlzLnN0YXJ0KCk7XG4gICAgfSxcbiAgICBzdGFydDogZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgdmFyIGxvYWRTY2VuZSA9IGZ1bmN0aW9uKG5leHRTY2VuZSkge1xuICAgICAgICAgICAgbmV4dFNjZW5lLmluaXQoKTtcbiAgICAgICAgICAgIGFwcC5jdXJyZW50U2NlbmUgPSBuZXh0U2NlbmU7XG4gICAgICAgICAgICBhcHAuY3VycmVudFNjZW5lLm9uU2NlbmVFbmQobG9hZFNjZW5lKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxvYWRTY2VuZShyZXF1aXJlKCcuL2dhbWVTY2VuZS5qcycpKTtcblxuICAgICAgICB2YXIgbGFzdCA9IG5ldyBEYXRlKCk7XG4gICAgICAgIHZhciBsb29wID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgbm93ID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgIHZhciBjdHggPSBhcHAuY3R4O1xuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IGdsb2JhbC5iYWNrZ3JvdW5kQ29sb3I7XG4gICAgICAgICAgICBjdHguZmlsbFJlY3QoMCwgMCwgYXBwLndpZHRoLCBhcHAuaGVpZ2h0KVxuICAgICAgICAgICAgYXBwLmN1cnJlbnRTY2VuZS51cGRhdGUoKG5vdyAtIGxhc3QpIC8gMTAwMCk7XG4gICAgICAgICAgICBhcHAuY3VycmVudFNjZW5lLmRyYXcoY3R4KTtcbiAgICAgICAgICAgIGxhc3QgPSBub3c7XG4gICAgICAgICAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGxvb3ApO1xuICAgICAgICB9XG5cbiAgICAgICAgbG9vcCgpO1xuICAgIH1cbn1cblxud2luZG93Lm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgIGFwcC5pbml0aWFsaXplKCk7XG59XG5cbndpbmRvdy5vbnJlc2l6ZSA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgYXBwLndpZHRoID0gd2luZG93LmlubmVyV2lkdGg7XG4gICAgYXBwLmhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcbiAgICBhcHAuY2FudmFzLndpZHRoID0gYXBwLndpZHRoXG4gICAgYXBwLmNhbnZhcy5oZWlnaHQgPSBhcHAuaGVpZ2h0XG59XG5cbmdsb2JhbC5hcHAgPSBhcHA7XG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsImZ1bmN0aW9uIGluaXQoZ3JpZCkge1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBncmlkLmZsYXRUaWxlQXJyYXkubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgICAgdmFyIG5vZGUgPSBncmlkLmZsYXRUaWxlQXJyYXlbaV07XG4gICAgICAgIG5vZGUuZiA9IDA7XG4gICAgICAgIG5vZGUuZyA9IDA7XG4gICAgICAgIG5vZGUuaCA9IDA7XG4gICAgICAgIG5vZGUudmlzaXRlZCA9IGZhbHNlO1xuICAgICAgICBub2RlLmNsb3NlZCA9IGZhbHNlO1xuICAgICAgICBub2RlLnBhcmVudCA9IG51bGw7XG4gICAgfVxufVxuXG52YXIgaGV1cmlzdGljcyA9IHtcbiAgICBtYW5oYXR0YW46IGZ1bmN0aW9uKHBvczAsIHBvczEpIHtcbiAgICAgICAgdmFyIGQxID0gTWF0aC5hYnMocG9zMS54IC0gcG9zMC54KTtcbiAgICAgICAgdmFyIGQyID0gTWF0aC5hYnMocG9zMS55IC0gcG9zMC55KTtcbiAgICAgICAgcmV0dXJuIGQxICsgZDI7XG4gICAgfSxcbiAgICBkaWFnb25hbDogZnVuY3Rpb24ocG9zMCwgcG9zMSkge1xuICAgICAgICB2YXIgRCA9IDE7XG4gICAgICAgIHZhciBEMiA9IE1hdGguc3FydCgyKTtcbiAgICAgICAgdmFyIGQxID0gTWF0aC5hYnMocG9zMS54IC0gcG9zMC54KTtcbiAgICAgICAgdmFyIGQyID0gTWF0aC5hYnMocG9zMS55IC0gcG9zMC55KTtcbiAgICAgICAgcmV0dXJuIChEICogKGQxICsgZDIpKSArICgoRDIgLSAoMiAqIEQpKSAqIE1hdGgubWluKGQxLCBkMikpO1xuICAgIH1cbn07XG5cbmZ1bmN0aW9uIHBhdGhUbyhub2RlKSB7XG4gICAgdmFyIGN1cnIgPSBub2RlLFxuICAgICAgICBwYXRoID0gW107XG4gICAgd2hpbGUgKGN1cnIucGFyZW50KSB7XG4gICAgICAgIHBhdGgucHVzaChjdXJyKTtcbiAgICAgICAgY3VyciA9IGN1cnIucGFyZW50O1xuICAgIH1cbiAgICByZXR1cm4gcGF0aC5yZXZlcnNlKCk7XG59XG5cblxubW9kdWxlLmV4cG9ydHMuaGV1cmlzdGljcyA9IGhldXJpc3RpY3M7XG5tb2R1bGUuZXhwb3J0cy5zZWFyY2ggPSBmdW5jdGlvbihncmlkLCBzdGFydCwgZW5kLCBvcHRpb25zKSB7XG4gICAgaW5pdChncmlkKTtcblxuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIHZhciBoZXVyaXN0aWMgPSBvcHRpb25zLmhldXJpc3RpYyB8fCBoZXVyaXN0aWNzLmRpYWdvbmFsO1xuICAgIHZhciBjbG9zZXN0ID0gZmFsc2U7XG5cbiAgICB2YXIgb3BlbkhlYXAgPSBuZXcgQmluYXJ5SGVhcChmdW5jdGlvbihub2RlKSB7XG4gICAgICAgIHJldHVybiBub2RlLmY7XG4gICAgfSk7XG5cbiAgICAvLyBzZXQgdGhlIHN0YXJ0IG5vZGUgdG8gYmUgdGhlIGNsb3Nlc3QgaWYgcmVxdWlyZWRcbiAgICB2YXIgY2xvc2VzdE5vZGUgPSBzdGFydDtcbiAgICBzdGFydC5oID0gaGV1cmlzdGljKHN0YXJ0LCBlbmQpO1xuXG4gICAgb3BlbkhlYXAucHVzaChzdGFydCk7XG5cbiAgICB3aGlsZSAob3BlbkhlYXAuc2l6ZSgpID4gMCkge1xuXG4gICAgICAgIC8vIEdyYWIgdGhlIGxvd2VzdCBmKHgpIHRvIHByb2Nlc3MgbmV4dC4gIEhlYXAga2VlcHMgdGhpcyBzb3J0ZWQgZm9yIHVzLlxuICAgICAgICB2YXIgY3VycmVudE5vZGUgPSBvcGVuSGVhcC5wb3AoKTtcblxuICAgICAgICAvLyBFbmQgY2FzZSAtLSByZXN1bHQgaGFzIGJlZW4gZm91bmQsIHJldHVybiB0aGUgdHJhY2VkIHBhdGguXG4gICAgICAgIGlmIChjdXJyZW50Tm9kZSA9PT0gZW5kKSB7XG4gICAgICAgICAgICByZXR1cm4gcGF0aFRvKGN1cnJlbnROb2RlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE5vcm1hbCBjYXNlIC0tIG1vdmUgY3VycmVudE5vZGUgZnJvbSBvcGVuIHRvIGNsb3NlZCwgcHJvY2VzcyBlYWNoIG9mIGl0cyBuZWlnaGJvcnMuXG4gICAgICAgIGN1cnJlbnROb2RlLmNsb3NlZCA9IHRydWU7XG5cbiAgICAgICAgLy8gRmluZCBhbGwgbmVpZ2hib3JzIGZvciB0aGUgY3VycmVudCBub2RlLlxuICAgICAgICB2YXIgbmVpZ2hib3JzID0gZ3JpZC5uZWlnaGJvcnMoY3VycmVudE5vZGUpO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBpbCA9IG5laWdoYm9ycy5sZW5ndGg7IGkgPCBpbDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgbmVpZ2hib3IgPSBuZWlnaGJvcnNbaV07XG5cbiAgICAgICAgICAgIGlmICghbmVpZ2hib3IpXG4gICAgICAgICAgICAgICAgY29udGludWVcbiAgICAgICAgICAgIGlmIChuZWlnaGJvci5jbG9zZWQgfHwgbmVpZ2hib3IuaXNXYWxsKCkpIHtcbiAgICAgICAgICAgICAgICAvLyBOb3QgYSB2YWxpZCBub2RlIHRvIHByb2Nlc3MsIHNraXAgdG8gbmV4dCBuZWlnaGJvci5cbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVGhlIGcgc2NvcmUgaXMgdGhlIHNob3J0ZXN0IGRpc3RhbmNlIGZyb20gc3RhcnQgdG8gY3VycmVudCBub2RlLlxuICAgICAgICAgICAgLy8gV2UgbmVlZCB0byBjaGVjayBpZiB0aGUgcGF0aCB3ZSBoYXZlIGFycml2ZWQgYXQgdGhpcyBuZWlnaGJvciBpcyB0aGUgc2hvcnRlc3Qgb25lIHdlIGhhdmUgc2VlbiB5ZXQuXG4gICAgICAgICAgICB2YXIgZ1Njb3JlID0gY3VycmVudE5vZGUuZyArIG5laWdoYm9yLmdldENvc3QoY3VycmVudE5vZGUpO1xuICAgICAgICAgICAgdmFyIGJlZW5WaXNpdGVkID0gbmVpZ2hib3IudmlzaXRlZDtcblxuICAgICAgICAgICAgaWYgKCFiZWVuVmlzaXRlZCB8fCBnU2NvcmUgPCBuZWlnaGJvci5nKSB7XG5cbiAgICAgICAgICAgICAgICAvLyBGb3VuZCBhbiBvcHRpbWFsIChzbyBmYXIpIHBhdGggdG8gdGhpcyBub2RlLiAgVGFrZSBzY29yZSBmb3Igbm9kZSB0byBzZWUgaG93IGdvb2QgaXQgaXMuXG4gICAgICAgICAgICAgICAgbmVpZ2hib3IudmlzaXRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgbmVpZ2hib3IucGFyZW50ID0gY3VycmVudE5vZGU7XG4gICAgICAgICAgICAgICAgbmVpZ2hib3IuaCA9IG5laWdoYm9yLmggfHwgaGV1cmlzdGljKG5laWdoYm9yLCBlbmQpO1xuICAgICAgICAgICAgICAgIG5laWdoYm9yLmcgPSBnU2NvcmU7XG4gICAgICAgICAgICAgICAgbmVpZ2hib3IuZiA9IG5laWdoYm9yLmcgKyBuZWlnaGJvci5oO1xuXG4gICAgICAgICAgICAgICAgaWYgKGNsb3Nlc3QpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSWYgdGhlIG5laWdoYm91ciBpcyBjbG9zZXIgdGhhbiB0aGUgY3VycmVudCBjbG9zZXN0Tm9kZSBvciBpZiBpdCdzIGVxdWFsbHkgY2xvc2UgYnV0IGhhc1xuICAgICAgICAgICAgICAgICAgICAvLyBhIGNoZWFwZXIgcGF0aCB0aGFuIHRoZSBjdXJyZW50IGNsb3Nlc3Qgbm9kZSB0aGVuIGl0IGJlY29tZXMgdGhlIGNsb3Nlc3Qgbm9kZVxuICAgICAgICAgICAgICAgICAgICBpZiAobmVpZ2hib3IuaCA8IGNsb3Nlc3ROb2RlLmggfHwgKG5laWdoYm9yLmggPT09IGNsb3Nlc3ROb2RlLmggJiYgbmVpZ2hib3IuZyA8IGNsb3Nlc3ROb2RlLmcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjbG9zZXN0Tm9kZSA9IG5laWdoYm9yO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKCFiZWVuVmlzaXRlZCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBQdXNoaW5nIHRvIGhlYXAgd2lsbCBwdXQgaXQgaW4gcHJvcGVyIHBsYWNlIGJhc2VkIG9uIHRoZSAnZicgdmFsdWUuXG4gICAgICAgICAgICAgICAgICAgIG9wZW5IZWFwLnB1c2gobmVpZ2hib3IpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEFscmVhZHkgc2VlbiB0aGUgbm9kZSwgYnV0IHNpbmNlIGl0IGhhcyBiZWVuIHJlc2NvcmVkIHdlIG5lZWQgdG8gcmVvcmRlciBpdCBpbiB0aGUgaGVhcFxuICAgICAgICAgICAgICAgICAgICBvcGVuSGVhcC5yZXNjb3JlRWxlbWVudChuZWlnaGJvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGNsb3Nlc3QpIHtcbiAgICAgICAgcmV0dXJuIHBhdGhUbyhjbG9zZXN0Tm9kZSk7XG4gICAgfVxuXG4gICAgLy8gTm8gcmVzdWx0IHdhcyBmb3VuZCAtIGVtcHR5IGFycmF5IHNpZ25pZmllcyBmYWlsdXJlIHRvIGZpbmQgcGF0aC5cbiAgICByZXR1cm4gW107XG59O1xuXG5cbmZ1bmN0aW9uIEJpbmFyeUhlYXAoc2NvcmVGdW5jdGlvbikge1xuICAgIHRoaXMuY29udGVudCA9IFtdO1xuICAgIHRoaXMuc2NvcmVGdW5jdGlvbiA9IHNjb3JlRnVuY3Rpb247XG59XG5cbkJpbmFyeUhlYXAucHJvdG90eXBlID0ge1xuICAgIHB1c2g6IGZ1bmN0aW9uKGVsZW1lbnQpIHtcbiAgICAgICAgLy8gQWRkIHRoZSBuZXcgZWxlbWVudCB0byB0aGUgZW5kIG9mIHRoZSBhcnJheS5cbiAgICAgICAgdGhpcy5jb250ZW50LnB1c2goZWxlbWVudCk7XG5cbiAgICAgICAgLy8gQWxsb3cgaXQgdG8gc2luayBkb3duLlxuICAgICAgICB0aGlzLnNpbmtEb3duKHRoaXMuY29udGVudC5sZW5ndGggLSAxKTtcbiAgICB9LFxuICAgIHBvcDogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIFN0b3JlIHRoZSBmaXJzdCBlbGVtZW50IHNvIHdlIGNhbiByZXR1cm4gaXQgbGF0ZXIuXG4gICAgICAgIHZhciByZXN1bHQgPSB0aGlzLmNvbnRlbnRbMF07XG4gICAgICAgIC8vIEdldCB0aGUgZWxlbWVudCBhdCB0aGUgZW5kIG9mIHRoZSBhcnJheS5cbiAgICAgICAgdmFyIGVuZCA9IHRoaXMuY29udGVudC5wb3AoKTtcbiAgICAgICAgLy8gSWYgdGhlcmUgYXJlIGFueSBlbGVtZW50cyBsZWZ0LCBwdXQgdGhlIGVuZCBlbGVtZW50IGF0IHRoZVxuICAgICAgICAvLyBzdGFydCwgYW5kIGxldCBpdCBidWJibGUgdXAuXG4gICAgICAgIGlmICh0aGlzLmNvbnRlbnQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdGhpcy5jb250ZW50WzBdID0gZW5kO1xuICAgICAgICAgICAgdGhpcy5idWJibGVVcCgwKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG4gICAgcmVtb3ZlOiBmdW5jdGlvbihub2RlKSB7XG4gICAgICAgIHZhciBpID0gdGhpcy5jb250ZW50LmluZGV4T2Yobm9kZSk7XG5cbiAgICAgICAgLy8gV2hlbiBpdCBpcyBmb3VuZCwgdGhlIHByb2Nlc3Mgc2VlbiBpbiAncG9wJyBpcyByZXBlYXRlZFxuICAgICAgICAvLyB0byBmaWxsIHVwIHRoZSBob2xlLlxuICAgICAgICB2YXIgZW5kID0gdGhpcy5jb250ZW50LnBvcCgpO1xuXG4gICAgICAgIGlmIChpICE9PSB0aGlzLmNvbnRlbnQubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgdGhpcy5jb250ZW50W2ldID0gZW5kO1xuXG4gICAgICAgICAgICBpZiAodGhpcy5zY29yZUZ1bmN0aW9uKGVuZCkgPCB0aGlzLnNjb3JlRnVuY3Rpb24obm9kZSkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNpbmtEb3duKGkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmJ1YmJsZVVwKGkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBzaXplOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29udGVudC5sZW5ndGg7XG4gICAgfSxcbiAgICByZXNjb3JlRWxlbWVudDogZnVuY3Rpb24obm9kZSkge1xuICAgICAgICB0aGlzLnNpbmtEb3duKHRoaXMuY29udGVudC5pbmRleE9mKG5vZGUpKTtcbiAgICB9LFxuICAgIHNpbmtEb3duOiBmdW5jdGlvbihuKSB7XG4gICAgICAgIC8vIEZldGNoIHRoZSBlbGVtZW50IHRoYXQgaGFzIHRvIGJlIHN1bmsuXG4gICAgICAgIHZhciBlbGVtZW50ID0gdGhpcy5jb250ZW50W25dO1xuXG4gICAgICAgIC8vIFdoZW4gYXQgMCwgYW4gZWxlbWVudCBjYW4gbm90IHNpbmsgYW55IGZ1cnRoZXIuXG4gICAgICAgIHdoaWxlIChuID4gMCkge1xuXG4gICAgICAgICAgICAvLyBDb21wdXRlIHRoZSBwYXJlbnQgZWxlbWVudCdzIGluZGV4LCBhbmQgZmV0Y2ggaXQuXG4gICAgICAgICAgICB2YXIgcGFyZW50TiA9ICgobiArIDEpID4+IDEpIC0gMSxcbiAgICAgICAgICAgICAgICBwYXJlbnQgPSB0aGlzLmNvbnRlbnRbcGFyZW50Tl07XG4gICAgICAgICAgICAvLyBTd2FwIHRoZSBlbGVtZW50cyBpZiB0aGUgcGFyZW50IGlzIGdyZWF0ZXIuXG4gICAgICAgICAgICBpZiAodGhpcy5zY29yZUZ1bmN0aW9uKGVsZW1lbnQpIDwgdGhpcy5zY29yZUZ1bmN0aW9uKHBhcmVudCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbnRlbnRbcGFyZW50Tl0gPSBlbGVtZW50O1xuICAgICAgICAgICAgICAgIHRoaXMuY29udGVudFtuXSA9IHBhcmVudDtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgJ24nIHRvIGNvbnRpbnVlIGF0IHRoZSBuZXcgcG9zaXRpb24uXG4gICAgICAgICAgICAgICAgbiA9IHBhcmVudE47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEZvdW5kIGEgcGFyZW50IHRoYXQgaXMgbGVzcywgbm8gbmVlZCB0byBzaW5rIGFueSBmdXJ0aGVyLlxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIGJ1YmJsZVVwOiBmdW5jdGlvbihuKSB7XG4gICAgICAgIC8vIExvb2sgdXAgdGhlIHRhcmdldCBlbGVtZW50IGFuZCBpdHMgc2NvcmUuXG4gICAgICAgIHZhciBsZW5ndGggPSB0aGlzLmNvbnRlbnQubGVuZ3RoLFxuICAgICAgICAgICAgZWxlbWVudCA9IHRoaXMuY29udGVudFtuXSxcbiAgICAgICAgICAgIGVsZW1TY29yZSA9IHRoaXMuc2NvcmVGdW5jdGlvbihlbGVtZW50KTtcblxuICAgICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICAgICAgLy8gQ29tcHV0ZSB0aGUgaW5kaWNlcyBvZiB0aGUgY2hpbGQgZWxlbWVudHMuXG4gICAgICAgICAgICB2YXIgY2hpbGQyTiA9IChuICsgMSkgPDwgMSxcbiAgICAgICAgICAgICAgICBjaGlsZDFOID0gY2hpbGQyTiAtIDE7XG4gICAgICAgICAgICAvLyBUaGlzIGlzIHVzZWQgdG8gc3RvcmUgdGhlIG5ldyBwb3NpdGlvbiBvZiB0aGUgZWxlbWVudCxcbiAgICAgICAgICAgIC8vIGlmIGFueS5cbiAgICAgICAgICAgIHZhciBzd2FwID0gbnVsbDtcbiAgICAgICAgICAgIHZhciBjaGlsZDFTY29yZTtcbiAgICAgICAgICAgIC8vIElmIHRoZSBmaXJzdCBjaGlsZCBleGlzdHMgKGlzIGluc2lkZSB0aGUgYXJyYXkpLi4uXG4gICAgICAgICAgICBpZiAoY2hpbGQxTiA8IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgIC8vIExvb2sgaXQgdXAgYW5kIGNvbXB1dGUgaXRzIHNjb3JlLlxuICAgICAgICAgICAgICAgIHZhciBjaGlsZDEgPSB0aGlzLmNvbnRlbnRbY2hpbGQxTl07XG4gICAgICAgICAgICAgICAgY2hpbGQxU2NvcmUgPSB0aGlzLnNjb3JlRnVuY3Rpb24oY2hpbGQxKTtcblxuICAgICAgICAgICAgICAgIC8vIElmIHRoZSBzY29yZSBpcyBsZXNzIHRoYW4gb3VyIGVsZW1lbnQncywgd2UgbmVlZCB0byBzd2FwLlxuICAgICAgICAgICAgICAgIGlmIChjaGlsZDFTY29yZSA8IGVsZW1TY29yZSkge1xuICAgICAgICAgICAgICAgICAgICBzd2FwID0gY2hpbGQxTjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIERvIHRoZSBzYW1lIGNoZWNrcyBmb3IgdGhlIG90aGVyIGNoaWxkLlxuICAgICAgICAgICAgaWYgKGNoaWxkMk4gPCBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB2YXIgY2hpbGQyID0gdGhpcy5jb250ZW50W2NoaWxkMk5dLFxuICAgICAgICAgICAgICAgICAgICBjaGlsZDJTY29yZSA9IHRoaXMuc2NvcmVGdW5jdGlvbihjaGlsZDIpO1xuICAgICAgICAgICAgICAgIGlmIChjaGlsZDJTY29yZSA8IChzd2FwID09PSBudWxsID8gZWxlbVNjb3JlIDogY2hpbGQxU2NvcmUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHN3YXAgPSBjaGlsZDJOO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gSWYgdGhlIGVsZW1lbnQgbmVlZHMgdG8gYmUgbW92ZWQsIHN3YXAgaXQsIGFuZCBjb250aW51ZS5cbiAgICAgICAgICAgIGlmIChzd2FwICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jb250ZW50W25dID0gdGhpcy5jb250ZW50W3N3YXBdO1xuICAgICAgICAgICAgICAgIHRoaXMuY29udGVudFtzd2FwXSA9IGVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgbiA9IHN3YXA7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE90aGVyd2lzZSwgd2UgYXJlIGRvbmUuXG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07IiwidmFyIGlucHV0ID0gcmVxdWlyZShcIi4vaW5wdXQuanNcIik7XG52YXIgdXRpbHMgPSByZXF1aXJlKFwiLi91dGlscy5qc1wiKVxudmFyIFBsYXllciA9IGZ1bmN0aW9uKCkge31cblxuUGxheWVyLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbihkdCkge1xuXG59O1xuXG5QbGF5ZXIucHJvdG90eXBlLmRyYXcgPSBmdW5jdGlvbihjdHgpIHtcblxufTtcblxuUGxheWVyLnByb3RvdHlwZS5oYW5kbGVJbnB1dCA9IGZ1bmN0aW9uKGdyaWQsIHNjZW5lKSB7XG4gICAgaWYgKGlucHV0Lm1vdXNlLmRvd24pIHtcbiAgICAgICAgaW5wdXQubW91c2UuZG93biA9IGZhbHNlO1xuICAgICAgICB2YXIgeCA9IGlucHV0Lm1vdXNlLnggLSBncmlkLmdyaWRYO1xuICAgICAgICB2YXIgeSA9IGlucHV0Lm1vdXNlLnkgLSBncmlkLmdyaWRZO1xuXG4gICAgICAgIHZhciBjb29yZHMgPSB1dGlscy5waXhlbFRvQXhpYWwoeCwgeSwgZ3JpZC50aWxlUmFkaXVzKTtcbiAgICAgICAgdmFyIHRpbGUgPSBncmlkLmdldFRpbGVBeGlhbChjb29yZHMucSwgY29vcmRzLnIpO1xuICAgICAgICAvLyBpZiB0aWxlIGlzIG5vdCB0aGUgQUlcblxuICAgICAgICBpZiAoIXRpbGUgfHwgdGlsZS5vY2N1cGllZCB8fCB0aWxlLmlzQm9yZGVyKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBpZiAodGlsZSAmJiAhdGlsZS5hbmltYXRpbmcpIHtcbiAgICAgICAgICAgIHRpbGUuYW5pbWF0aW5nID0gdHJ1ZTtcblxuICAgICAgICAgICAgdXRpbHMuYW5pbWF0ZShmdW5jdGlvbihzdGF0ZSkge1xuICAgICAgICAgICAgICAgIHZhciBjb2xvciA9IHRpbGUuZmlsbENvbG9yLm1hcChmdW5jdGlvbih2KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB2IC0gMTA7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB0aWxlLmlzU29saWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRpbGUuc2V0RmlsbENvbG9yKGNvbG9yKTtcblxuICAgICAgICAgICAgICAgIGlmIChzdGF0ZSA9PSAwKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgICAgICAgICBlbHNlIGlmIChzdGF0ZSA8IDUpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzdGF0ZSArIDE7XG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB0aWxlLmFuaW1hdGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHNjZW5lLmlzUGxheWVyc1R1cm4gPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB0aWxlLm9jY3VwaWVkID0gdHJ1ZTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAvLyB0aWxlLnNldFNoYWRvd0NvbG9yKGNvbG9yWzFdKTtcbiAgICAgICAgfVxuICAgIH1cblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQbGF5ZXI7IiwiLyoqXG4gKiBQcm90b3R5cGUgZm9yIGFsbCBzY2VuZXNcbiAqKi9cblxudmFyIFNjZW5lID0gZnVuY3Rpb24oKSB7fVxuXG5TY2VuZS5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uKCkge1xuICAgIGNvbnNvbGUubG9nKFwiaW5pdCFcIik7XG59O1xuXG5TY2VuZS5wcm90b3R5cGUub25TY2VuZUVuZCA9IGZ1bmN0aW9uKGNiKSB7XG4gICAgdGhpcy5fb25TY2VuZUVuZENCID0gY2I7XG59O1xuXG5TY2VuZS5wcm90b3R5cGUuZ29Ub1NjZW5lID0gZnVuY3Rpb24obmV4dFNjZW5lKSB7XG4gICAgdGhpcy5fb25TY2VuZUVuZENCKG5leHRTY2VuZSk7XG59O1xuXG5TY2VuZS5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24oZHQpIHtcblxufTtcblxuU2NlbmUucHJvdG90eXBlLmRyYXcgPSBmdW5jdGlvbihjdHgpIHtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTY2VuZTsiLCIvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gbXNjXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vLyByZXR1cm5zIHRydWUgaWYgcG9pbnQgaXMgaW4gd2l0aGluIHNwZWNpZmllZCByZWN0YW5nbGVcbm1vZHVsZS5leHBvcnRzLnBvaW50SW5SZWN0ID0gZnVuY3Rpb24ocHgsIHB5LCByeCwgcnksIHJ3LCByaCkge1xuICAgIHJldHVybiBweCA+IHJ4ICYmIHB5ID4gcnkgJiYgcHggPCByeCArIHJ3ICYmIHB5IDwgcnkgKyByaDtcbn1cblxuLy8gY2FsY3VsYXRlIGV1Y2xpZGlhbiBkaXN0YW5jZVxubW9kdWxlLmV4cG9ydHMuZGlzdCA9IGZ1bmN0aW9uKHgxLCB5MSwgeDIsIHkyKSB7XG4gICAgcmV0dXJuIE1hdGguc3FydCgoKHgyIC0geDEpICogKHgyIC0geDEpKSArICgoeTIgLSB5MSkgKyAoeTIgLSB5MSkpKVxuXG59XG5cbi8vIGNhbGxzIGEgZnVuY3Rpb24gZWFjaCBmcmFtZSwgcGFzc2VzIHJldHVybiB2YWx1ZSB0byBuZXh0IGl0ZXJhdGlvbiB1bnRpbCBpdCByZXR1cm5zIGZhbHNlXG5tb2R1bGUuZXhwb3J0cy5hbmltYXRlID0gZnVuY3Rpb24oYW5pbWF0ZSwgY29tcGxldGUsIHN0YXJ0aW5nVmFsdWUpIHtcbiAgICBjb21wbGV0ZSA9IGNvbXBsZXRlIHx8IGZ1bmN0aW9uKCkge31cbiAgICB2YXIgYW5pbSA9IGZ1bmN0aW9uKGxhc3RSZXN1bHQpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IGFuaW1hdGUobGFzdFJlc3VsdCk7XG4gICAgICAgIGlmIChyZXN1bHQgPT09IGZhbHNlKVxuICAgICAgICAgICAgcmV0dXJuIGNvbXBsZXRlKCk7XG4gICAgICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBhbmltKHJlc3VsdCk7XG4gICAgICAgIH0pXG4gICAgfVxuICAgIGFuaW0oc3RhcnRpbmdWYWx1ZSB8fCAwKTtcbn1cblxubW9kdWxlLmV4cG9ydHMubGVycCA9IGZ1bmN0aW9uKGEsIGIsIHQpIHtcbiAgICByZXR1cm4gKDEgLSB0KSAqIGEgKyB0ICogYjtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIHV0aWxzIGZvciBkcmF3aW5nXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5tb2R1bGUuZXhwb3J0cy5kcmF3ID0ge1xuICAgIGNpcmNsZTogZnVuY3Rpb24oeCwgeSwgciwgY3R4KSB7XG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICAgICAgY3R4LmFyYyh4LCB5LCByLCAwLCAyICogTWF0aC5QSSk7XG4gICAgICAgIGN0eC5zdHJva2UoKTtcbiAgICB9XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyB1dGlscyBmb3IgaGV4IGNvb3Jkc1xuLy8gIHRvZG86IGNoYWluaW5nIHdvdWxkIGJlIG5pY2Vcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8vIGNvbnZlcnRzIGZyb20gb2RkLXIgdG8gY3ViaWNcbm1vZHVsZS5leHBvcnRzLm9kZFJUb0N1YmUgPSBmdW5jdGlvbihvKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgeDogby5xIC0gKG8uciAtIChvLnIgJiAxKSkgLyAyLFxuICAgICAgICB6OiBvLnIsXG4gICAgICAgIHk6IC1vLnggLSBvLnpcbiAgICB9XG59XG5cbi8vIGNvbnZlcnRzIGN1YmljIHRvIGF4aWFsXG5tb2R1bGUuZXhwb3J0cy5jdWJlVG9BeGlhbCA9IGZ1bmN0aW9uKGMpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICBxOiBjLngsXG4gICAgICAgIHI6IGMuelxuICAgIH1cbn1cblxuLy8gY29udmVydHMgYXhpYWwgdG8gY3ViaWNcbm1vZHVsZS5leHBvcnRzLmF4aWFsVG9DdWJlID0gZnVuY3Rpb24oYXgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICB4OiBheC5xLFxuICAgICAgICB6OiBheC5yLFxuICAgICAgICB5OiAtYXgucSAtIGF4LnJcbiAgICB9XG59XG5cbi8vIGNvbnZlcnRzIHBpeGVsIGNvb3JkcyB0byBheGlhbFxubW9kdWxlLmV4cG9ydHMucGl4ZWxUb0F4aWFsID0gZnVuY3Rpb24oeCwgeSwgc2l6ZSkge1xuICAgIHZhciBxID0gKDEgLyAzICogTWF0aC5zcXJ0KDMpICogeCAtIDEgLyAzICogeSkgLyBzaXplO1xuICAgIHZhciByID0gMiAvIDMgKiB5IC8gc2l6ZTtcbiAgICByZXR1cm4gbW9kdWxlLmV4cG9ydHMuY3ViZVRvQXhpYWwobW9kdWxlLmV4cG9ydHMuaGV4Um91bmQobW9kdWxlLmV4cG9ydHMuYXhpYWxUb0N1YmUoe1xuICAgICAgICByOiByLFxuICAgICAgICBxOiBxXG4gICAgfSkpKTtcblxufVxuXG4vLyByb3VuZHMgdG8gbmVhcmVzdCBjdWJpYyBjb29yZGluYXRlXG5tb2R1bGUuZXhwb3J0cy5oZXhSb3VuZCA9IGZ1bmN0aW9uKGN1YmljQ29vcmRzKSB7XG4gICAgdmFyIHggPSBjdWJpY0Nvb3Jkcy54O1xuICAgIHZhciB5ID0gY3ViaWNDb29yZHMueTtcbiAgICB2YXIgeiA9IGN1YmljQ29vcmRzLno7XG4gICAgdmFyIHJ4ID0gTWF0aC5yb3VuZCh4KTtcbiAgICB2YXIgcnkgPSBNYXRoLnJvdW5kKHkpO1xuICAgIHZhciByeiA9IE1hdGgucm91bmQoeik7XG5cbiAgICB2YXIgeF9kaWZmID0gTWF0aC5hYnMocnggLSB4KTtcbiAgICB2YXIgeV9kaWZmID0gTWF0aC5hYnMocnkgLSB5KTtcbiAgICB2YXIgel9kaWZmID0gTWF0aC5hYnMocnogLSB6KTtcblxuICAgIGlmICh4X2RpZmYgPiB5X2RpZmYgJiYgeF9kaWZmID4gel9kaWZmKVxuICAgICAgICByeCA9IC1yeSAtIHJ6O1xuICAgIGVsc2UgaWYgKHlfZGlmZiA+IHpfZGlmZilcbiAgICAgICAgcnkgPSAtcnggLSByejtcbiAgICBlbHNlXG4gICAgICAgIHJ6ID0gLXJ4IC0gcnk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICB4OiByeCxcbiAgICAgICAgeTogcnksXG4gICAgICAgIHo6IHJ6XG4gICAgfTtcbn0iXX0=
