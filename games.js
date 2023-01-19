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

module.exports = functions;

function startServer() {
    socketServer.on('connection', (ws) => {
        let newPlayer = {
            gameId: Math.floor(currentPlayers.size / 2),
            color:  (currentPlayers.size % 2 === 0 ? Colors.Red : Colors.Green),
            name:   null,
            ws:     ws
        };
        currentPlayers.add(newPlayer);

        console.log('Player connected: G Id = ' + newPlayer.gameId + ', Color = ' + newPlayer.color);

        ws.send(JSON.stringify({
            gameId: newPlayer.gameId,
            color:  newPlayer.color
        }));

        ws.on('message', (ws, code) => {
            //to pass on message to opponent
        });

        ws.on('close', () => {
            // Remove players for that game
            currentPlayers.delete(newPlayer);
            let opponent = getOpponent(newPlayer);
            if (opponent != null) {
                // Notify opponent that player left
                opponent.ws.send(JSON.stringify({
                    message: 'You won as other player disconnected!'
                }));

                currentPlayers.delete(opponent);
            }
            console.table(currentPlayers);
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