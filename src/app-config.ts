import "dotenv/config";
import {version} from "../package.json";

const appConfig = {
  version,
  status: "Beta",
  connectionString: process.env.DATABASE_URL,
};

export default appConfig;
