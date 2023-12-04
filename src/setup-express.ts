import cors from "cors";
import { authenticateUser } from "./authentication";
import express from "express";
import { PlayerInfo } from "@danieldesira/daniels-connect4-common";
import bodyParser from "body-parser";
import Player from "./player";
import Services from "./types/services";
import GameUtils from "./game-utils";

export default function setupExpress() {
  const allowedOrigins = [
    "http://localhost:5000",
    "https://danieldesira.github.io",
  ];
  const app = express();

  app.use(
    cors({
      origin: (origin, callback) => {
        if (allowedOrigins.indexOf(origin ?? "") !== -1) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS policy!"));
        }
      },
    })
  );
  app.use(bodyParser.json());

  app.get("/", (_req, res) => {
    res.send("Daniel's Connect4 Server is running!");
  });

  app.get("/auth", async (req, res) => {
    const { authorization, service } = req.headers;
    if (authorization && service) {
      const user = await authenticateUser(authorization, service as Services);
      if (user) {
        res.json({
          user: user.fullName.trim().substring(0, 10),
          picUrl: user.picUrl,
        } as PlayerInfo);
      } else {
        res.status(401);
        res.json({ message: "Unauthenticated" });
      }
    }
  });

  app.get("/stats", async (req, res) => {
    const { authorization, service } = req.headers;
    if (authorization && service) {
      const user = await authenticateUser(authorization, service as Services);
      if (user) {
        const statistics = await GameUtils.getPlayerStats(user.id);
        if (statistics) {
          res.json(statistics);
        }
      } else {
        res.status(401);
        res.json({ message: "Unauthenticated" });
      }
    }
  });

  app.get("/settings", async (req, res) => {
    const { authorization, service } = req.headers;
    if (authorization && service) {
      const user = await authenticateUser(authorization, service as Services);
      if (user) {
        const settings = await Player.getSettings(user.id);
        if (settings) {
          res.json(settings);
        }
      } else {
        res.status(401);
        res.json({ message: "Unauthenticated" });
      }
    }
  });

  app.post("/settings", async (req, res) => {
    const { authorization, service } = req.headers;
    if (authorization && service) {
      const user = await authenticateUser(authorization, service as Services);
      if (user) {
        const dimensions = req.body.dimensions;
        const theme = req.body.theme;
        await Player.updateSettings(user.id, {
          dimensions,
          theme,
        });
        res.json({ message: "ok" });
      } else {
        res.status(401);
        res.json({ message: "Unauthenticated" });
      }
    }
  });

  return app;
}
