
// Imports
var GameMode = require('../gamemodes');
var Entity = require('../entity');

function Commands() {
    this.list = { }; // Empty
}

module.exports = Commands;

// Commands

Commands.list = {
    addbot: function(gameServer,split) {
        var add = parseInt(split[1]);
        if (isNaN(add)) {
            add = 1; // Adds 1 bot if user doesnt specify a number
        }

        for (var i = 0; i < add; i++) {
            gameServer.bots.addBot();
        }
        console.log(gameServer.getName()+" Added "+add+" player bots");
    },
    ban: function(gameServer,split) {
        var ip = split[1]; // Get ip
        if (gameServer.banned.indexOf(ip) == -1) {
            gameServer.banned.push(ip);
            console.log(gameServer.getName()+" Added "+ip+" to the banlist");

            // Remove from game
            for (var i in gameServer.clients) {
                var c = gameServer.clients[i];

                if (!c.remoteAddress) {
                    continue; 
                }

                if (c.remoteAddress == ip) {
                    c.close(); // Kick out
                }
            }
        } else {
            console.log(gameServer.getName()+" That IP is already banned");
        }
    },
    banlist: function(gameServer,split) {
        if ((typeof split[1] != 'undefined') && (split[1].toLowerCase() == "clear")) {
            gameServer.banned = [];
            console.log(gameServer.getName()+" Cleared ban list");
            return;
        }

        console.log(gameServer.getName()+" Current banned IPs ("+gameServer.banned.length+")");
        for (var i in gameServer.banned) {
            console.log(gameServer.banned[i]);
        }
    },
    board: function(gameServer,split) {
        var newLB = [];
        for (var i = 1; i < split.length; i++) {
            newLB[i - 1] = split[i];
        }

        // Clears the update leaderboard function and replaces it with our own
        gameServer.gameMode.packetLB = 48;
        gameServer.gameMode.specByLeaderboard = false;
        gameServer.gameMode.updateLB = function(gameServer) {gameServer.leaderboard = newLB}; 
        console.log(gameServer.getName()+" Successfully changed leaderboard values");
    },
    boardreset: function(gameServer) {
        // Gets the current gamemode
        var gm = GameMode.get(gameServer.gameMode.ID);
        
        // Replace functions
        gameServer.gameMode.packetLB = gm.packetLB;
        gameServer.gameMode.updateLB = gm.updateLB; 
        console.log(gameServer.getName()+" Successfully reset leaderboard");
    },
    change: function(gameServer,split) {
        var key = split[1];
        var value = split[2];

        // Check if int/float
        if (value.indexOf('.') != -1) {
            value = parseFloat(value);
        } else {
            value = parseInt(value);
        }

        if (typeof gameServer.config[key] != 'undefined') {
            gameServer.config[key] = value;
            console.log(gameServer.getName()+" Set " + key + " to " + value);
        } else {
            console.log(gameServer.getName()+" Invalid config value");
        }
    },
    clear: function() {
        process.stdout.write("\u001b[2J\u001b[0;0H");
    },
    color: function(gameServer,split) {
        // Validation checks
        var id = parseInt(split[1]);
        if (isNaN(id)) {
            console.log(gameServer.getName()+" Please specify a valid player ID!");
            return;
        }

        var color = {r: 0, g: 0, b: 0};
        color.r = Math.max(Math.min(parseInt(split[2]), 255), 0);
        color.g = Math.max(Math.min(parseInt(split[3]), 255), 0);
        color.b = Math.max(Math.min(parseInt(split[4]), 255), 0);

        // Sets color to the specified amount
        for (var i in gameServer.clients) {
            if (gameServer.clients[i].playerTracker.pID == id) {
                var client = gameServer.clients[i].playerTracker;
                client.setColor(color); // Set color
                for (var j in client.cells) {
                    client.cells[j].setColor(color);
                }
                break;
            }
        }
    },
    food: function(gameServer,split) {
        var pos = {x: parseInt(split[1]), y: parseInt(split[2])};
        var mass = parseInt(split[3]);

        // Make sure the input values are numbers
        if (isNaN(pos.x) || isNaN(pos.y)) {
            console.log(gameServer.getName()+" Invalid coordinates");
            return;
        }

        if (isNaN(mass)) {
            mass = gameServer.config.foodStartMass;
        }

        // Spawn
        var f = new Entity.Food(gameServer.getNextNodeId(), null, pos, mass);
        f.setColor(gameServer.getRandomColor());
        gameServer.addNode(f);
        gameServer.currentFood++; 
        console.log(gameServer.getName()+" Spawned 1 food cell at ("+pos.x+" , "+pos.y+")");
    },
    gamemode: function(gameServer,split) {
        try {
            var n = parseInt(split[1]);
            var gm = GameMode.get(n); // If there is an invalid gamemode, the function will exit
            gameServer.gameMode.onChange(gameServer); // Reverts the changes of the old gamemode
            gameServer.gameMode = gm; // Apply new gamemode
            gameServer.gameMode.onServerInit(gameServer); // Resets the server
            console.log(gameServer.getName()+" Changed game mode to " + gameServer.gameMode.name);
        } catch (e) {
            console.log(gameServer.getName()+" Invalid game mode selected");
        }
    },
    kill: function(gameServer,split) {
        var id = parseInt(split[1]);
        if (isNaN(id)) {
            console.log(gameServer.getName()+" Please specify a valid player ID!");
            return;
        }

        var count = 0;
        for (var i in gameServer.clients) {
            if (gameServer.clients[i].playerTracker.pID == id) {
                var client = gameServer.clients[i].playerTracker;
                var len = client.cells.length;
                for (var j = 0; j < len; j++) {
                    gameServer.removeNode(client.cells[0]);
                    count++;
                }

                console.log(gameServer.getName()+" Removed " + count + " cells");
                break;
            }
        }
    },
    killall: function(gameServer,split) {
        var count = 0;
        var len = gameServer.nodesPlayer.length;
        for (var i = 0; i < len; i++) {
            gameServer.removeNode(gameServer.nodesPlayer[0]);
            count++;
        }
        console.log(gameServer.getName()+" Removed " + count + " cells");
    },
    mass: function(gameServer,split) {
        // Validation checks
        var id = parseInt(split[1]);
        if (isNaN(id)) {
            console.log(gameServer.getName()+" Please specify a valid player ID!");
            return;
        }
        
        var amount = Math.max(parseInt(split[2]),9);
        if (isNaN(amount)) {
            console.log(gameServer.getName()+" Please specify a valid number");
            return;
        }

        // Sets mass to the specified amount
        for (var i in gameServer.clients) {
            if (gameServer.clients[i].playerTracker.pID == id) {
                var client = gameServer.clients[i].playerTracker;
                for (var j in client.cells) {
                    client.cells[j].mass = amount;
                }

                console.log(gameServer.getName()+" Set mass of "+client.name+" to "+amount);
                break;
            }
        }
    },
    playerlist: function(gameServer,split) {
        console.log(gameServer.getName()+" Showing "+gameServer.clients.length+" players: ");
        for (var i = 0; i < gameServer.clients.length; i++) {
            var client = gameServer.clients[i].playerTracker;
            
            // Get ip
            var ip = "BOT";
            if (typeof gameServer.clients[i].remoteAddress != 'undefined' ) {
                ip = gameServer.clients[i].remoteAddress;
            }

            // Get name and data
            var nick, data;
            if (client.spectate) {
                try { 
                    // Get spectated player
                    if (gameServer.getMode().specByLeaderboard) { // Get spec type
                        nick = gameServer.leaderboard[client.spectatedPlayer].name;
                    } else {
                        nick = gameServer.clients[client.spectatedPlayer].playerTracker.name;
                    }
                } catch (e) { 
                    // Specating nobody
                    nick = "";
                }
                nick = (nick == "") ? "An unnamed cell" : nick;
                data = "Spectating: " + nick;
            } else if (client.cells.length > 0) {
                nick = (client.name == "") ? "An unnamed cell" : client.name;
                data = "Nick: "+nick+"  Cells: "+client.cells.length+"  Score: "+client.getScore()+"  Position: ("+client.centerPos.x+" , "+client.centerPos.y+")";
            } else { 
                // No cells = dead player or in-menu
                data = "Dead"
            }
            
            // Output
            console.log("ID: "+(client.pID)+"  IP: "+ip+"  "+data);
        }
    },
    pause: function(gameServer,split) {
        gameServer.run = !gameServer.run; // Switches the pause state
        var s = gameServer.run ? "Unpaused" : "Paused";
        console.log(gameServer.getName()+" " + s + " the game.");
    },
    select: function(gameServer,split,masterServer) {
        var id = parseInt(split[1]);
        if (isNaN(id)) {
            console.log(gameServer.getName()+" Please specify a realm ID!");
            return;
        }

        if (masterServer) {
            masterServer.swap(id);
        } else {
            console.log(gameServer.getName()+" Master server not found!");
        }
    },
    status: function(gameServer,split) {
        // Get amount of humans/bots
        var humans = 0, bots = 0;
        for (var i = 0; i < gameServer.clients.length; i++) {
            if ('_socket' in gameServer.clients[i]) {
                humans++;
            } else {
                bots++;
            }
        }
        //
        console.log(gameServer.getName()+" Connected players: "+gameServer.clients.length+"/"+gameServer.config.serverMaxConnections);
        console.log(gameServer.getName()+" Players: "+humans+" Bots: "+bots);
        console.log(gameServer.getName()+" Server has been running for "+process.uptime()+" seconds.");
        console.log(gameServer.getName()+" Current memory usage: "+process.memoryUsage().heapUsed/1000+"/"+process.memoryUsage().heapTotal/1000+" kb");
        console.log(gameServer.getName()+" Current game mode: "+gameServer.gameMode.name);
    },
    tp: function(gameServer,split) {
        var id = parseInt(split[1]);
        if (isNaN(id)) {
            console.log(gameServer.getName()+" Please specify a valid player ID!");
            return;
        }

        // Make sure the input values are numbers
        var pos = {x: parseInt(split[2]), y: parseInt(split[3])};      
        if (isNaN(pos.x) || isNaN(pos.y)) {
            console.log(gameServer.getName()+" Invalid coordinates");
            return;
        }
        
        // Spawn
        for (var i in gameServer.clients) {
            if (gameServer.clients[i].playerTracker.pID == id) {
                var client = gameServer.clients[i].playerTracker;
                for (var j in client.cells) {
                    client.cells[j].position.x = pos.x;
                    client.cells[j].position.y = pos.y;
                }

                console.log(gameServer.getName()+" Teleported "+client.name+" to ("+pos.x+" , "+pos.y+")");
                break;
            }
        }
    },
    unban: function(gameServer,split) {
        var ip = split[1]; // Get ip
        var index = gameServer.banned.indexOf(ip);
        if (index > -1) {
            gameServer.banned.splice(index,1);
            console.log(gameServer.getName()+" Unbanned "+ip);
        } else {
            console.log(gameServer.getName()+" That IP is not banned");
        }
    },
    virus: function(gameServer,split) {
        var pos = {x: parseInt(split[1]), y: parseInt(split[2])};
        var mass = parseInt(split[3]);
         
        // Make sure the input values are numbers
        if (isNaN(pos.x) || isNaN(pos.y)) {
            console.log(gameServer.getName()+" Invalid coordinates");
            return;
        } if (isNaN(mass)) {
            mass = gameServer.config.virusStartMass;
        }
        
        // Spawn
        var v = new Entity.Virus(gameServer.getNextNodeId(), null, pos, mass);
        gameServer.addNode(v);
        console.log(gameServer.getName()+" Spawned 1 virus at ("+pos.x+" , "+pos.y+")");
    },
};

