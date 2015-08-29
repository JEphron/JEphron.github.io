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

