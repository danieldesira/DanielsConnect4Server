import { BoardLogic } from '@danieldesira/daniels-connect4-common/lib/board-logic';
import { Dot } from '@danieldesira/daniels-connect4-common/lib/enums/dot';
import { FindCursor, MongoClient, WithId } from 'mongodb';
import { GameStatus } from './enums/game-status';
import { initMongoClient } from './mongo-utils';
import config from './config';

export default class GameBoard {

    private board: Array<Array<Dot>> = new Array(BoardLogic.columns);
    private gameId: number;
    private mongoClient: MongoClient;

    public constructor(gameId: number) {
        this.gameId = gameId;
        BoardLogic.initBoard(this.board);
        
        this.mongoClient = initMongoClient();
    }

    public getGameId = () => this.gameId;

    public async put(color: Dot, column: number): Promise<GameStatus> {
        try {
            await this.mongoClient.connect();
            const queryResult = await this.mongoClient.db(config.db).collection(config.collection).find({gameId: this.gameId});
            if (queryResult) {
                //this.board = queryResult.board;
            }
            let row = BoardLogic.putDot(this.board, color, column);
            if (queryResult) {
                this.insert(column, row, color);
            } else {
                await this.mongoClient.db(config.db).collection(config.collection).insertOne({
                    gameId: this.gameId,
                    board: this.board
                });
            }

            if (BoardLogic.countConsecutiveDots(this.board, column, row, color) >= 4) {
                return GameStatus.Winner;
            } else if (BoardLogic.isBoardFull(this.board)) {
                return GameStatus.Tie;
            } else {
                return GameStatus.InProgress;
            }
        } finally {
            this.mongoClient.close();
        }
    }

    private readMatrix(results: FindCursor<WithId<Document>>) {
        results.forEach((document) => {
            //document.
        });
    }

    private async insert(col: number, row: number, color: Dot) {
        let doc = {
            gameId: this.gameId,
            col: col,
            rows: {
                row: row,
                value: color
            }
        };
        await this.mongoClient.db(config.db).collection(config.collection).insertOne(doc);
    }

}