import "dotenv/config";
import {version} from "../package.json";

const appConfig = {
  version,
  connectionString: process.env.DATABASE_URL,
};

export default appConfig;
