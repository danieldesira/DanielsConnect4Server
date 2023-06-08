import * as sql from "mssql";

const sqlConfig: sql.config = {
    server: 'DANIELLAPTOP',
    database: 'DanielsConnect4',
    options: {
        trustedConnection: true
    }
};

export default sqlConfig;