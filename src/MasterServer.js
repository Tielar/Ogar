// Imports
var http = require('http');
var qs = require('querystring');
var fs = require("fs");
var ini = require('./modules/ini.js');

var GameServer = require('./GameServer');
var Commands = require('./modules/CommandList');

function MasterServer(selected) {
    this.gameServers = [];
    this.realmID = 0; // An id of 0 is reserved for the master server
    this.lastID = 1;
    this.selected = selected;
    this.commands = Commands.master;

    this.config = {
        serverIP: "127.0.0.1",
        serverPort: 88,
        gameserverPort: 445,
        updateTime: 60,
        regions: {"US-Fremont":1},
    };

    this.REGIONS;

    this.info = {
        "MASTER_START": 1,
        "regions": {
            "US-Fremont":{"numPlayers":0,"numRealms":1,"numServers":1},
        },
    };
}

module.exports = MasterServer;

var MS;

MasterServer.prototype.start = function() {
    this.loadConfig();
    setInterval(this.onTick.bind(this),this.config.updateTime * 1000);
    this.onTick(); // Init
    MS = this;

    this.httpServer = http.createServer(function(req, res) {
        // Client connection
        //console.log("[Master] Connect: %s:%d", req.connection.remoteAddress, req.connection.remotePort);

        // Handle the request
        if (req.method == 'POST') {
            var body = '';
            req.on('data', function (data) {
                body += data;

                if (body.length > 1e6) {
                    request.connection.destroy();
                }
            });
            req.on('end', function () {
                var post = qs.parse(body);

                // Data
                var key = Object.keys(post)[0];

                if (key in MS.REGIONS) {
                    // Send if region exists
                    post = MS.getServer(key);
                } else {
                    // Region does not exist!
                    post = "0.0.0.0";
                }

                res.setHeader('Access-Control-Allow-Origin', '*');
                res.writeHead(200);
                res.end(post);
            });
        } else if ((req.method == 'GET') && (req.url = "/info")) {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.writeHead(200);
            res.end(JSON.stringify(this.info));
        }

        /*
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.writeHead(200);
        res.end('127.0.0.1:444');
        */
    }.bind(this));

    this.httpServer.listen(this.config.serverPort, function() {
        console.log("[Master] Listening on port %d", this.config.serverPort);
    }.bind(this));

};

MasterServer.prototype.getName = function() {
    // Gets the name of this server. For use in the console
    return "[Master]";
}

MasterServer.prototype.getNextID = function() {
    return this.lastID++;
}

MasterServer.prototype.getServer = function(key) {
    var gs = this.REGIONS[key][Math.floor(Math.random() * this.REGIONS[key].length)];
    return this.config.serverIP+':'+gs.config.serverPort;
}

MasterServer.prototype.onTick = function() {
    this.info = {"MASTER_START": 1};
    this.info.regions = {};
    for (var key in this.REGIONS) {
        var json = {"numPlayers":this.getPlayerAmount(this.REGIONS[key]),"numRealms":this.REGIONS[key].length,"numServers":this.REGIONS[key].length};
        this.info.regions[key] = json;
    }
};

MasterServer.prototype.getPlayerAmount = function(array) {
    var a = 0;
    for (var i in array) {
        a += array[i].clients.length;
    }
    return a;
};

MasterServer.prototype.loadConfig = function() {
    try {
        // Load the contents of the config file
        var load = ini.parse(fs.readFileSync('./masterserver.ini', 'utf-8'));

        // Replace all the default config's values with the loaded config's values
        for (var obj in load) {
            this.config[obj] = load[obj];
        }

        // Parse config
        this.REGIONS = JSON.parse(this.config.regions);
        for (var key in this.REGIONS) {
            var ii = this.REGIONS[key];
            this.REGIONS[key] = [];

            for (var i = 0; i < ii; i++) {
                this.addServer(key);
            }
        }

        // Intial selection
        if (this.gameServers[0]) {
            this.selected.server = this.gameServers[0];
        }
    } catch (err) {
        // No config
        console.log(err);

        // Create a new config
        fs.writeFileSync('./masterserver.ini', ini.stringify(this.config));
    }
};

// Server management

MasterServer.prototype.addServer = function(key) {
    var id = this.getNextID(); // Get new ID

    var gs = new GameServer(id,'./gameserver'+id+'.ini');
    gs.config.serverPort = this.config.gameserverPort+id;
    gs.start(); // Start server

    // Command handler
    gs.commands = Commands.list;

    // Add to region/server list
    this.REGIONS[key].push(gs);
    gs.region = key; // Gameserver variable
    this.gameServers.push(gs); 
};

MasterServer.prototype.removeServer = function(id,log) {
    // Game server
    var gs = this.gameServers[id - 1];
    if (gs) {
        this.gameServers.splice((id - 1),1,null); // Replace with null to keep the array in order

        var index = this.REGIONS[gs.region].indexOf(gs);
        if (index > -1) { // Remove from region array
            this.REGIONS[gs.region].splice(index,1);
        }
        
        gs.socketServer.close(); // Remove
        if (log) console.log(this.getName()+" Removed Game Server with ID: "+id);
    } else {
        if (log) console.log(this.getName()+" Invalid game server selected!");
    }
};

// Console commands

MasterServer.prototype.swap = function(id) {
    if (id == 0) {
        // User wants to slect the master server
        this.selected.server = this;
        console.log(this.getName()+" Switched to Master Server");
        return;
    }

    // Game server
    var gs = this.gameServers[id - 1];
    if (gs) {
        this.selected.server = gs;
        console.log(this.getName()+" Switched to Game Server "+id);
    } else {
        console.log(this.getName()+" Invalid game server selected!");
    }
}
