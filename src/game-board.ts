import BoardLogic, { BoardDimensions, Coin } from '@danieldesira/daniels-connect4-common';
import { GameStatus } from './enums/game-status';
import { Client } from 'pg';
import appConfig from './app-config';
import { updateWinningPlayer } from './game-utils';

export default class GameBoard {

    private board: BoardLogic;
    private gameId: number;

    public constructor(gameId: number) {
        this.gameId = gameId;
        this.board = new BoardLogic(BoardDimensions.Large);
    }

    public getGameId = () => this.gameId;

    public async load() {
        const dimensions = await this.getGameDimensions();
        this.board = new BoardLogic(dimensions);
        await this.loadMatrix();
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
                await updateWinningPlayer(this.gameId, color);
                return GameStatus.Winner;
            } else if (this.board.isBoardFull()) {
                await updateWinningPlayer(this.gameId, Coin.Empty);
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

    private async loadMatrix() {
        const sql = new Client(appConfig.connectionString);
        try {
            await sql.connect();
            const result = await sql.query(`SELECT col, row, color FROM Move WHERE game_id = ${this.gameId}`);
            if (result.rowCount > 0) {
                for (const move of result.rows) {
                    this.board.setBoardItem(move.color, move.col, move.row);
                }
            }
        } catch (error) {
            console.error(`Something went wrong for game ${this.gameId} while loading matrix: ${error}`);
        } finally {
            await sql.end();
        }
    }

    private async getGameDimensions(): Promise<BoardDimensions> {
        const sql = new Client(appConfig.connectionString);
        let dimensions: BoardDimensions = BoardDimensions.Large;
        try {
            await sql.connect();
            const result = await sql.query(`SELECT board_dimensions FROM game WHERE id = ${this.gameId}`);
            if (result.rowCount > 0) {
                dimensions = result.rows[0].board_dimensions as BoardDimensions;
            }
        } catch (error) {
            console.error(`Something went wrong for game ${this.gameId} while loading game dimensions: ${error}`);
        } finally {
            await sql.end();
        }
        return dimensions;
    }

}