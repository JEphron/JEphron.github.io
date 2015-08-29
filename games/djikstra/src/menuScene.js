var Scene = require("./scene.js");
var input = require("./input.js");
var menuUI = require("./menuUI.js");
var GameScene = require("./gameScene.js");

var MenuScene = new Scene();

MenuScene.init = function() {
    this.x = 0;
    this.y = 0;
    this.rectStyle = "#F00F0F";
    this.rectSize = 10;

    var self = this;
    this.UIItems = [];
    this.UIItems.push(new menuUI.Text("blah", "red", "bold 16px Arial", 100, 100))

    this.UIItems.push(new menuUI.Button("START", "green", 100, 290, function() {
        self.goToScene(GameScene)
    }))
    this.UIItems.push(new menuUI.Button("HELP", "green", 400, 290, function() {
        alert("should go to help screen now, or whatever...")
    }))
}

MenuScene.update = function(dt) {
    if (input.mouse.down) {
        console.log(dt);
        this.rectStyle = "rgb(" + Math.floor(Math.random() * 255) + "," + 255 + "," + 0 + ")";
        this.rectSize += 10 * dt;
        this.x -= 5;
        this.y -= 5;
    }

    for (var i = this.UIItems.length - 1; i >= 0; i--) {
        this.UIItems[i].update(dt)
    };
}

MenuScene.draw = function(ctx) {
    ctx.fillStyle = this.rectStyle;
    ctx.fillRect(this.x + input.mouse.x, this.y + input.mouse.y, this.rectSize, this.rectSize)
    for (var i = this.UIItems.length - 1; i >= 0; i--) {
        this.UIItems[i].draw(ctx)
    };
}

module.exports = MenuScene;