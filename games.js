const { Server } = require('ws');

const socketServer = new Server({
    port: 443
});

const Colors = Object.freeze({
    Red: 'red',
    Green: 'greenyellow'
});

let functions = {
    startServer: startServer
};

let currentPlayers = new Set();
let currentGameId = 0;

module.exports = functions;

function startServer() {
    socketServer.on('connection', (ws) => {
        let newPlayer = {
            gameId: currentGameId,
            color:  (getPlayerCountForCurrentGameId() === 0 ? Colors.Red : Colors.Green),
            name:   null,
            ws:     ws
        };
        currentPlayers.add(newPlayer);
        updateGameId();

        console.log('Player connected: G Id = ' + newPlayer.gameId + ', Color = ' + newPlayer.color);

        ws.send(JSON.stringify({
            gameId: newPlayer.gameId,
            color:  newPlayer.color
        }));

        // If opponent already connected, send name of opponent to the new player
        let opponent = getOpponent(newPlayer);
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
                    opponent = getOpponent(newPlayer);
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
                    opponent = getOpponent(newPlayer);
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
                    opponent = getOpponent(newPlayer);
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
            currentPlayers.delete(newPlayer);
            
            if (opponent === null) {
                opponent = getOpponent(newPlayer);
            }
            
            if (opponent !== null) {
                // Notify opponent that player left
                opponent.ws.send(JSON.stringify({
                    message: 'You won as your opponent disconnected!',
                    win: true
                }));

                currentPlayers.delete(opponent);
            }
        });
    });
}

function getOpponent(player) {
    let opponent = null;
    currentPlayers.forEach((p) => {
        if (p.gameId === player.gameId && p.color !== player.color) {
            opponent = p;
        }
    });
    return opponent;
}

function getPlayerCountForCurrentGameId() {
    let playerCount = 0;
    currentPlayers.forEach((p) => {
        if (p.gameId === currentGameId) {
            playerCount++;
        }
    });
    return playerCount;
}

function updateGameId() {
    let playerCount = getPlayerCountForCurrentGameId();
    if (playerCount > 1) {
        currentGameId++;
    }
}