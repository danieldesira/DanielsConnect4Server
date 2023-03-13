const { Server } = require('ws');
const GameUtils = require('./game-utils');
const http = require('http');

const port = process.env.PORT || 3000;

// Need this HTTP server to run for Adaptable.io hosting
const server = http.createServer((req, res) => {
    res.end('Daniel\'s Connect4 Server is running!');
}).listen(port, '0.0.0.0');

let socketServer = new Server({ server });
socketServer.on('connection', (ws, req) => {
    let url = new URL('wss://example.com' + req.url);

    let gameId = 0;
    let color;
    let name = null;

    if (url.searchParams.has('playerColor') && url.searchParams.has('gameId')) {
        gameId = parseInt(url.searchParams.get('gameId'));
        color = url.searchParams.get('playerColor');
        name = url.searchParams.get('playerName');
    } else {
        gameId = GameUtils.getCurrentGameId();
        color = (GameUtils.getPlayerCountForCurrentGameId() === 0 ? GameUtils.Colors.Red : GameUtils.Colors.Green);
    }

    let newPlayer = {
        gameId: gameId,
        color:  color,
        name:   name,
        ws:     ws
    };
    GameUtils.connectNewPlayer(newPlayer);
    GameUtils.updateGameId();

    console.log('Player connected: Game Id = ' + newPlayer.gameId + ', Color = ' + newPlayer.color);

    ws.send(JSON.stringify({
        gameId: newPlayer.gameId,
        color:  newPlayer.color
    }));

    // If opponent already connected, send name of opponent to the new player
    let opponent = GameUtils.getOpponent(newPlayer);
    if (opponent) {
        newPlayer.ws.send(JSON.stringify({
            opponentName: opponent.name
        }));
    }

    ws.on('message', (data) => {
        let messageData = JSON.parse(data);

        opponent = GameUtils.getOpponent(newPlayer);

        if (opponent) {
            // Handle player name update
            if (messageData.name) {
                newPlayer.name = messageData.name;
                
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
        }
        
    });

    ws.on('close', () => {
        GameUtils.removePlayer(newPlayer);
        opponent = null;
        console.log('Player disconnected: Game Id = ' + newPlayer.gameId + ', Color = ' + newPlayer.color);
    });

    ws.on('error', (er) => {
        console.log('Error: ' + er);
    });
});

console.log('Daniel\'s Connect4 Server 0.1.2 (Alpha) running...');
console.log('Listening on port: ' + port);