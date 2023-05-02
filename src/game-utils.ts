import { Dot } from "@danieldesira/daniels-connect4-common/lib/enums/dot";
import { initMongoClient } from "./mongo-utils";
import { Document, MatchKeysAndValues, MongoClient } from "mongodb";
import config from "./config";

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

    public static connectNewPlayer(player: Player) {
        Player.currentPlayers.add(player);
    }

    public static removePlayer(player: Player) {
        Player.currentPlayers.delete(player);
    }

    public static getCurrentGameId() {
        return Player.currentGameId;
    }

    public static async savePlayer(mongoClient: MongoClient, player: Player) {
        try {
            await mongoClient.connect();
            let game = await mongoClient.db(config.db).collection(config.collection).findOne({gameId: player.gameId});
            let doc: MatchKeysAndValues<Document>;
            
            if (player.color === Dot.Red) {
                doc = {
                    playerRed: player.name
                };
            } else {
                doc = {
                    playerGreen: player.name
                };
            }

            if (!game) {
                await mongoClient.db(config.db).collection(config.collection).insertOne({gameId: player.gameId});
            }

            await mongoClient.db(config.db).collection(config.collection).updateOne({gameId: player.gameId}, {
                $set: doc
            });
        } catch (err) {
            console.error(err);
        } finally {
            mongoClient.close();
        }
    }
}