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
        const authenticatedUserModel: AuthenticatedUser = {
            id: -1,
            fullName: `${user.given_name} ${user.family_name}`,
            picUrl: user.picture,
            dimensions: BoardDimensions.Large
        };
        const {id, dimensions} = await createUser(user.given_name, user.family_name, user.email, user.sub, 'google');
        authenticatedUserModel.id = id;
        authenticatedUserModel.dimensions = dimensions;
        return authenticatedUserModel;
    } catch {
        return null;
    }
}

async function createUser(name: string, surname: string, email: string, externalId: string, service: 'google'): Promise<UserDBModel> {
    const sql = new Client(appConfig.connectionString);
    try {
        await sql.connect();
        let id: number;
        let dimensions: BoardDimensions;
        const queryResult = await sql.query(`SELECT id, board_dimensions FROM player WHERE external_id = '${externalId}' AND service = '${service}'`);
        if (queryResult.rowCount === 0) {
            const inserted = await sql.query(`INSERT INTO player (name, surname, email, external_id, service, board_dimensions)
                    VALUES ('${name}', '${surname}', '${email}', '${externalId}', '${service}', ${BoardDimensions.Large})
                    RETURNING id, board_dimensions`);
            id = inserted.rows[0].id as number;
            dimensions = inserted.rows[0].board_dimensions as BoardDimensions;
        } else {
            id = queryResult.rows[0].id as number;
            dimensions = queryResult.rows[0].board_dimensions as BoardDimensions;
        }
        return {
            id,
            dimensions
        };
    } catch (err) {
        console.error(`Error creating\\checking user: ${err}`);
        throw err;
    } finally {
        await sql.end();
    }
}