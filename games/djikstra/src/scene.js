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