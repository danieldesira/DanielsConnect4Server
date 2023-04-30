import { Dot } from "@danieldesira/daniels-connect4-common/lib/enums/dot";
import { initMongoClient } from "./mongo-utils";
import { MongoClient } from "mongodb";

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

    public static getPlayerCountForCurrentGameId(mongoClient: MongoClient) {
        let playerCount = 0;
        Player.currentPlayers.forEach((p) => {
            if (p.gameId === Player.currentGameId) {
                playerCount++;
            }
        });
        return playerCount;
    }

    public static async updateGameId() {
        const mongoClient = initMongoClient();
        try {
            await mongoClient.connect();
            let playerCount = Player.getPlayerCountForCurrentGameId(mongoClient);
            if (playerCount > 1) {
                Player.currentGameId++;
            }
        } finally {
            mongoClient.close();
        }
    }

    public static async connectNewPlayer(mongoClient: MongoClient, player: Player) {
        try {
            let game = mongoClient.db()
        } finally {
            mongoClient.close();
        }
        Player.currentPlayers.add(player);
    }

    public static removePlayer(player: Player) {
        Player.currentPlayers.delete(player);
    }

    public static getCurrentGameId() {
        return Player.currentGameId;
    }
}