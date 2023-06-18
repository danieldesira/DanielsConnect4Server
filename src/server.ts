const { Server } = require('ws');
import { Coin } from '@danieldesira/daniels-connect4-common/lib/enums/coin';
import GameBoard from './game-board';
import { Player, updateGameFinish, updateGameStart } from './game-utils';
import { GameStatus } from './enums/game-status';
import InitialMessage from '@danieldesira/daniels-connect4-common/lib/models/initial-message';
import ActionMessage from '@danieldesira/daniels-connect4-common/lib/models/action-message';
import WinnerMessage from '@danieldesira/daniels-connect4-common/lib/models/winner-message';
import TieMessage from '@danieldesira/daniels-connect4-common/lib/models/tie-message';
import InactivityMessage from '@danieldesira/daniels-connect4-common/lib/models/inactivity-message';
import SkipTurnMessage from '@danieldesira/daniels-connect4-common/lib/models/skip-turn-message';
import GameMessage from '@danieldesira/daniels-connect4-common/lib/models/game-message';
import CurrentTurnMessage from '@danieldesira/daniels-connect4-common/lib/models/current-turn-message';
import randomiseColor from '@danieldesira/daniels-connect4-common/lib/randomise';
import DisconnectMessage from '@danieldesira/daniels-connect4-common/lib/models/disconnect-message';
const http = require('http');

const port: number = parseInt(process.env.PORT ?? '0') || 3000;

// Need this HTTP server to run for Adaptable.io hosting
const server = http.createServer((req: any, res: { end: (arg0: string) => void; }) => {
    res.end('Daniel\'s Connect4 Server is running!');
}).listen(port, '0.0.0.0');

let socketServer = new Server({ server });
socketServer.on('connection', async (ws: any, req: { url: string; }) => {
    const url = new URL(`wss://example.com${req.url}`);

    let gameId = 0;
    let color: Coin;
    let name: string = '';

    try {
        if (url.searchParams.has('playerColor') && url.searchParams.has('gameId')) {
            gameId = parseInt(url.searchParams.get('gameId') ?? '0');
            color = parseInt(url.searchParams.get('playerColor') ?? '1');
            name = url.searchParams.get('playerName') ?? '';
        } else {
            gameId = await Player.getCurrentGameId();
            color = (Player.getPlayerCountForCurrentGameId() === 0 ? Coin.Red : Coin.Green);
        }
    
        const newPlayer: Player = {
            gameId: gameId,
            color:  color,
            name:   name,
            ws:     ws
        };
        Player.connectNewPlayer(newPlayer);
        await Player.updateGameId();

        if (newPlayer.name) {
            await Player.savePlayer(newPlayer);
        }
    
        console.log(`Player connected: Game Id = ${newPlayer.gameId}, Color = ${newPlayer.color}, Name = ${newPlayer.name}`);
    
        let initialDataToSendNewPlayer = new InitialMessage(newPlayer.gameId, '', newPlayer.color);
    
        // If opponent already connected, the game has started
        let opponent = Player.getOpponent(newPlayer);
        if (opponent) {
            initialDataToSendNewPlayer.opponentName = opponent.name;

            const currentTurnMessage = new CurrentTurnMessage();
            currentTurnMessage.currentTurn = randomiseColor();
            ws.send(JSON.stringify(currentTurnMessage));
            opponent.ws.send(JSON.stringify(currentTurnMessage));

            updateGameStart(gameId);
        }
    
        ws.send(JSON.stringify(initialDataToSendNewPlayer));
    
        ws.on('message', async (data: string) => {
            let messageData = JSON.parse(data);
    
            // Update player name
            if (messageData.name) {
                newPlayer.name = messageData.name;
                Player.savePlayer(newPlayer);
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
                    const board = new GameBoard(gameId);
                    await board.load();
                    const status = await board.put(newPlayer.color, messageData.column)
                                            .catch((error) => console.error(`Something went wrong for game ${gameId}: ${error}`));
                    const message = new ActionMessage(messageData.column, messageData.action);
                    opponent.ws.send(JSON.stringify(message));
    
                    if (status !== GameStatus.InProgress) {
                        let data = null;
                        if (status === GameStatus.Winner) {
                            data = new WinnerMessage(newPlayer.color);
                            updateGameFinish(gameId);
                        } else {
                            data = new TieMessage();
                            updateGameFinish(gameId);
                        }
                        newPlayer.ws.send(JSON.stringify(data));
                        opponent.ws.send(JSON.stringify(data));
                    }
                }
    
                if (messageData.action === 'mousemove' && GameMessage.isActionMessage(messageData)) {
                    const message = new ActionMessage(messageData.column, messageData.action);
                    opponent.ws.send(JSON.stringify(message));
                }
    
                if (GameMessage.isSkipTurnMessage(messageData)) {
                    const message = new SkipTurnMessage(true, messageData.currentTurn);
                    opponent.ws.send(JSON.stringify(message));
                }
    
                if (GameMessage.isInactivityMessage(messageData)) {
                    const message = new InactivityMessage(true, messageData.currentTurn);
                    opponent.ws.send(JSON.stringify(message));
                }
            }
            
        });
    
        ws.on('close', () => {
            Player.removePlayer(newPlayer);
            opponent = null;
            console.log(`Player disconnected: Game Id = ${newPlayer.gameId}, Color = ${newPlayer.color}, Name = ${newPlayer.name}`);

            let disconnectCountdown: number = 30;
            let interval: NodeJS.Timer = setInterval(async () => {
                if (!Player.isPlayerConnected(newPlayer)) {
                    disconnectCountdown--;
                    if (disconnectCountdown <= 0) {
                        clearInterval(interval);
                        opponent?.ws.send(new DisconnectMessage());
                        await updateGameFinish(gameId);
                    }
                } else {
                    clearInterval(interval);
                }
            }, 1000);
        });
    
        ws.on('error', (er: string) => {
            console.log('Error: ' + er);
        });
    } catch (error) {
        console.error(error);
    }
});

console.log('Daniel\'s Connect4 Server 0.2 (Beta) running...');
console.log(`Listening on port: ${port}`);