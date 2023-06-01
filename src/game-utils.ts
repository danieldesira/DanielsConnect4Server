import { Document, MatchKeysAndValues, MongoClient } from "mongodb";
import config from "./config";
import { Coin } from "@danieldesira/daniels-connect4-common/lib/enums/coin";

export class Player {

    public gameId: number;
    public color:  Coin;
    public name:   string;
    public ws:     any;

    public constructor() {
        this.gameId = -1;
        this.color = Coin.Red;
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

    public static async updateGameId() {
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

    public static async getCurrentGameId(mongoClient: MongoClient): Promise<number> {
        if (Player.currentGameId === 0) {
            try {
                await mongoClient.connect();
                const res = await mongoClient.db(config.db).collection(config.collection).find()
                                            .sort({ gameId: -1 }).limit(1).project({ gameId: 1 })
                                            .toArray();
                const [{gameId}] = res;
                Player.currentGameId = gameId + 1;
            } catch (err) {
                console.error(`Failed to fetch current game ID ${err}`);
            } finally {
                await mongoClient.close();
            }
        }
        return Player.currentGameId;
    }

    public static async savePlayer(mongoClient: MongoClient, player: Player) {
        try {
            await mongoClient.connect();
            const game = await mongoClient.db(config.db).collection(config.collection).findOne({gameId: player.gameId});
            let doc: MatchKeysAndValues<Document>;
            
            if (player.color === Coin.Red) {
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
            await mongoClient.close();
        }
    }
}