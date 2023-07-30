import axios from "axios";
import { GoogleUser } from "./models/google-user";
import { Client } from "pg";
import appConfig from "./app-config";

export async function authenticateUser(token: string, service: 'google'): Promise<string | null> {
    let playerName: string | null = null;
    switch (service) {
        case 'google':
            playerName = await handleGoogleToken(token);
            break;
    }
    return playerName;
}

async function handleGoogleToken(token: string): Promise<string | null> {
    try {
        const response = await axios.get(`https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${token}`);
        const user = response.data as GoogleUser;
        await createUser(user.given_name, user.family_name, user.email, user.sub, 'google');
        return `${user.given_name} ${user.family_name}`;
    } catch {
        return null;
    }
}

async function createUser(name: string, surname: string, email: string, externalId: string, service: 'google') {
    const sql = new Client(appConfig.connectionString);
    try {
        await sql.connect();
        const queryResult = await sql.query(`SELECT id FROM public.user WHERE external_id = '${externalId}' AND service = '${service}'`);
        if (queryResult.rowCount === 0) {
            await sql.query(`INSERT INTO public.user (name, surname, email, external_id, service)
                VALUES ('${name}', '${surname}', '${email}', '${externalId}', '${service}')`);
        }
    } catch (err) {
        console.error(`Error creating\\checking user: ${err}`);
        throw err;
    } finally {
        await sql.end();
    }
}