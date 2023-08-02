import { authenticateUser } from "./authentication";
import { getPlayerStats } from "./game-utils";

export default function declareExpressRoutes(app: any) {
    app.get('/', (req: any, res: any) => {
        res.send('Daniel\'s Connect4 Server is running!');
    });
    
    app.get('/auth', async (req: any, res: any) => {
        if (req.query.token && req.query.service) {
            const token = req.query.token ?? '';
            const service = req.query.service as 'google';
            const user = await authenticateUser(token, service);
            if (user) {
                res.json({
                    user: user.fullName.trim().substring(0, 10)
                });
            }
        }
    });

    app.get('/stats', async (req: any, res: any) => {
        if (req.query.token && req.query.service) {
            const token = req.query.token ?? '';
            const service = req.query.service as 'google';
            const user = await authenticateUser(token, service);
            if (user) {
                const statistics = await getPlayerStats(user.id);
                if (statistics) {
                    res.json(statistics);
                }
            }
        }
    })
}