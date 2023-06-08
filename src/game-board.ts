import BoardLogic from '@danieldesira/daniels-connect4-common/lib/board-logic';
import { GameStatus } from './enums/game-status';
import sqlConfig from './sql-config';
import { Coin } from '@danieldesira/daniels-connect4-common/lib/enums/coin';
import * as sql from "mssql";

export default class GameBoard {

    private board: Array<Array<Coin>> = new Array(BoardLogic.columns);
    private gameId: number;

    public constructor(gameId: number) {
        this.gameId = gameId;
        BoardLogic.initBoard(this.board);
    }

    public getGameId = () => this.gameId;

    public async load() {
        let pool: sql.ConnectionPool | undefined;
        try {
            pool = await sql.connect(sqlConfig);
            const queryResult = await sql.query(`SELECT Col, Row, Color FROM Move WHERE GameID = ${this.gameId}`);
            if (queryResult && queryResult.recordset.length > 0) {
                this.readMatrix(queryResult.recordset);
            }
        } catch (err) {
            console.error(`Error loading board for ${this.gameId}: ${err}`);
            throw err;
        } finally {
            if (pool) {
                await pool.close();
                pool = undefined;
            }
        }
    }

    public async put(color: Coin, column: number): Promise<GameStatus> {
        let pool: sql.ConnectionPool | undefined;
        try {
            pool = await sql.connect(sqlConfig);
            
            let row = BoardLogic.putCoin(this.board, color, column);
            await sql.query(`INSERT INTO Move (Col, Row, Color) VALUES (${column}, ${row}, ${color})`);

            if (BoardLogic.countConsecutiveCoins(this.board, column, row, color) >= 4) {
                return GameStatus.Winner;
            } else if (BoardLogic.isBoardFull(this.board)) {
                return GameStatus.Tie;
            } else {
                return GameStatus.InProgress;
            }
        } finally {
            if (pool) {
                await pool.close();
                pool = undefined;
            }
        }
    }

    private readMatrix(boardEntries: sql.IRecordSet<any>) {
        for (const item of boardEntries) {
            this.board[item['Col']][item['Row']] = item['Color'];
        }
    }

}