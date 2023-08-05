import axios from "axios";
import { GoogleUser } from "./models/google-user";
import { Client } from "pg";
import appConfig from "./app-config";
import { AuthenticatedUser } from "./models/authenticated-user";

export async function authenticateUser(token: string, service: 'google'): Promise<AuthenticatedUser | null> {
    let user: AuthenticatedUser | null = null;
    switch (service) {
        case 'google':
            user = await handleGoogleToken(token);
            break;
    }
    return user;
}

async function handleGoogleToken(token: string): Promise<AuthenticatedUser | null> {
    try {
        const response = await axios.get(`https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${token}`);
        const user = response.data as GoogleUser;
        const authenticatedUserModel: AuthenticatedUser = {
            id: -1,
            fullName: `${user.given_name} ${user.family_name}`,
            picUrl: user.picture
        };
        authenticatedUserModel.id = await createUser(user.given_name, user.family_name, user.email, user.sub, 'google');
        return authenticatedUserModel;
    } catch {
        return null;
    }
}

async function createUser(name: string, surname: string, email: string, externalId: string, service: 'google'): Promise<number> {
    const sql = new Client(appConfig.connectionString);
    try {
        await sql.connect();
        let id: number;
        const queryResult = await sql.query(`SELECT id FROM player WHERE external_id = '${externalId}' AND service = '${service}'`);
        if (queryResult.rowCount === 0) {
            const insertedRow = await sql.query(`INSERT INTO player (name, surname, email, external_id, service)
                    VALUES ('${name}', '${surname}', '${email}', '${externalId}', '${service}')
                    RETURNING id`);
            id = insertedRow.rows[0].id;
        } else {
            id = queryResult.rows[0].id;
        }
        return id;
    } catch (err) {
        console.error(`Error creating\\checking user: ${err}`);
        throw err;
    } finally {
        await sql.end();
    }
}