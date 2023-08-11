import cors from "cors";
import { authenticateUser } from "./authentication";
import { getPlayerStats } from "./game-utils";
import { Express } from "express";
import { PlayerInfo } from "@danieldesira/daniels-connect4-common";

export default function setupExpress(app: Express) {
    const allowedOrigins = ['http://localhost:5000', 'https://danieldesira.github.io'];

    app.use(cors({
        origin: (origin, callback) => {
            if (allowedOrigins.indexOf(origin ?? '') !== -1) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS policy!'));
            }
        }
    }));

    app.get('/', (req, res) => {
        res.send('Daniel\'s Connect4 Server is running!');
    });
    
    app.get('/auth', async (req, res) => {
        if (req.query.token && req.query.service) {
            const token = (req.query.token ?? '') as string;
            const service = req.query.service as 'google';
            const user = await authenticateUser(token, service);
            if (user) {
                res.json({
                    user: user.fullName.trim().substring(0, 10),
                    picUrl: user.picUrl,
                    dimensions: user.dimensions
                } as PlayerInfo);
            }
        }
    });

    app.get('/stats', async (req, res) => {
        if (req.query.token && req.query.service) {
            const token = (req.query.token ?? '') as string;
            const service = req.query.service as 'google';
            const user = await authenticateUser(token, service);
            if (user) {
                const statistics = await getPlayerStats(user.id);
                if (statistics) {
                    res.json(statistics);
                }
            }
        }
    });
}