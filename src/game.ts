import { Coin, randomiseColor, skipTurnMaxWait, switchTurn } from "@danieldesira/daniels-connect4-common";

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
        if (this.skipTurnSecondCount >= skipTurnMaxWait) {
            this.resetSkipTurnSecondCount();
            this.switchTurn();
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