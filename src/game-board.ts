import BoardLogic, { BoardDimensions, Coin } from '@danieldesira/daniels-connect4-common';
import { GameStatus } from './enums/game-status';
import { Client } from 'pg';
import appConfig from './app-config';
import GameUtils from './game-utils';

export default class GameBoard {

    private board: BoardLogic;
    private gameId: number;

    public constructor(gameId: number) {
        this.gameId = gameId;
        this.board = new BoardLogic(BoardDimensions.Large);
    }

    public getGameId = () => this.gameId;

    public async load() {
        const sql = new Client(appConfig.connectionString);
        try {
            await sql.connect();
            const dimensions = await this.getGameDimensions(sql);
            this.board = new BoardLogic(dimensions);
            await this.loadMatrix(sql);
        } catch (error) {
            console.error(`Something went wrong for game ${this.gameId} while loading matrix: ${error}`);
        } finally {
            await sql.end();
        }
    }

    public async put(color: Coin, column: number): Promise<GameStatus | undefined> {
        const sql = new Client(appConfig.connectionString);
        try {
            await sql.connect();
            
            const row = this.board.putCoin(color, column);
            const stmt = `INSERT INTO Move (col, row, color, game_id, timestamp)
                        VALUES (${column}, ${row}, ${color}, ${this.gameId}, current_timestamp)`;
            await sql.query(stmt);

            if (this.board.countConsecutiveCoins(column, row, color) >= 4) {
                await GameUtils.updateWinningPlayer(this.gameId, color);
                return GameStatus.Winner;
            } else if (this.board.isBoardFull()) {
                await GameUtils.updateWinningPlayer(this.gameId, Coin.Empty);
                return GameStatus.Tie;
            } else {
                return GameStatus.InProgress;
            }
        } catch (error) {
            console.error(`Something went wrong for game ${this.gameId} while putting coin: ${error}`);
        } finally {
            await sql.end();
        }
    }

    private async loadMatrix(sql: Client) {
        const result = await sql.query(`SELECT col, row, color FROM Move WHERE game_id = ${this.gameId}`);
        for (const move of result.rows) {
            this.board.setBoardItem(move.color, move.col, move.row);
        }
    }

    private async getGameDimensions(sql: Client): Promise<BoardDimensions> {
        let dimensions: BoardDimensions = BoardDimensions.Large;
        const result = await sql.query(`SELECT board_dimensions FROM game WHERE id = ${this.gameId}`);
        if (result.rowCount > 0) {
            dimensions = result.rows[0].board_dimensions as BoardDimensions;
        }
        
        return dimensions;
    }

}