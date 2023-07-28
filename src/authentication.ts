const https = require('node:https');

export function authenticateUser(token: string, service: 'google') {
    switch (service) {
        case 'google':
            console.log('hahahha');
            handleGoogleToken(token);
            break;
    }
}

function handleGoogleToken(token: string) {
    https.get(`https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${token}`, (response: any) => {
        console.dir(response);
    });
}

async function createUser(name: string, surname: string, email: string, externalId: string, service: string) {
    
}