import { Coin } from "@danieldesira/daniels-connect4-common/lib/enums/coin";
import { randomiseColor, switchTurn } from "@danieldesira/daniels-connect4-common/lib/player-turn";

export class Game {
    
    private gameId: number;
    private skipTurnSecondCount: number;
    private currentTurn: Coin;
    public handleSkipTurn: Function | null;
    
    public constructor(gameId: number) {
        this.gameId = gameId;
        this.skipTurnSecondCount = 0;
        setInterval(this.skipTurnIntervalCallback, 1000);
        this.currentTurn = randomiseColor();
        this.handleSkipTurn = null;
    }

    private skipTurnIntervalCallback = () => {
        this.skipTurnSecondCount++;
        if (this.skipTurnSecondCount >= 60) {
            this.skipTurnSecondCount = 0;
            this.currentTurn = switchTurn(this.currentTurn);
            if (this.handleSkipTurn) {
                this.handleSkipTurn();
            }
        }
    };

    public resetSkipTurnSecondCount() {
        this.skipTurnSecondCount = 0;
    }

    public switchTurn() {
        this.currentTurn = switchTurn(this.currentTurn);
    }

    public getGameId = (): number => this.gameId;
    public getCurrentTurn = (): Coin => this.currentTurn;

}