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
    var cols = 12,
        rows = 14;

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
        var titleText = "Dot Noire";

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