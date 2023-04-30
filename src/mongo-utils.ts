import { MongoClient, ServerApiVersion } from "mongodb";
import config from "./config";

export function initMongoClient(): MongoClient {
    return new MongoClient(config.connectionString, {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        }
    });
}