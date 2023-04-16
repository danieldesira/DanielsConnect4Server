import { Dot } from "@danieldesira/daniels-connect4-common/lib/enums/dot";

export class Player {

    public gameId: number;
    public color:  Dot;
    public name:   string;
    public ws:     any;

    public constructor() {
        this.gameId = -1;
        this.color = Dot.Red;
        this.name = '';
    }

    private static currentPlayers: Set<Player> = new Set();
    private static currentGameId: number = 0;

    public static getOpponent(player: Player) : Player | null {
        let opponent: Player | null = null;
        Player.currentPlayers.forEach((p) => {
            if (p.gameId === player.gameId && p.color !== player.color) {
                opponent = p;
            }
        });
        return opponent;
    }

    public static getPlayerCountForCurrentGameId() {
        let playerCount = 0;
        Player.currentPlayers.forEach((p) => {
            if (p.gameId === Player.currentGameId) {
                playerCount++;
            }
        });
        return playerCount;
    }

    public static updateGameId() {
        let playerCount = Player.getPlayerCountForCurrentGameId();
        if (playerCount > 1) {
            Player.currentGameId++;
        }
    }

    public static connectNewPlayer(player: Player) {
        Player.currentPlayers.add(player);
    }

    public static removePlayer(player: Player) {
        Player.currentPlayers.delete(player);
    }

    public static getCurrentGameId() {
        return Player.currentGameId;
    }
}