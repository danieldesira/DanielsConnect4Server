import { Coin, PlayerStats } from "@danieldesira/daniels-connect4-common";
import { Client } from "pg";
import appConfig from "./app-config";
import { Game } from "./game";
import { WebSocket } from "ws";

export class Player {

    public gameId: number;
    public color:  Coin;
    public id:     number;
    public name:   string;
    public ws:     WebSocket | null;
    public game:   Game | null;

    public constructor() {
        this.gameId = -1;
        this.color = Coin.Red;
        this.name = '';
        this.game = null;
        this.id = -1;
        this.ws = null;
    }

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
        const sql = new Client(appConfig.connectionString);
        try {
            await sql.connect();
            let sqlStatement: string;
            
            if (player.color === Coin.Red) {
                sqlStatement = `UPDATE game SET player_red = ${player.id} WHERE id = ${player.gameId}`;
            } else {
                sqlStatement = `UPDATE game SET player_green = ${player.id} WHERE id = ${player.gameId}`;
            }

            await sql.query(sqlStatement);
        } catch (err) {
            console.error(err);
        } finally {
            await sql.end();
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
    const sql = new Client(appConfig.connectionString);
    try {
        await sql.connect();
        await sql.query(`UPDATE game SET start = current_timestamp WHERE id = ${gameId}`);
    } catch (err) {
        console.error(err);
    } finally {
        await sql.end();
    }
}

export async function updateGameFinish(gameId: number) {
    const sql = new Client(appConfig.connectionString);
    try {
        await sql.connect();
        await sql.query(`UPDATE game SET finish = current_timestamp WHERE id = ${gameId}`);
    } catch (err) {
        console.error(err);
    } finally {
        await sql.end();
    }
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