import cors from "cors";
import { authenticateUser } from "./authentication";
import { getPlayerStats, updatePlayerDimensions } from "./game-utils";
import express from "express";
import { PlayerInfo } from "@danieldesira/daniels-connect4-common";
import bodyParser from "body-parser";
import Player from "./player";

export default function setupExpress() {
    const allowedOrigins = ['http://localhost:5000', 'https://danieldesira.github.io'];
    const app = express();

    app.use(cors({
        origin: (origin, callback) => {
            if (allowedOrigins.indexOf(origin ?? '') !== -1) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS policy!'));
            }
        }
    }));
    app.use(bodyParser.json());

    app.get('/', (_req, res) => {
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
                    picUrl: user.picUrl
                } as PlayerInfo);
            } else {
                res.status(401);
                res.json({message: 'Unauthenticated'});
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
            } else {
                res.status(401);
                res.json({message: 'Unauthenticated'});
            }
        }
    });

    app.get('/settings', async (req, res) => {
        if (req.query.token && req.query.service) {
            const token = (req.query.token ?? '') as string;
            const service = req.query.service as 'google';
            const user = await authenticateUser(token, service);
            if (user) {
                const settings = await Player.getSettings(user.id);
                if (settings) {
                    res.json(settings);
                }
            } else {
                res.status(401);
                res.json({message: 'Unauthenticated'});
            }
        }
    });

    app.post('/update-dimensions', async (req, res) => {
        if (req.body.token && req.body.service && req.body.dimensions) {
            const token = (req.body.token ?? '') as string;
            const service = req.body.service as 'google';
            const user = await authenticateUser(token, service);
            if (user) {
                const dimensions = req.body.dimensions;
                await updatePlayerDimensions(user.id, dimensions);
                res.json({message: 'ok'});
            } else {
                res.status(401);
                res.json({message: 'Unauthenticated'});
            }
        }
    });

    return app;
}