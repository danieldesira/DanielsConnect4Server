import BoardLogic from '@danieldesira/daniels-connect4-common/lib/board-logic';
import { GameStatus } from './enums/game-status';
import { Coin } from '@danieldesira/daniels-connect4-common/lib/enums/coin';
import { Client, QueryResultRow } from 'pg';
import appConfig from './app-config';

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

    public async put(color: Coin, column: number): Promise<GameStatus> {
        const sql = new Client(appConfig.connectionString);
        try {
            await sql.connect();
            
            let row = BoardLogic.putCoin(this.board, color, column);
            await sql.query(`INSERT INTO Move (col, row, color, game_id) VALUES (${column}, ${row}, ${color}, ${this.gameId})`);

            if (BoardLogic.countConsecutiveCoins(this.board, column, row, color) >= 4) {
                return GameStatus.Winner;
            } else if (BoardLogic.isBoardFull(this.board)) {
                return GameStatus.Tie;
            } else {
                return GameStatus.InProgress;
            }
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