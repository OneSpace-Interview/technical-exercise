//Building a level object that takes the level as an argument.
function Level(plan) {
    this.width = plan[0].length;
    this.height = plan.length;
    this.grid = [];
    this.actors = [];

    //Building the grid property of this.plan.

    for (var y = 0; y < this.height; y++) {
        var line = plan[y];
        var gridLine = [];
        for (var x = 0; x < this.width; x++) {
            var ch = line[x];
            var fieldType = null;
            var Actor = actorChars[ch];
            if (Actor)
                this.actors.push(new Actor(new Vector(x, y), ch))
            else if (ch == "x")
                fieldType = "wall";
            else if (ch == "!")
                fieldType = "lava";
            gridLine.push(fieldType);
        }
        this.grid.push(gridLine);
    }

    //Finishing out the Level constructor.
    this.player = this.actors.filter(function(actor) {
        return actor.type == "player";
    })[0];
    this.status = this.finishDelay = null; //finishDelay is a placeholder right now. Will be an animation at the completion of the level.
}

Level.prototype.isFinished = function() { 
    return this.status != null && this.finishDelay < 0;
};

//Establishing our actors - Player, Coin and Lava.
function Vector(x, y) {
    this.x = x;
    this.y = y;
};
Vector.prototype.plus = function(other) {
    return new Vector(this.x + other.x, this.y + other.y);
};
Vector.prototype.times = function(factor) {
    return new Vector(this.x * factor, this.y * factor);
};


// Object that defines the keys used in designing the levels in the gameLevels array
var actorChars = {
    "@": Player,
    "o": Coin,
    "=": Lava,
    "v": Lava,
    "|": Lava
};

function Player(pos) {
    this.pos = pos.plus(new Vector(0, -0.5)); //Accounting for the size/pos difference
    this.size = new Vector(0.8, 1.5);
    this.speed = new Vector(0, 0); //Don't understand how a vector point will be used for speed, but I will find that out as we add effects later on.
}
Player.prototype.type = "player";

function Lava(pos, ch) {
    this.pos = pos;
    this.size = new Vector(1, 1);
    if (ch == "=") {
        if (selectedDifficulty == "Hard") { 
            this.speed = new Vector(18, 0); //increases speed of elements based on selected difficulty
        } else if (selectedDifficulty == "Medium") {
            this.speed = new Vector(6, 0);
        } else {
            this.speed = new Vector(2, 0);
        }   
    } else if (ch == "|") {
        if (selectedDifficulty == "Hard") {
            this.speed = new Vector(0, 8);
        } else if (selectedDifficulty == "Medium") {
            this.speed = new Vector(0, 4);
        } else {
            this.speed = new Vector(0, 2);
        }
    } else if (ch == "v") {
        if (selectedDifficulty == "Hard") {
            this.speed = new Vector(0, 8);
        } else if (selectedDifficulty == "Medium") {
            this.speed = new Vector(0, 4);
        } else {
            this.speed = new Vector(0, 2);
        }
        this.repeatPos = pos;
    }
}
Lava.prototype.type = "lava";

function Coin(pos) { //creates coin with animation awarded for completing a level
    this.basePos = this.pos = pos.plus(new Vector(0.2, 0.1));
    this.size = new Vector(0.6, 0.6);
    this.wobble = Math.random() * Math.PI * 2; //Giving the coin a wobble later on, so this randomizes the starting point of the wobble.
}
Coin.prototype.type = "coin";

//Establishing the code to draw the game to the browser.
//Removed the elt function and placed it in platform-game-difficulty.js

function DOMDisplay(parent, level) {
    this.wrap = parent.appendChild(elt("div", "game"));
    this.level = level;

    this.wrap.appendChild(this.drawBackground());
    this.actorLayer = null;
    this.drawFrame();
}

var scale = 20; //setting the px scale for a grid block.

