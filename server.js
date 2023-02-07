const { WebPubSubServiceClient } = require('@azure/web-pubsub');
const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const GameUtils = require('./game-utils');

const app = express();
const port = 3000;

const connectionString = 'Endpoint=https://danielsconnect4.webpubsub.azure.com;AccessKey=xZtcLsZRVEk/Ms99wDfjGzJNJAtrIyOSxtO9bAMQC28=;Version=1.0;';

let serviceClient = new WebPubSubServiceClient(connectionString, 'Hub');

app.use(cors());

app.listen(port, () => {
    console.log('Express server listening for connections');
})

async function main() {
    let token = await serviceClient.getClientAccessToken();
    let socketServer = new WebSocket(token.url, 'json.webpubsub.azure.v1');console.log(token.url);
    socketServer.on('connection', (ws) => {
        let newPlayer = {
            gameId: GameUtils.getCurrentGameId(),
            color:  (GameUtils.getPlayerCountForCurrentGameId() === 0 ? GameUtils.Colors.Red : GameUtils.Colors.Green),
            name:   null,
            ws:     ws
        };
        gameUtils.connectNewPlayer(newPlayer);
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

    app.get('/negotiate', async (req, res) => {console.log(token.url);
        res.json({
            url: token.url
        });
    });
}

main();
console.log('Daniel\'s Connect4 Server 0.1.1 (Alpha) running...');