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

        }
    }

};

module.exports = Player;