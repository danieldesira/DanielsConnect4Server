import { BoardLogic } from '@danieldesira/daniels-connect4-common/lib/board-logic';
import { Dot } from '@danieldesira/daniels-connect4-common/lib/enums/dot';
import { MongoClient, ServerApiVersion } from 'mongodb';
import { GameStatus } from './enums/game-status';

export default class GameBoard {

    private board: Array<Array<Dot>> = new Array(BoardLogic.columns);
    private gameId: number;
    private mongoClient: MongoClient;

    public constructor(gameId: number) {
        this.gameId = gameId;
        BoardLogic.initBoard(this.board);
        const password: string = encodeURIComponent('Cr7KM7Ym4esNxQzM');
        const dbUri: string = `mongodb+srv://danield:${password}@danield.8r0msyf.mongodb.net/?retryWrites=true&w=majority`;
        this.mongoClient = new MongoClient(dbUri, {
            serverApi: {
                version: ServerApiVersion.v1,
                strict: true,
                deprecationErrors: true,
            }
        });
    }

    public getGameId = () => this.gameId;

    public async put(color: Dot, column: number): Promise<GameStatus> {
        const dbName: string = 'danielsconnect4';
        const collectionName: string = 'game';

        try {
            await this.mongoClient.connect();
            const queryResult = await this.mongoClient.db(dbName).collection(collectionName).findOne({gameId: this.gameId});
            if (queryResult) {
                this.board = queryResult.board;
            }
            let row = BoardLogic.putDot(this.board, color, column);
            if (queryResult) {
                await this.mongoClient.db(dbName).collection(collectionName).updateOne({
                    gameId: this.gameId
                }, {
                    $set: {
                        board: this.board
                    }
                });
            } else {
                await this.mongoClient.db(dbName).collection(collectionName).insertOne({
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

}