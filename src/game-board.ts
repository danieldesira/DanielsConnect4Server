import { BoardLogic } from '@danieldesira/daniels-connect4-common/lib/board-logic';
import { Dot } from '@danieldesira/daniels-connect4-common/lib/enums/dot';
import { MongoClient } from 'mongodb';
import { GameStatus } from './enums/game-status';

export default class GameBoard {

    private board: Array<Array<Dot>> = new Array(BoardLogic.columns);
    private gameId: number;

    public constructor(gameId: number) {
        this.gameId = gameId;
        BoardLogic.initBoard(this.board);
    }

    public getGameId = () => this.gameId;

    public put(color: Dot, column: number): GameStatus {
        let row = BoardLogic.putDot(this.board, color, column);

        if (BoardLogic.countConsecutiveDots(this.board, column, row, color) >= 4) {
            return GameStatus.Winner;
        } else if (BoardLogic.isBoardFull(this.board)) {
            return GameStatus.Tie;
        } else {
            return GameStatus.InProgress;
        }
    }

}