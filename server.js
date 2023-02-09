const { Server } = require('ws');
const GameUtils = require('./game-utils');
const http = require('http');

const port = 3000;

// Need this HTTP server to run for Adaptable.io hosting
http.createServer((req, res) => {
    res.end('Daniel\'s Connect4 Server is running!');
}).listen(process.env.PORT, '0.0.0.0');

let socketServer = new Server({
    port: port
});
socketServer.on('connection', (ws) => {
    let newPlayer = {
        gameId: GameUtils.getCurrentGameId(),
        color:  (GameUtils.getPlayerCountForCurrentGameId() === 0 ? GameUtils.Colors.Red : GameUtils.Colors.Green),
        name:   null,
        ws:     ws
    };
    GameUtils.connectNewPlayer(newPlayer);
    GameUtils.updateGameId();

    console.log('Player connected: G Id = ' + newPlayer.gameId + ', Color = ' + newPlayer.color);

    ws.send(JSON.stringify({
        gameId: newPlayer.gameId,
        color:  newPlayer.color
    }));

    // If opponent already connected, send name of opponent to the new player
    let opponent = GameUtils.getOpponent(newPlayer);
    if (opponent !== null) {
        newPlayer.ws.send(JSON.stringify({
            opponentName: opponent.name
        }));
    }

    ws.on('message', (data) => {
        let messageData = JSON.parse(data);

        // Handle player name update
        if (messageData.name) {
            newPlayer.name = messageData.name;
            
            if (opponent === null) {
                opponent = GameUtils.getOpponent(newPlayer);
            }
            
            if (opponent !== null) {
                opponent.ws.send(JSON.stringify({
                    opponentName: newPlayer.name
                }));
            }
        }

        // Handle canvas clicks
        if (messageData.action === 'click' && !isNaN(messageData.column)) {
            if (opponent === null) {
                opponent = GameUtils.getOpponent(newPlayer);
            }

            if (opponent !== null) {
                opponent.ws.send(JSON.stringify({
                    action: messageData.action,
                    column: messageData.column
                }));
            }
        }

        // Handle canvas mousemoves
        if (messageData.action === 'mousemove' && !isNaN(messageData.column)) {
            if (opponent === null) {
                opponent = GameUtils.getOpponent(newPlayer);
            }

            if (opponent !== null) {
                opponent.ws.send(JSON.stringify({
                    action: messageData.action,
                    column: messageData.column
                }));
            }
        }
    });

    ws.on('close', () => {
        // Remove players for that game
        GameUtils.removePlayer(newPlayer);
        
        if (opponent === null) {
            opponent = GameUtils.getOpponent(newPlayer);
        }
        
        if (opponent !== null) {
            // Notify opponent that player left
            opponent.ws.send(JSON.stringify({
                message: 'You won as your opponent disconnected!',
                win: true
            }));

            GameUtils.removePlayer(opponent);
        }
    });

    ws.on('error', (er) => {
        console.log('Error: ' + er);
    });
});

console.log('Daniel\'s Connect4 Server 0.1.1 (Alpha) running...');