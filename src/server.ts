const { Server } = require('ws');
import { Dot } from '@danieldesira/daniels-connect4-common/lib/enums/dot';
import GameBoard from './game-board';
import { Player } from './game-utils';
import { GameStatus } from './enums/game-status';
import { InitialMessage } from '@danieldesira/daniels-connect4-common/lib/models/initial-message';
import { ActionMessage } from '@danieldesira/daniels-connect4-common/lib/models/action-message';
import { WinnerMessage } from '@danieldesira/daniels-connect4-common/lib/models/winner-message';
import { TieMessage } from '@danieldesira/daniels-connect4-common/lib/models/tie-message';
import { InactivityMessage } from '@danieldesira/daniels-connect4-common/lib/models/inactivity-message';
import { SkipTurnMessage } from '@danieldesira/daniels-connect4-common/lib/models/skip-turn-message';
import { GameMessage } from '@danieldesira/daniels-connect4-common/lib/models/game-message';
const http = require('http');

const port: number = parseInt(process.env.PORT ?? '0') || 3000;
const boards: Array<GameBoard> = new Array();

// Need this HTTP server to run for Adaptable.io hosting
const server = http.createServer((req: any, res: { end: (arg0: string) => void; }) => {
    res.end('Daniel\'s Connect4 Server is running!');
}).listen(port, '0.0.0.0');

let socketServer = new Server({ server });
socketServer.on('connection', (ws: any, req: { url: string; }) => {
    let url = new URL('wss://example.com' + req.url);

    let gameId = 0;
    let color: Dot;
    let name: string = '';

    if (url.searchParams.has('playerColor') && url.searchParams.has('gameId')) {
        gameId = parseInt(url.searchParams.get('gameId') ?? '0');
        let colorString = url.searchParams.get('playerColor') ?? 'red';
        if (colorString === Dot.Red) {
            color = Dot.Red;
        } else {
            color = Dot.Green;
        }
        name = url.searchParams.get('playerName') ?? '';
    } else {
        gameId = Player.getCurrentGameId();
        color = (Player.getPlayerCountForCurrentGameId() === 0 ? Dot.Red : Dot.Green);
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

    let initialDataToSendNewPlayer = new InitialMessage(newPlayer.gameId, '', newPlayer.color);

    // If opponent already connected, also send name of opponent to the new player
    let opponent = Player.getOpponent(newPlayer);
    if (opponent) {
        initialDataToSendNewPlayer.opponentName = opponent.name;
    }

    ws.send(JSON.stringify(initialDataToSendNewPlayer));

    ws.on('message', async (data: string) => {
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

            if (messageData.action === 'click' && GameMessage.isActionMessage(messageData)) {
                let board = getCurrentBoard(gameId);
                let status = await board.put(newPlayer.color, messageData.column)
                                        .catch((error) => console.log(`Something went wrong for game ${gameId}: ${error}`));
                let message = new ActionMessage(messageData.column, messageData.action);
                opponent.ws.send(JSON.stringify(message));

                if (status !== GameStatus.InProgress) {
                    let data = null;
                    if (status === GameStatus.Winner) {
                        data = new WinnerMessage(newPlayer.color);
                    } else {
                        data = new TieMessage();
                    }
                    newPlayer.ws.send(JSON.stringify(data));
                    opponent.ws.send(JSON.stringify(data));
                }
            }

            if (messageData.action === 'mousemove' && GameMessage.isActionMessage(messageData)) {
                let message = new ActionMessage(messageData.column, messageData.action);
                opponent.ws.send(JSON.stringify(message));
            }

            if (GameMessage.isSkipTurnMessage(messageData)) {
                let message = new SkipTurnMessage(true, messageData.currentTurn);
                opponent.ws.send(JSON.stringify(message));
            }

            if (GameMessage.isInactivityMessage(messageData)) {
                let message = new InactivityMessage(true, messageData.currentTurn);
                opponent.ws.send(JSON.stringify(message));
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

function getCurrentBoard(gameId: number) {
    let board: GameBoard | null = null;
    boards.forEach(b => {
        if (gameId === b.getGameId()) {
            board = b;
        }
    });
    if (!board) {
        board = new GameBoard(gameId);
        boards.push(board);
    }
    return board;
}