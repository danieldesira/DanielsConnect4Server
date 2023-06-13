import appConfig from "./app-config";
import { Client } from "pg";

(async () => {
    const pgClient = new Client(appConfig.connectionString);
    console.log('Connecting to database...');
    await pgClient.connect();
    console.log('Connected!');
})();