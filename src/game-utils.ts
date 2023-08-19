import { BoardDimensions, Coin, PlayerStats } from "@danieldesira/daniels-connect4-common";
import { Client } from "pg";
import appConfig from "./app-config";
import { Game } from "./game";
import { WebSocket } from "ws";

export class Player {

    private gameId: number;
    private color:  Coin;
    private id:     number;
    private name:   string;
    private ws:     WebSocket;
    private game:   Game | null;

    public constructor(gameId: number, color: Coin, id: number, name: string, ws: WebSocket) {
        this.gameId = gameId;
        this.color = color;
        this.name = name;
        this.game = null;
        this.id = id;
        this.ws = ws;
    }

    public setGame(game: Game) {
        this.game = game;
    }

    public getWs = () => this.ws;
    public getGame = () => this.game;
    public getGameId = () => this.gameId;
    public getColor = () => this.color;
    public getName = () => this.name;
    public getId = () => this.id;

    private static currentPlayers: Set<Player> = new Set();
    private static currentGameId: number = 0;

    public static getOpponent(player: Player) : Player | null {
        let opponent: Player | null = null;
        Player.currentPlayers.forEach((p) => {
            if (p.gameId === player.gameId && p.color !== player.color) {
                opponent = p;
            }
        });
        return opponent;
    }

    public static getPlayerCountForCurrentGameId() {
        let playerCount = 0;
        Player.currentPlayers.forEach((p) => {
            if (p.gameId === Player.currentGameId) {
                playerCount++;
            }
        });
        return playerCount;
    }

    public static async updateGameId() {
        const playerCount = Player.getPlayerCountForCurrentGameId();
        if (playerCount > 1) {
            Player.currentGameId++;
            await createNewGame(Player.currentGameId);
        }
    }

    public static connectNewPlayer(player: Player) {
        Player.currentPlayers.add(player);
    }

    public static removePlayer(player: Player) {
        Player.currentPlayers.delete(player);
    }

    public static async getCurrentGameId(): Promise<number> {
        if (Player.currentGameId === 0) {
            const sql = new Client(appConfig.connectionString);
            try {
                await sql.connect();
                const res = await sql.query('SELECT id FROM game ORDER BY id DESC LIMIT 1');
                Player.currentGameId = (res.rows.length > 0 ? parseInt(res.rows[0].id) : 0);
            } catch (err) {
                console.error(`Failed to fetch current game ID ${err}`);
            } finally {
                await sql.end();
            }
        }
        return Player.currentGameId;
    }

    public static async savePlayer(player: Player) {
        if (player.color === Coin.Red) {
            await updateDbValue('game', player.gameId, 'player_red', player.id.toString());
        } else {
            await updateDbValue('game', player.gameId, 'player_green', player.id.toString());
        }
    }

    public static isPlayerConnected(player: Player) : boolean {
        let found: boolean = false;
        Player.currentPlayers.forEach((p) => {
            if (p.gameId === player.gameId && p.color === player.color) {
                found = true;
            }
        });
        return found;
    }

}

export async function updateGameStart(gameId: number) {
    await updateDbValue('game', gameId, 'start', 'current_timestamp');
}

export async function updateGameFinish(gameId: number) {
    await updateDbValue('game', gameId, 'finish', 'current_timestamp');
}

async function createNewGame(gameId: number) {
    const sql = new Client(appConfig.connectionString);
    try {
        await sql.connect();
        await sql.query(`INSERT INTO game (id) VALUES (${gameId})`);
    } catch (err) {
        console.error(err);
    } finally {
        await sql.end();
    }
}

export async function updateWinningPlayer(gameId: number, color: Coin) {
    const sql = new Client(appConfig.connectionString);
    try {
        await sql.connect();
        let winner: number;
        switch (color) {
            case Coin.Red: {
                const res = await sql.query(`SELECT player_red FROM game WHERE id = ${gameId}`);
                winner = parseInt(res.rows[0].player_red);
                break;
            }
            case Coin.Green: {
                const res = await sql.query(`SELECT player_green FROM game WHERE id = ${gameId}`);
                winner = parseInt(res.rows[0].player_green);
                break;
            }
            case Coin.Empty:
                winner = -1;
                break;
        }

        await sql.query(`UPDATE game SET winning_player = ${winner} WHERE id = ${gameId}`);
    } catch (err) {
        console.error(err);
    } finally {
        await sql.end();
    }
}

export async function getPlayerStats(playerId: number): Promise<PlayerStats | null> {
    const sql = new Client(appConfig.connectionString);
    let statistics: PlayerStats | null = null;
    try {
        await sql.connect();

        const totalRes = await sql.query(`SELECT COUNT(g.id) as count
            FROM game g
            WHERE g.player_red = ${playerId} OR g.player_green = ${playerId}`);
        const total = totalRes.rows[0].count;

        const winRes = await sql.query(`SELECT COUNT(g.id) as count
            FROM game g
            WHERE g.winning_player = ${playerId}`);
        const wins = winRes.rows[0].count;

        const lossRes = await sql.query(`SELECT COUNT(g.id) as count
            FROM game g
            WHERE (g.player_red = ${playerId} OR g.player_green = ${playerId})
                AND g.winning_player <> ${playerId} AND g.winning_player IS NOT NULL AND g.winning_player <> -1`);
        const losses = lossRes.rows[0].count;

        statistics = {
            wins,
            losses,
            winPercent: wins / total * 100,
            lossPercent: losses / total * 100
        };
    } catch (err) {
        console.error(err);
    } finally {
        await sql.end();
    }

    return statistics;
}

export async function updatePlayerDimensions(userId: number, dimensions: BoardDimensions) {
    await updateDbValue('player', userId, 'board_dimensions', dimensions.toString());
}

async function updateDbValue(table: string, id: number, field: string, value: string) {
    const sql = new Client(appConfig.connectionString);
    try {
        await sql.connect();
        await sql.query(`UPDATE ${table} SET ${field} = ${value} WHERE id = ${id}`);
    } catch (err) {
        console.error(err);
    } finally {
        await sql.end();
    }
}