import BoardLogic, { Coin } from '@danieldesira/daniels-connect4-common';
import { GameStatus } from './enums/game-status';
import { Client, QueryResultRow } from 'pg';
import appConfig from './app-config';
import { updateWinningPlayer } from './game-utils';

export default class GameBoard {

    private board: Array<Array<Coin>> = new Array(BoardLogic.columns);
    private gameId: number;

    public constructor(gameId: number) {
        this.gameId = gameId;
        BoardLogic.initBoard(this.board);
    }

    public getGameId = () => this.gameId;

    public async load() {
        const sql = new Client(appConfig.connectionString);
        try {
            await sql.connect();
            const queryResult = await sql.query(`SELECT col, row, color FROM Move WHERE game_id = ${this.gameId}`);
            if (queryResult && queryResult.rows.length > 0) {
                this.readMatrix(queryResult.rows);
            }
        } catch (err) {
            console.error(`Error loading board for ${this.gameId}: ${err}`);
            throw err;
        } finally {
            await sql.end();
        }
    }

    public async put(color: Coin, column: number): Promise<GameStatus | undefined> {
        const sql = new Client(appConfig.connectionString);
        try {
            await sql.connect();
            
            const row = BoardLogic.putCoin(this.board, color, column);
            const stmt = `INSERT INTO Move (col, row, color, game_id, timestamp)
                        VALUES (${column}, ${row}, ${color}, ${this.gameId}, current_timestamp)`;
            await sql.query(stmt);

            if (BoardLogic.countConsecutiveCoins(this.board, column, row, color) >= 4) {
                await updateWinningPlayer(this.gameId, color);
                return GameStatus.Winner;
            } else if (BoardLogic.isBoardFull(this.board)) {
                await updateWinningPlayer(this.gameId, Coin.Empty);
                return GameStatus.Tie;
            } else {
                return GameStatus.InProgress;
            }
        } catch (error) {
            console.error(`Something went wrong for game ${this.gameId}: ${error}`);
        } finally {
            await sql.end();
        }
    }

    private readMatrix(boardEntries: QueryResultRow[]) {
        for (const item of boardEntries) {
            this.board[item.col][item.row] = item.color;
        }
    }

}