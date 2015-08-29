var input = require("./input.js");
var utils = require("./utils.js");

var Text = function(str, fill, font, x, y) {
    this.str = str;
    this.fillStyle = fill;
    this.font = font || "bold 16px Arial";
    this.x = x;
    this.y = y;
}

Text.prototype.update = function(dt) {

};

Text.prototype.draw = function(ctx) {
    ctx.fillStyle = this.fillStyle;
    ctx.font = this.font;
    ctx.fillText(this.str, this.x, this.y);

};

var Button = function(str, fill, x, y, cb) {
    this.str = str;
    this.fillStyle = fill;
    this.onClick = cb;
    this.x = x;
    this.y = y;
    this.w = 150;
    this.h = 50;
}

Button.prototype.update = function(dt) {
    this.highlighted = false;
    if (utils.pointInRect(input.mouse.x, input.mouse.y, this.x, this.y, this.w, this.h)) {
        this.highlighted = true;
        if (input.mouse.down)
            this.onClick();
    }
};

Button.prototype.draw = function(ctx) {

    if (this.highlighted)
        ctx.fillStyle = "pink";
    else
        ctx.fillStyle = "red";
    ctx.fillRect(this.x, this.y, this.w, this.h);

    ctx.fillStyle = "green";

    ctx.font = "bold 16px Arial";
    ctx.fillText(this.str, this.x, this.y + 16);

};

module.exports.Text = Text;
module.exports.Button = Button;