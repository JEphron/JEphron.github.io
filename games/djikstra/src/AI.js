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