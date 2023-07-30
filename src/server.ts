const { Server } = require('ws');
import GameBoard from './game-board';
import { Player, updateGameFinish, updateGameStart } from './game-utils';
import { GameStatus } from './enums/game-status';
import { Game } from './game';
import { ActionMessage, Coin, CurrentTurnMessage, DisconnectMessage, ErrorMessage, GameMessage, InitialMessage, SkipTurnMessage, TieMessage, WinnerMessage } from '@danieldesira/daniels-connect4-common';
import { authenticateUser } from './authentication';
const http = require('http');

const port: number = parseInt(process.env.PORT ?? '0') || 3000;

// Need this HTTP server to run for Adaptable.io hosting
const server = http.createServer((req: any, res: { end: (arg0: string) => void; }) => {
    res.end('Daniel\'s Connect4 Server is running!');
}).listen(port, '0.0.0.0');

const socketServer = new Server({ server });
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
            if (url.searchParams.has('token') && url.searchParams.has('service')) {
                const token = url.searchParams.get('token') ?? '';
                const service = url.searchParams.get('service');
                if (service === 'google') {
                    const result = await authenticateUser(token, service);
                    if (result) {
                        name = result.trim().substring(0, 10);
                    } else {
                        ws.close();
                    }
                }
            } else {
                ws.close();
            }
        }
    
        const newPlayer: Player = {
            gameId: gameId,
            color:  color,
            name:   name,
            ws:     ws,
            game:   null
        };
        Player.connectNewPlayer(newPlayer);
        await Player.updateGameId();

        if (newPlayer.name) {
            await Player.savePlayer(newPlayer);
        }
    
        console.log(`Player connected: Game Id = ${newPlayer.gameId}, Color = ${newPlayer.color}, Name = ${newPlayer.name}`);
    
        const initialDataToSendNewPlayer = new InitialMessage(newPlayer.gameId, newPlayer.name, '', newPlayer.color);
    
        // If opponent already connected, the game has started
        let opponent = Player.getOpponent(newPlayer);
        if (opponent) {
            initialDataToSendNewPlayer.opponentName = opponent.name;

            const game = new Game(gameId);
            game.handleSkipTurn = () => {
                const message = new SkipTurnMessage(true, opponent?.game?.getCurrentTurn() ?? Coin.Empty);
                newPlayer.ws.send(JSON.stringify(message));
                opponent?.ws.send(JSON.stringify(message));
            };
            opponent.game = game;
            newPlayer.game = game;

            const currentTurnMessage = new CurrentTurnMessage();
            currentTurnMessage.currentTurn = game.getCurrentTurn();
            ws.send(JSON.stringify(currentTurnMessage));
            opponent.ws.send(JSON.stringify(currentTurnMessage));

            updateGameStart(gameId);
        }
    
        ws.send(JSON.stringify(initialDataToSendNewPlayer));

        ws.on('message', async (data: string) => {
            const messageData = JSON.parse(data);
    
            opponent = Player.getOpponent(newPlayer);
    
            if (opponent) {
                if (messageData.action === 'click' && GameMessage.isActionMessage(messageData)) {
                    opponent.game?.resetSkipTurnSecondCount();
                    opponent.game?.switchTurn();
                    
                    const board = new GameBoard(gameId);
                    await board.load();
                    const status = await board.put(newPlayer.color, messageData.column);
                    const message = new ActionMessage(messageData.column, messageData.action, messageData.color);
                    opponent.ws.send(JSON.stringify(message));

                    if (status !== GameStatus.InProgress) {
                        let data: GameMessage;
                        if (status === GameStatus.Winner) {
                            data = new WinnerMessage(newPlayer.color);
                        } else if (status === GameStatus.Tie) {
                            data = new TieMessage();
                        } else {
                            data = new ErrorMessage('ERR001: Error happened during game save. Please file a bug.');
                        }
                        newPlayer.ws.send(JSON.stringify(data));
                        opponent.ws.send(JSON.stringify(data));
                        await updateGameFinish(gameId);
                    }
                }
    
                if (messageData.action === 'mousemove' && GameMessage.isActionMessage(messageData)) {
                    const message = new ActionMessage(messageData.column, messageData.action, messageData.color);
                    opponent.ws.send(JSON.stringify(message));
                }
            }
            
        });
    
        ws.on('close', () => {
            Player.removePlayer(newPlayer);
            console.log(`Player disconnected: Game Id = ${newPlayer.gameId}, Color = ${newPlayer.color}, Name = ${newPlayer.name}`);

            let disconnectCountdown: number = 30;
            const interval: NodeJS.Timer = setInterval(async () => {
                if (!Player.isPlayerConnected(newPlayer)) {
                    disconnectCountdown--;
                    if (disconnectCountdown <= 0) {
                        clearInterval(interval);
                        if (!opponent) {
                            opponent = Player.getOpponent(newPlayer);
                        }
                        opponent?.ws.send(JSON.stringify(new DisconnectMessage()));
                        await updateGameFinish(gameId);
                    }
                } else {
                    clearInterval(interval);
                }
            }, 1000);
        });
    
        ws.on('error', (er: string) => {
            console.error(`Error: ${er}`);
        });
    } catch (error) {
        console.error(`Error: ${error}`);
    }
});

console.log('Daniel\'s Connect4 Server 0.2.2 (Beta) running...');
console.log(`Listening on port: ${port}`);