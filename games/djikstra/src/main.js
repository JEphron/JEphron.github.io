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