DOMDisplay.prototype.drawBackground = function() {
    var table = elt("table", "background");
    table.style.width = this.level.width * scale + "px";
    this.level.grid.forEach(function(row) {
        var rowElt = table.appendChild(elt("tr"));
        rowElt.style.height = scale + "px";
        row.forEach(function(type) {
            rowElt.appendChild(elt("td", type));
        });
    });
    return table;
};

//Drawing the actors
DOMDisplay.prototype.drawActors = function() {
    var wrap = elt("div");
    this.level.actors.forEach(function(actor) {
        var rect = wrap.appendChild(elt("div", "actor " + actor.type));

        rect.style.width = actor.size.x * scale + "px";
        rect.style.height = actor.size.y * scale + "px";
        rect.style.left = actor.pos.x * scale + "px";
        rect.style.top = actor.pos.y * scale + "px";
    });
    return wrap;
};

DOMDisplay.prototype.drawFrame = function() {
    if (this.actorLayer) {
        this.wrap.removeChild(this.actorLayer);
    }
    this.actorLayer = this.wrap.appendChild(this.drawActors());
    this.wrap.className = "game " + (this.level.status || "");
    this.scrollPlayerIntoView();
};

DOMDisplay.prototype.scrollPlayerIntoView = function() {
    var width = this.wrap.clientWidth;
    var height = this.wrap.clientHeight;
    var margin = width / 3;
    //The viewport
    var left = this.wrap.scrollLeft;
    var right = left + width;
    var top = this.wrap.scrollTop;
    var bottom = top + height;

    var player = this.level.player;
    var center = player.pos.plus(player.size.times(0.5)).times(scale);

    if (center.x < left + margin) {
        this.wrap.scrollLeft = center.x - margin;
    } else if (center.x > right - margin) {
        this.wrap.scrollLeft = center.x + margin - width;
    }

    if (center.y < top + margin) {
        this.wrap.scrollTop = center.y - margin;
    } else if (center.y > bottom - margin) {
        this.wrap.scrollTop = center.y + margin - height;
    }
}

DOMDisplay.prototype.clear = function() {
    this.wrap.parentNode.removeChild(this.wrap);
};

//Beginning the build for motion and interaction.
//Creating a method for level to identify collisions.
Level.prototype.obstacleAt = function(pos, size) {
    var xStart = Math.floor(pos.x);
    var xEnd = Math.ceil(pos.x + size.x);
    var yStart = Math.floor(pos.y);
    var yEnd = Math.ceil(pos.y + size.y);

    if (xStart < 0 || xEnd > this.width || yStart < 0) {
        return "wall";
    }
    if (yEnd > this.height) {
        return "lava";
    }
    for (var y = yStart; y < yEnd; y++) {
        for (var x = xStart; x < xEnd; x++) {
            var fieldType = this.grid[y][x];
            if (fieldType) {
                return fieldType;
            }
        }
    }
};
//below deals with player positioning and movement thorughout the game
Level.prototype.actorAt = function(actor) { 
    for (var i = 0; i < this.actors.length; i++) {
        var other = this.actors[i];
        if (other != actor &&
            actor.pos.x + actor.size.x > other.pos.x && actor.pos.x < other.pos.x + other.size.x &&
            actor.pos.y + actor.size.y > other.pos.y && actor.pos.y < other.pos.y + other.size.y) {
            return other;
        }
    }
}

var maxStep = 0.05;

Level.prototype.animate = function(step, keys) {
    if (this.status != null) {
        this.finishDelay -= step;
    }
    while (step > 0) {
        var thisStep = Math.min(step, maxStep);
        this.actors.forEach(function(actor) {
            actor.act(thisStep, this, keys);
        }, this);
        step -= thisStep;
    }
};

Level.prototype.playerTouched = function(type, actor) { //this kills the player if they touch lava, and sets the game status to lost so it will start over
    if (type == "lava" && (this.status == null || this.status == "won")) {
        this.status = "lost";
        this.finishDelay = 1;
    } else if (type == "coin") {
        this.actors = this.actors.filter(function(other) {
            return other != actor;
        });
        if (!this.actors.some(function(actor) {
                return actor.type == "coin";
            })) {
            this.status = "won";
            this.finishDelay = 1;
        }
    }
};

