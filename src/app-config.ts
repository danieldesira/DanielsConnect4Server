import "dotenv/config";

const appConfig = {
    connectionString: `postgres://daniels-connect4-server-main-db-0506ac2d7de87f1de:${process.env.PG_PASSWORD}@user-prod-us-east-2-1.cluster-cfi5vnucvv3w.us-east-2.rds.amazonaws.com:5432/daniels-connect4-server-main-db-0506ac2d7de87f1de`,
};

export default appConfig;