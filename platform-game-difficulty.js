function elt(name, className) {
    var elt = document.createElement(name);
    if (className) {
        elt.className = className
    };
    return elt;
}

var selectedDifficulty = null;
var time = null;

function difficulty(Display, plans) {
    //Creating the DOM elements.
    diff = elt("div", "diff");
    diffText = elt("p", "text")
    diffText.textContent = "Select a difficulty:";
    diff.appendChild(diffText);
    diffLevels = ["Easy", "Medium", "Hard"]
    for (var i = 0; i < diffLevels.length; i++) {
        var button = elt("button", "button");
        button.textContent = diffLevels[i];
        diff.appendChild(button);
    }
    document.body.append(diff);

    //Handling the events.
    var butt = document.querySelectorAll("button");
    butt.forEach(function(buttButton) {
        buttButton.addEventListener("click", function(event) {
            selectedDifficulty = buttButton.textContent;
            console.log(selectedDifficulty); //TEST
            document.body.removeChild(diff);
            

            function startLevel(n) {
                runLevel(new Level(plans[n]), Display, function(status) {
                    if (status == "lost") {
                        time = Date.getTime(startLevel());
                        //startLevel(0); // starting from level 1
                    } else if (n < plans.length - 1) {
                        startLevel(n + 1);
                    } else {
                        time -= Date.getTime(); // if this supports math, should be total game time
                        console.log("You win! It took you: " + str(time) + "ms (i think)");
                    }
                });
            }
            time = Date.getTime(startLevel(0)); // maybe?
            //startLevel(0);
        });
    });
}
