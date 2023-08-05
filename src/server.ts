import { Server } from 'ws';
import GameBoard from './game-board';
import { Player, updateGameFinish, updateGameStart, updateWinningPlayer } from './game-utils';
import { GameStatus } from './enums/game-status';
import { Game } from './game';
import { ActionMessage, Coin, CurrentTurnMessage, DisconnectMessage, ErrorMessage, GameMessage, InitialMessage, SkipTurnMessage, TieMessage, WinnerMessage } from '@danieldesira/daniels-connect4-common';
import { authenticateUser } from './authentication';
import express from 'express';
import http from 'node:http';
import setupExpress from './http-routes';

const port: number = parseInt(process.env.PORT ?? '0') || 3000;

const app = express();
const server = http.createServer(app);

setupExpress(app);

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
                ws.close();
            }
        } else {
            ws.close();
        }

        if (url.searchParams.has('playerColor') && url.searchParams.has('gameId')) {
            gameId = parseInt(url.searchParams.get('gameId') ?? '0');
            color = parseInt(url.searchParams.get('playerColor') ?? '1');
        } else {
            gameId = await Player.getCurrentGameId();
            color = (Player.getPlayerCountForCurrentGameId() === 0 ? Coin.Red : Coin.Green);
        }
    
        const newPlayer: Player = {
            gameId,
            color,
            name,
            ws,
            game:   null,
            id:     playerId
        };
        Player.connectNewPlayer(newPlayer);
        await Player.updateGameId();
        await Player.savePlayer(newPlayer);
    
        console.log(`Player connected: Game Id = ${newPlayer.gameId}, Color = ${newPlayer.color}, Name = ${newPlayer.name}`);
    
        const initialDataToSendNewPlayer = new InitialMessage(newPlayer.gameId, newPlayer.name, '', newPlayer.color);
    
        // If opponent already connected, the game has started
        let opponent = Player.getOpponent(newPlayer);
        if (opponent) {
            if (opponent.id === newPlayer.id) {
                const message = new ErrorMessage('You cannot play on the same account!');
                ws.send(JSON.stringify(message));
            }

            initialDataToSendNewPlayer.opponentName = opponent.name;

            const game = new Game(gameId);
            game.handleSkipTurn = () => {
                const message = new SkipTurnMessage(true, opponent?.game?.getCurrentTurn() ?? Coin.Empty);
                newPlayer.ws?.send(JSON.stringify(message));
                opponent?.ws?.send(JSON.stringify(message));
            };
            opponent.game = game;
            newPlayer.game = game;

            const currentTurnMessage = new CurrentTurnMessage();
            currentTurnMessage.currentTurn = game.getCurrentTurn();
            ws.send(JSON.stringify(currentTurnMessage));
            opponent.ws?.send(JSON.stringify(currentTurnMessage));

            updateGameStart(gameId);

            const opponentName = newPlayer.name;
            opponent.ws?.send(JSON.stringify({opponentName}));
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
                    opponent.ws?.send(JSON.stringify(message));

                    if (status !== GameStatus.InProgress) {
                        let data: GameMessage;
                        if (status === GameStatus.Winner) {
                            data = new WinnerMessage(newPlayer.color);
                        } else if (status === GameStatus.Tie) {
                            data = new TieMessage();
                        } else {
                            data = new ErrorMessage('ERR001: Error happened during game save. Please file a bug.');
                        }
                        newPlayer.ws?.send(JSON.stringify(data));
                        opponent.ws?.send(JSON.stringify(data));
                        await updateGameFinish(gameId);
                    }
                }
    
                if (messageData.action === 'mousemove' && GameMessage.isActionMessage(messageData)) {
                    const message = new ActionMessage(messageData.column, messageData.action, messageData.color);
                    opponent.ws?.send(JSON.stringify(message));
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
                        opponent?.ws?.send(JSON.stringify(new DisconnectMessage()));
                        await updateGameFinish(gameId);
                        if (opponent) {
                            await updateWinningPlayer(opponent.gameId, opponent.color);
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

console.log('Daniel\'s Connect4 Server 0.2.3 (Beta) running...');
console.log(`Listening on port: ${port}`);