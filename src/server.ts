import { Server } from 'ws';
import GameBoard from './game-board';
import { GameStatus } from './enums/game-status';
import { Game } from './game';
import { ActionMessage, Coin, CurrentTurnMessage, DisconnectMessage, ErrorMessage, GameMessage, InitialMessage, TieMessage, WinnerMessage } from '@danieldesira/daniels-connect4-common';
import { authenticateUser } from './authentication';
import http from 'node:http';
import setupExpress from './setup-express';
import Player from './player';
import GameUtils from './game-utils';

const port: number = parseInt(process.env.PORT ?? '0') || 3000;
const app = setupExpress();
const server = http.createServer(app);

server.listen(port, '0.0.0.0');

const socketServer = new Server({ server });
socketServer.on('connection', async (ws, req) => {
    const url = new URL(`wss://example.com${req.url}`);

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
                const error: ErrorMessage = {
                    error: 'Unable to authenticate user! Please logout and login again.'
                };
                ws.send(JSON.stringify(error));
            }
        } else {
            const error: ErrorMessage = {
                error: 'Unable to authenticate user! Please logout and login again.'
            };
            ws.send(JSON.stringify(error));
        }

        let newPlayer: Player;
        if (url.searchParams.has('playerColor') && url.searchParams.has('gameId')) {
            const gameId = parseInt(url.searchParams.get('gameId') ?? '0');
            const color = parseInt(url.searchParams.get('playerColor') ?? '0');
            newPlayer = new Player(playerId, name, ws, gameId, color);
        } else {
            newPlayer = await Player.attemptNewPlayerPairing(playerId, name, ws);
        }

        Player.connectNewPlayer(newPlayer);
        await newPlayer.save();
    
        console.log(`Player connected: Game Id = ${newPlayer.getGameId()},
                    Color = ${newPlayer.getColor()},
                    Name = ${newPlayer.getName()},
                    Dimensions = ${(await newPlayer.getDimensions())}`);
    
        const initialDataToSendNewPlayer: InitialMessage = {
            gameId: newPlayer.getGameId(),
            playerName: newPlayer.getName(),
            opponentName: '',
            color: newPlayer.getColor(),
            dimensions: await newPlayer.getDimensions()
        };
    
        // If opponent already connected, the game has started
        let opponent = Player.getOpponent(newPlayer);
        if (opponent) {
            if (opponent.getId() === newPlayer.getId()) {
                const message: ErrorMessage = {
                    error: 'You cannot play on the same account!'
                };
                ws.send(JSON.stringify(message));
            }

            initialDataToSendNewPlayer.opponentName = opponent.getName();

            const game = new Game(newPlayer.getGameId());
            game.handleSkipTurn = () => {
                const message: CurrentTurnMessage = {
                    currentTurn: opponent?.getGame()?.getCurrentTurn() ?? Coin.Empty
                };
                ws.send(JSON.stringify(message));
                opponent?.getWs().send(JSON.stringify(message));
            };
            opponent.setGame(game);
            newPlayer.setGame(game);

            const currentTurnMessage: CurrentTurnMessage = {
                currentTurn: game.getCurrentTurn()
            };
            ws.send(JSON.stringify(currentTurnMessage));
            opponent.getWs().send(JSON.stringify(currentTurnMessage));
            
            await GameUtils.updateGameStart(newPlayer.getGameId());

            const opponentName = newPlayer.getName();
            opponent.getWs().send(JSON.stringify({opponentName}));
        }
    
        const initialSent = await GameUtils.isInitialSent(newPlayer.getGameId(), newPlayer.getColor());
        if (!initialSent) {
            ws.send(JSON.stringify(initialDataToSendNewPlayer));
            await GameUtils.updateInitialSent(newPlayer.getGameId(), newPlayer.getColor());
        }

        ws.on('message', async (data: string) => {
            const messageData = JSON.parse(data);
    
            opponent = Player.getOpponent(newPlayer);
    
            if (opponent) {
                if (messageData.action === 'click' && GameMessage.isActionMessage(messageData)) {
                    opponent.getGame()?.resetSkipTurnSecondCount();
                    opponent.getGame()?.switchTurn();
                    
                    const board = new GameBoard(newPlayer.getGameId());
                    await board.load();
                    const status = await board.put(newPlayer.getColor(), messageData.column);
                    const message: ActionMessage = {
                        column: messageData.column,
                        action: messageData.action,
                        color: messageData.color
                    };
                    opponent.getWs().send(JSON.stringify(message));

                    if (status !== GameStatus.InProgress) {
                        let data: GameMessage;
                        if (status === GameStatus.Winner) {
                            data = {
                                winner: newPlayer.getColor()
                            };
                        } else if (status === GameStatus.Tie) {
                            data = { tie: true };
                        } else {
                            data = {
                                error: 'ERR001: Error happened during game. Please file a bug.'
                            };
                        }
                        ws.send(JSON.stringify(data));
                        opponent.getWs().send(JSON.stringify(data));
                        await GameUtils.updateGameFinish(newPlayer.getGameId());
                    }
                }
    
                if (messageData.action === 'mousemove' && GameMessage.isActionMessage(messageData)) {
                    const message = messageData as ActionMessage;
                    opponent.getWs().send(JSON.stringify(message));
                }
            }
            
        });
    
        ws.on('close', () => {
            Player.removePlayer(newPlayer);
            console.log(`Player disconnected: Game Id = ${newPlayer.getGameId()},
                        Color = ${newPlayer.getColor()},
                        Name = ${newPlayer.getName()}`);

            let disconnectCountdown: number = 30;
            const interval = setInterval(async () => {
                if (!Player.isPlayerConnected(newPlayer)) {
                    disconnectCountdown--;
                    if (disconnectCountdown <= 0) {
                        clearInterval(interval);
                        if (!opponent) {
                            opponent = Player.getOpponent(newPlayer);
                        }
                        const disconnectMessage: DisconnectMessage = { hardDisconnect: true };
                        opponent?.getWs().send(JSON.stringify(disconnectMessage));
                        await GameUtils.updateGameFinish(newPlayer.getGameId());
                        if (opponent) {
                            await GameUtils.updateWinningPlayer(opponent.getGameId(), opponent.getColor());
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

console.log('Daniel\'s Connect4 Server 0.2.6 (Beta) running...');
console.log(`Listening on port: ${port}`);