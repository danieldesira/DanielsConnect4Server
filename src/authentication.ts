import axios from "axios";
import { GoogleUser } from "./models/google-user";
import { Client } from "pg";
import appConfig from "./app-config";
import { AuthenticatedUser, UserDBModel } from "./models/authenticated-user";
import { BoardDimensions } from "@danieldesira/daniels-connect4-common";

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
        let authenticatedUserModel: AuthenticatedUser | null = null;
        if (!!user.email) {
            const {id} = await getDBUser(user.given_name ?? null, user.family_name ?? null, user.email, user.sub, 'google');
            authenticatedUserModel = {
                id,
                fullName: `${user.given_name ?? ''} ${user.family_name ?? ''}`.trim(),
                picUrl: user.picture
            };
        }
        return authenticatedUserModel;
    } catch {
        return null;
    }
}

async function getDBUser(name: string, surname: string, email: string, externalId: string, service: 'google'): Promise<UserDBModel> {
    const sql = new Client(appConfig.connectionString);
    try {
        await sql.connect();
        let id: number;
        const queryResult = await sql.query(`SELECT id, board_dimensions FROM player WHERE external_id = '${externalId}' AND service = '${service}'`);
        if (queryResult.rowCount === 0) {
            const inserted = await sql.query(`INSERT INTO player (name, surname, email, external_id, service, board_dimensions)
                    VALUES (${name ? `'${name}'` : 'NULL'}, ${surname ? `'${surname}'` : 'NULL'}, '${email}', '${externalId}', '${service}', ${BoardDimensions.Large})
                    RETURNING id, board_dimensions`);
            id = inserted.rows[0].id as number;
        } else {
            id = queryResult.rows[0].id as number;
        }
        return {
            id
        };
    } catch (err) {
        console.error(`Error creating\\checking user: ${err}`);
        throw err;
    } finally {
        await sql.end();
    }
}