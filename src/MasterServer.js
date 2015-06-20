// Imports
var http = require('http');
var qs = require('querystring');
var fs = require("fs");
var ini = require('./modules/ini.js');

var GameServer = require('./GameServer');
var Commands = require('./modules/CommandList');

function MasterServer(selected) {
    this.gameServers = [];
    this.lastID = 1;
    this.selected = selected;

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
                //var key = Object.keys(post)[0];
                //var mode = post[key];
                var key = Object.keys(post)[0].split(':')[0];

                // Send
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.writeHead(200);
                res.end(MS.getServer(key));
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
                var id = this.getNextID();
                var gs = new GameServer(id,'./gameserver'+id+'.ini');
                gs.config.serverPort = this.config.gameserverPort+id;
                gs.start(); // Start server
                // Command handler
                gs.commands = Commands.list;

                this.REGIONS[key].push(gs);
                this.gameServers.push(gs);

                this.selected.server = gs;
            }
        }
    } catch (err) {
        // No config
        console.log(err);

        // Create a new config
        fs.writeFileSync('./masterserver.ini', ini.stringify(this.config));
    }
};

MasterServer.prototype.swap = function(id) {
    var gs = this.gameServers[id - 1];
    if (gs) {
        this.selected.server = gs;
        console.log("[Master] Successfully switched to Game Server "+id);
    } else {
        console.log("[Master] Invalid game server selected!");
    }
}

