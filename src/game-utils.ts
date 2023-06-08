import { Coin } from "@danieldesira/daniels-connect4-common/lib/enums/coin";
import sqlConfig from "./sql-config";
import * as sql from "mssql";

export class Player {

    public gameId: number;
    public color:  Coin;
    public name:   string;
    public ws:     any;

    public constructor() {
        this.gameId = -1;
        this.color = Coin.Red;
        this.name = '';
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
            let pool: sql.ConnectionPool | undefined;
            try {
                pool = await sql.connect(sqlConfig);
                const res = await sql.query('SELECT TOP 1 ID FROM Game ORDER BY ID DESC');
                Player.currentGameId = parseInt(res.recordset[0]) + 1;
            } catch (err) {
                console.error(`Failed to fetch current game ID ${err}`);
            } finally {
                if (pool) {
                    await pool.close();
                    pool = undefined;
                }
            }
        }
        return Player.currentGameId;
    }

    public static async savePlayer(player: Player) {
        let pool: sql.ConnectionPool | undefined;
        try {
            pool = await sql.connect(sqlConfig);
            let sqlStatement: string;
            
            if (player.color === Coin.Red) {
                sqlStatement = `UPDATE Game SET PlayerRed = '${player.color}' WHERE ID = ${player.gameId}`;
            } else {
                sqlStatement = `UPDATE Game SET PlayerGreen = '${player.color}' WHERE ID = ${player.gameId}`;
            }

            await sql.query(sqlStatement);
        } catch (err) {
            console.error(err);
        } finally {
            if (pool) {
                await pool.close();
                pool = undefined;
            }
        }
    }
}