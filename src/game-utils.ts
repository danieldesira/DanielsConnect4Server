import { Coin } from "@danieldesira/daniels-connect4-common/lib/enums/coin";
import { Client } from "pg";
import appConfig from "./app-config";
import { Game } from "./game";

export class Player {

    public gameId: number;
    public color:  Coin;
    public name:   string;
    public ws:     any;
    public game:   Game | null;

    public constructor() {
        this.gameId = -1;
        this.color = Coin.Red;
        this.name = '';
        this.game = null;
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
        let playerCount = Player.getPlayerCountForCurrentGameId();
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
                sqlStatement = `UPDATE game SET player_red = '${player.name}' WHERE id = ${player.gameId}`;
            } else {
                sqlStatement = `UPDATE game SET player_green = '${player.name}' WHERE id = ${player.gameId}`;
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