// Master server commands

Commands.master = {
    add: function(masterServer,split) {
        if (typeof masterServer.REGIONS[split[1]] == 'undefined') {
            console.log(masterServer.getName()+" Invalid region name!");
        } else {
            // Adds
            masterServer.addServer(split[1]);
        }
    },
    all: function(masterServer,split) {
        var com = split[1];
        if (typeof com == 'undefined') {
            console.log(masterServer.getName()+" Invalid string!");
            return;
        }

        split.splice(0,1); // Removes the "all" command

        for (var i in masterServer.gameServers) {
            var gs = masterServer.gameServers[i];
            gs.commands[com].execute(gs,split,masterServer);
        }
    },
    select: function(masterServer,split) {
        var id = parseInt(split[1]);
        if (isNaN(id)) {
            console.log(masterServer.getName()+" Please specify a realm ID!");
            return;
        }

        if (masterServer) {
            masterServer.swap(id);
        } else {
            console.log(masterServer.getName()+" Master server not found!");
        }
    },
    serverlist: function(masterServer) {
        console.log(masterServer.getName()+" Showing connected servers: ");
        for (var i in masterServer.gameServers) {
            var gs = masterServer.gameServers[i];

            if (gs) { // Do not show deleted game servers
                console.log("ID: "+gs.realmID+"  Port: "+gs.config.serverPort+"  Mode: "+gs.gameMode.name+"  Players: "+gs.clients.length+"/"+gs.config.serverMaxConnections);
            }
        }
    },
    remove: function(masterServer,split) {
        var id = parseInt(split[1]);
        if (isNaN(id)) {
            console.log(masterServer.getName()+" Please specify a realm ID!");
            return;
        }

        // Removes
        masterServer.removeServer(id,true);
    },
};
