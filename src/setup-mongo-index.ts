import config from "./config";
import { initMongoClient } from "./mongo-utils";

const mongoClient = initMongoClient();

async function main() {
    try {
        console.log('Connecting to Atlas...');
        await mongoClient.connect();
        console.log('Connected!');
        await mongoClient.db(config.db).collection(config.collection).createIndex({ board: 1 });
        console.log('Index created!');
    } catch (err) {
        console.error(err);
    } finally {
        await mongoClient.close();
    }
}

main().then(() => console.log('Operation complete!'));