import BoardLogic from '@danieldesira/daniels-connect4-common/lib/board-logic';
import { MongoClient } from 'mongodb';
import { GameStatus } from './enums/game-status';
import { initMongoClient } from './mongo-utils';
import config from './config';
import { Coin } from '@danieldesira/daniels-connect4-common/lib/enums/coin';

export default class GameBoard {

    private board: Array<Array<Coin>> = new Array(BoardLogic.columns);
    private gameId: number;
    private mongoClient: MongoClient;

    public constructor(gameId: number) {
        this.gameId = gameId;
        BoardLogic.initBoard(this.board);
        
        this.mongoClient = initMongoClient();
    }

    public getGameId = () => this.gameId;

    public async load() {
        try {
            await this.mongoClient.connect();
            const queryResult = await this.mongoClient.db(config.db).collection(config.collection).findOne({gameId: this.gameId});
            if (queryResult && queryResult.board) {
                this.readMatrix(queryResult.board);
            }
        } catch (err) {
            console.error(`Error loading board for ${this.gameId}: ${err}`);
            throw err;
        } finally {
            await this.mongoClient.close();
        }
    }

    public async put(color: Coin, column: number): Promise<GameStatus> {
        try {
            await this.mongoClient.connect();
            
            let row = BoardLogic.putCoin(this.board, color, column);
            await this.mongoClient.db(config.db).collection(config.collection).updateOne({ gameId: this.gameId }, {
                $push: { board: { row: row, col: column, val: color } }
            });

            if (BoardLogic.countConsecutiveCoins(this.board, column, row, color) >= 4) {
                return GameStatus.Winner;
            } else if (BoardLogic.isBoardFull(this.board)) {
                return GameStatus.Tie;
            } else {
                return GameStatus.InProgress;
            }
        } finally {
            await this.mongoClient.close();
        }
    }

    private readMatrix(boardEntries: Array<any>) {
        for (const item of boardEntries) {
            this.board[item.col][item.row] = item.val;
        }
    }

}