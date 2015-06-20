// Imports
var Commands = require('./modules/CommandList');

// Init variables
var runMaster = false;
var showConsole = true;

var masterServer;

var selected = function consoleObj() {
    this.server;
}

// Start msg
console.log("[Ogar] An open source Agar.io server implementation");

process.argv.forEach(function(val) {
    if (val == "--master") {
        runMaster = true;
    }  else if (val == "--noconsole") {
        showConsole = false;
    } else if (val == "--help") {
        console.log("Proper Usage: %s [--master] [--game]", process.argv[0]);
        console.log("    --master            Run the Agar master server.");
        console.log("    --noconsole         Disables the console");
        console.log("    --help              Help menu.");
        console.log("");
        console.log("You can use both options simultaneously to run both the master and game server.");
        console.log("");
    }
});

if (runMaster) {
    // Initialize the master server
    MasterServer = require('./MasterServer');
    masterServer = new MasterServer(selected);
    masterServer.start();
} else {
    // Initialize the game server
    GameServer = require('./GameServer');
    var gameServer = new GameServer(1,'./gameserver.ini');
    gameServer.start();
    // Add command handler
    gameServer.commands = Commands.list;
    selected.server = gameServer; // Selects this server
}

// Initialize the server console
if (showConsole) {
    var readline = require('readline');
    var in_ = readline.createInterface({ input: process.stdin, output: process.stdout });
    setTimeout(prompt, 100);
}

// Console functions

function prompt() {
    in_.question("<"+selected.server.realmID+">", function(str) {
    	parseCommands(str);
        return prompt(); // Too lazy to learn async
    });	
};

function parseCommands(str) {
    // Splits the string
    var split = str.split(" ");

    // Process the first string value
    var first = split[0].toLowerCase();

    // Get command function
    var execute = selected.server.commands[first];
    if (typeof execute != 'undefined') {
        execute(selected.server,split,masterServer);
    } else {
        console.log("[Game:"+selected.server.realmID+"] Invalid Command!");
    }
};
