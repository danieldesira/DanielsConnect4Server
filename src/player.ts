import { BoardDimensions, Coin } from "@danieldesira/daniels-connect4-common";
import { Game } from "./game";
import { WebSocket } from "ws";
import appConfig from "./app-config";
import { Client } from "pg";
import { createNewGame, updateDbValue } from "./game-utils";

export default class Player {

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

    public async getDimensions(): Promise<BoardDimensions> {
        const sql = new Client(appConfig.connectionString);
        let dimensions = BoardDimensions.Large;
        try {
            await sql.connect();
            const res = await sql.query(`SELECT board_dimensions FROM player WHERE id = ${this.id}`);
            if (res.rowCount > 0) {
                dimensions = res.rows[0].board_dimensions as BoardDimensions;
            }
        } catch (err) {
            console.error(`Failed to fetch current game ID ${err}`);
        } finally {
            await sql.end();
        }
        return dimensions;
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

    public async save() {
        if (this.color === Coin.Red) {
            await updateDbValue('game', this.gameId, 'player_red', this.id.toString());
        } else {
            await updateDbValue('game', this.gameId, 'player_green', this.id.toString());
        }
    }

    public static isPlayerConnected(player: Player): boolean {
        let found: boolean = false;
        Player.currentPlayers.forEach((p) => {
            if (p.gameId === player.gameId && p.color === player.color) {
                found = true;
            }
        });
        return found;
    }

}