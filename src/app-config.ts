import "dotenv/config";

const appConfig = {
    connectionString: process.env.DATABASE_URL,
};

export default appConfig;