const { Server } = require('ws');
import { Colors, Player } from './game-utils';
const http = require('http');

const port: number = parseInt(process.env.PORT ?? '0') || 3000;

// Need this HTTP server to run for Adaptable.io hosting
const server = http.createServer((req: any, res: { end: (arg0: string) => void; }) => {
    res.end('Daniel\'s Connect4 Server is running!');
}).listen(port, '0.0.0.0');

let socketServer = new Server({ server });
socketServer.on('connection', (ws: any, req: { url: string; }) => {
    let url = new URL('wss://example.com' + req.url);

    let gameId = 0;
    let color: Colors;
    let name: string = '';

    if (url.searchParams.has('playerColor') && url.searchParams.has('gameId')) {
        gameId = parseInt(url.searchParams.get('gameId') ?? '0');
        let colorString = url.searchParams.get('playerColor') ?? 'red';
        if (colorString === Colors.Red) {
            color = Colors.Red;
        } else {
            color = Colors.Green;
        }
        name = url.searchParams.get('playerName') ?? '';
    } else {
        gameId = Player.getCurrentGameId();
        color = (Player.getPlayerCountForCurrentGameId() === 0 ? Colors.Red : Colors.Green);
    }

    let newPlayer: Player = {
        gameId: gameId,
        color:  color,
        name:   name,
        ws:     ws
    };
    Player.connectNewPlayer(newPlayer);
    Player.updateGameId();

    console.log('Player connected: Game Id = ' + newPlayer.gameId + ', Color = ' + newPlayer.color);

    let initialDataToSendNewPlayer = {
        gameId:       newPlayer.gameId,
        color:        newPlayer.color,
        opponentName: ''
    };

    // If opponent already connected, also send name of opponent to the new player
    let opponent = Player.getOpponent(newPlayer);
    if (opponent) {
        initialDataToSendNewPlayer.opponentName = opponent.name;
    }

    ws.send(JSON.stringify(initialDataToSendNewPlayer));

    ws.on('message', (data: string) => {
        let messageData = JSON.parse(data);

        // Update player name
        if (messageData.name) {
            newPlayer.name = messageData.name;
        }

        opponent = Player.getOpponent(newPlayer);

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

    ws.on('close', () => {
        Player.removePlayer(newPlayer);
        opponent = null;
        console.log('Player disconnected: Game Id = ' + newPlayer.gameId + ', Color = ' + newPlayer.color);
    });

    ws.on('error', (er: string) => {
        console.log('Error: ' + er);
    });
});

console.log('Daniel\'s Connect4 Server 0.2 (Beta) running...');
console.log('Listening on port: ' + port);