//Creating act methods for each actor type.

Lava.prototype.act = function(step, level) { 
    var newPos = this.pos.plus(this.speed.times(step));
    if (!level.obstacleAt(newPos, this.size)) {
        this.pos = newPos;
    } else if (this.repeatPos) {
        this.pos = this.repeatPos;
    } else {
        this.speed = this.speed.times(-1);
    }
};

var wobbleSpeed = 8;
var wobbleDist = 0.07;

Coin.prototype.act = function(step) {
    this.wobble += step * wobbleSpeed;
    var wobblePos = Math.sin(this.wobble) * wobbleDist; //coin animations
    this.pos = this.basePos.plus(new Vector(0, wobblePos));
};

var playerSpeed = 7;

//Player movement attached to keystroke
Player.prototype.moveX = function(step, level, keys) {
    this.speed.x = 0;
    if (keys.left) { this.speed.x -= playerSpeed; };
    if (keys.right) { this.speed.x += playerSpeed; };

    var motion = new Vector(this.speed.x * step, 0);
    var newPos = this.pos.plus(motion);
    var obstacle = level.obstacleAt(newPos, this.size);
    if (obstacle) {
        level.playerTouched(obstacle);
    } else {
        this.pos = newPos;
    };
};

var gravity = 30;
var jumpSpeed = 17;

//This handles vertical movement ie jumping
Player.prototype.moveY = function(step, level, keys) {
    this.speed.y += step * gravity;
    var motion = new Vector(0, this.speed.y * step);
    var newPos = this.pos.plus(motion);
    var obstacle = level.obstacleAt(newPos, this.size);
    if (obstacle) { //damages player if they touch an obstacle
        level.playerTouched(obstacle);
        if (keys.up && this.speed.y > 0) {
            this.speed.y = -jumpSpeed;
        } else {
            this.speed.y = 0;
        };
    } else {
        this.pos = newPos;
    };
};

Player.prototype.act = function(step, level, keys) {
    this.moveX(step, level, keys);
    this.moveY(step, level, keys);

    var otherActor = level.actorAt(this);
    if (otherActor) {
        level.playerTouched(otherActor.type, otherActor);
    }

    if (level.status == "lost") {
        this.pos.y += step;
        this.size.y -= step;
    }
};
//Tracking key events
var arrowCodes = {
    37: "left",
    38: "up",
    39: "right"
};
//below code handles keystrokes
function trackKeys(codes) {
    var pressed = Object.create(null);

    function handler(event) {
        if (codes.hasOwnProperty(event.keyCode)) {
            var down = event.type == "keydown";
            pressed[codes[event.keyCode]] = down;
            event.preventDefault();
        }
    }

    addEventListener("keydown", handler);
    addEventListener("keyup", handler);

    return pressed;
}
//Running the game

//To add a timer, I would write a function to add a timing event that starts once a difficulty button is clicked. I'd have a var time = 0; that would increment ++ on each second. Add this in a div element positioned on the game board with CSS.
function runAnimation(frameFunc) {
    var lastTime = null;

    function frame(time) {
        var stop = false;
        if (lastTime != null) {
            var timeStep = Math.min(time - lastTime, 100) / 1000;
            stop = frameFunc(timeStep) === false;
        }
        lastTime = time;
        if (!stop) {
            requestAnimationFrame(frame);
        }
    }
    requestAnimationFrame(frame);
}

var arrows = trackKeys(arrowCodes);

function runLevel(level, Display, andThen) {
    var display = new Display(document.body, level);

    runAnimation(function(step) {
        level.animate(step, arrows);
        display.drawFrame(step);
        if (level.isFinished()) {
            display.clear();
            if (andThen) {
                andThen(level.status);
            }
            return false;
        }
    });
}

function runGame(plans, Display) { 
    var tempDisplay = new Display(document.body, new Level(plans[0]));//Need to remove after the game starts.
    difficulty(Display, plans);
}


runGame(gameLevels, DOMDisplay);
