"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
var Server = require('ws').Server;
var game_utils_1 = require("./game-utils");
var http = require('http');
var port = parseInt((_a = process.env.PORT) !== null && _a !== void 0 ? _a : '0') || 3000;
// Need this HTTP server to run for Adaptable.io hosting
var server = http.createServer(function (req, res) {
    res.end('Daniel\'s Connect4 Server is running!');
}).listen(port, '0.0.0.0');
var socketServer = new Server({ server: server });
socketServer.on('connection', function (ws, req) {
    var _a, _b, _c;
    var url = new URL('wss://example.com' + req.url);
    var gameId = 0;
    var color;
    var name = '';
    if (url.searchParams.has('playerColor') && url.searchParams.has('gameId')) {
        gameId = parseInt((_a = url.searchParams.get('gameId')) !== null && _a !== void 0 ? _a : '0');
        color = game_utils_1.Colors[(_b = url.searchParams.get('playerColor')) !== null && _b !== void 0 ? _b : 'red'];
        name = (_c = url.searchParams.get('playerName')) !== null && _c !== void 0 ? _c : '';
    }
    else {
        gameId = game_utils_1.Player.getCurrentGameId();
        color = (game_utils_1.Player.getPlayerCountForCurrentGameId() === 0 ? game_utils_1.Colors.Red : game_utils_1.Colors.Green);
    }
    var newPlayer = {
        gameId: gameId,
        color: color,
        name: name,
        ws: ws
    };
    game_utils_1.Player.connectNewPlayer(newPlayer);
    game_utils_1.Player.updateGameId();
    console.log('Player connected: Game Id = ' + newPlayer.gameId + ', Color = ' + newPlayer.color);
    var initialDataToSendNewPlayer = {
        gameId: newPlayer.gameId,
        color: newPlayer.color,
        opponentName: ''
    };
    // If opponent already connected, also send name of opponent to the new player
    var opponent = game_utils_1.Player.getOpponent(newPlayer);
    if (opponent) {
        initialDataToSendNewPlayer.opponentName = opponent.name;
    }
    ws.send(JSON.stringify(initialDataToSendNewPlayer));
    ws.on('message', function (data) {
        var messageData = JSON.parse(data);
        // Update player name
        if (messageData.name) {
            newPlayer.name = messageData.name;
        }
        opponent = game_utils_1.Player.getOpponent(newPlayer);
        if (opponent) {
            // Handle player name update
            if (messageData.name) {
                opponent.ws.send(JSON.stringify({
                    opponentName: newPlayer.name
                }));
            }
            // Handle canvas clicks
            if (messageData.action === 'click' && !isNaN(messageData.column)) {
                opponent.ws.send(JSON.stringify({
                    action: messageData.action,
                    column: messageData.column
                }));
            }
            // Handle canvas mousemoves
            if (messageData.action === 'mousemove' && !isNaN(messageData.column)) {
                opponent.ws.send(JSON.stringify({
                    action: messageData.action,
                    column: messageData.column
                }));
            }
            if (messageData.skipTurn && messageData.currentTurn) {
                opponent.ws.send(JSON.stringify({
                    skipTurn: true,
                    currentTurn: messageData.currentTurn
                }));
            }
            if (messageData.endGameDueToInactivity && messageData.currentTurn) {
                opponent.ws.send(JSON.stringify({
                    endGameDueToInactivity: true,
                    currentTurn: messageData.currentTurn
                }));
            }
        }
    });
    ws.on('close', function () {
        game_utils_1.Player.removePlayer(newPlayer);
        opponent = null;
        console.log('Player disconnected: Game Id = ' + newPlayer.gameId + ', Color = ' + newPlayer.color);
    });
    ws.on('error', function (er) {
        console.log('Error: ' + er);
    });
});
console.log('Daniel\'s Connect4 Server 0.2 (Beta) running...');
console.log('Listening on port: ' + port);
