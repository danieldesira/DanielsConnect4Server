import { Server } from 'ws';
import GameBoard from './game-board';
import { Player, updateGameFinish, updateGameStart, updateWinningPlayer } from './game-utils';
import { GameStatus } from './enums/game-status';
import { Game } from './game';
import { ActionMessage, Coin, CurrentTurnMessage, DisconnectMessage, ErrorMessage, GameMessage, InitialMessage, SkipTurnMessage, TieMessage, WinnerMessage } from '@danieldesira/daniels-connect4-common';
import { authenticateUser } from './authentication';
import http from 'node:http';
import setupExpress from './http-routes';

const port: number = parseInt(process.env.PORT ?? '0') || 3000;
const app = setupExpress();
const server = http.createServer(app);

server.listen(port, '0.0.0.0');

const socketServer = new Server({ server });
socketServer.on('connection', async (ws, req) => {
    const url = new URL(`wss://example.com${req.url}`);

    let gameId = 0;
    let color: Coin;
    let name: string = '';
    let playerId: number = -1;

    try {
        if (url.searchParams.has('token') && url.searchParams.has('service')) {
            const token = url.searchParams.get('token') ?? '';
            const service = url.searchParams.get('service') as 'google';
            const user = await authenticateUser(token, service);
            if (user) {
                name = user.fullName.trim().substring(0, 10);
                playerId = user.id;
            } else {
                const error = new ErrorMessage('Unable to authenticate user! Please logout and login again.');
                ws.send(JSON.stringify(error));
            }
        } else {
            const error = new ErrorMessage('Unable to authenticate user! Please logout and login again.');
            ws.send(JSON.stringify(error));
        }

        if (url.searchParams.has('playerColor') && url.searchParams.has('gameId')) {
            gameId = parseInt(url.searchParams.get('gameId') ?? '0');
            color = parseInt(url.searchParams.get('playerColor') ?? '1');
        } else {
            gameId = await Player.getCurrentGameId();
            color = (Player.getPlayerCountForCurrentGameId() === 0 ? Coin.Red : Coin.Green);
        }
    
        const newPlayer = new Player(gameId, color, playerId, name, ws);
        Player.connectNewPlayer(newPlayer);
        await Player.updateGameId();
        await Player.savePlayer(newPlayer);
    
        console.log(`Player connected: Game Id = ${newPlayer.getGameId()}, Color = ${newPlayer.getColor()}, Name = ${newPlayer.getName()}`);
    
        const initialDataToSendNewPlayer = new InitialMessage(newPlayer.getGameId(), newPlayer.getName(), '', newPlayer.getColor());
    
        // If opponent already connected, the game has started
        let opponent = Player.getOpponent(newPlayer);
        if (opponent) {
            if (opponent.getId() === newPlayer.getId()) {
                const message = new ErrorMessage('You cannot play on the same account!');
                ws.send(JSON.stringify(message));
            }

            initialDataToSendNewPlayer.opponentName = opponent.getName();

            const game = new Game(gameId);
            game.handleSkipTurn = () => {
                const message = new SkipTurnMessage(true, opponent?.getGame()?.getCurrentTurn() ?? Coin.Empty);
                ws.send(JSON.stringify(message));
                opponent?.getWs().send(JSON.stringify(message));
            };
            opponent.setGame(game);
            newPlayer.setGame(game);

            const currentTurnMessage = new CurrentTurnMessage();
            currentTurnMessage.currentTurn = game.getCurrentTurn();
            ws.send(JSON.stringify(currentTurnMessage));
            opponent.getWs().send(JSON.stringify(currentTurnMessage));

            updateGameStart(gameId);

            const opponentName = newPlayer.getName();
            opponent.getWs().send(JSON.stringify({opponentName}));
        }
    
        ws.send(JSON.stringify(initialDataToSendNewPlayer));

        ws.on('message', async (data: string) => {
            const messageData = JSON.parse(data);
    
            opponent = Player.getOpponent(newPlayer);
    
            if (opponent) {
                if (messageData.action === 'click' && GameMessage.isActionMessage(messageData)) {
                    opponent.getGame()?.resetSkipTurnSecondCount();
                    opponent.getGame()?.switchTurn();
                    
                    const board = new GameBoard(gameId);
                    await board.load();
                    const status = await board.put(newPlayer.getColor(), messageData.column);
                    const message = new ActionMessage(messageData.column, messageData.action, messageData.color);
                    opponent.getWs().send(JSON.stringify(message));

                    if (status !== GameStatus.InProgress) {
                        let data: GameMessage;
                        if (status === GameStatus.Winner) {
                            data = new WinnerMessage(newPlayer.getColor());
                        } else if (status === GameStatus.Tie) {
                            data = new TieMessage();
                        } else {
                            data = new ErrorMessage('ERR001: Error happened during game save. Please file a bug.');
                        }
                        ws.send(JSON.stringify(data));
                        opponent.getWs().send(JSON.stringify(data));
                        await updateGameFinish(gameId);
                    }
                }
    
                if (messageData.action === 'mousemove' && GameMessage.isActionMessage(messageData)) {
                    const message = new ActionMessage(messageData.column, messageData.action, messageData.color);
                    opponent.getWs().send(JSON.stringify(message));
                }
            }
            
        });
    
        ws.on('close', () => {
            Player.removePlayer(newPlayer);
            console.log(`Player disconnected: Game Id = ${newPlayer.getGameId()}, Color = ${newPlayer.getColor()}, Name = ${newPlayer.getName()}`);

            let disconnectCountdown: number = 30;
            const interval: NodeJS.Timer = setInterval(async () => {
                if (!Player.isPlayerConnected(newPlayer)) {
                    disconnectCountdown--;
                    if (disconnectCountdown <= 0) {
                        clearInterval(interval);
                        if (!opponent) {
                            opponent = Player.getOpponent(newPlayer);
                        }
                        opponent?.getWs().send(JSON.stringify(new DisconnectMessage()));
                        await updateGameFinish(gameId);
                        if (opponent) {
                            await updateWinningPlayer(opponent.getGameId(), opponent.getColor());
                        }
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

console.log('Daniel\'s Connect4 Server 0.2.4 (Beta) running...');
console.log(`Listening on port: ${port}`);