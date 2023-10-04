import { BoardDimensions, Coin, PlayerStats } from "@danieldesira/daniels-connect4-common";
import { Client } from "pg";
import appConfig from "./app-config";

export async function updateGameStart(gameId: number) {
    await updateDbValue('game', gameId, 'start', 'current_timestamp');
}

export async function updateGameFinish(gameId: number) {
    await updateDbValue('game', gameId, 'finish', 'current_timestamp');
}

export async function createNewGame(gameId: number,
                                    dimensions: BoardDimensions,
                                    playerRed: number | null = null,
                                    playerGreen: number | null = null) {
    const sql = new Client(appConfig.connectionString);
    try {
        await sql.connect();
        await sql.query(`INSERT INTO game (id, board_dimensions, player_red, player_green,
                                        is_initial_sent_player_red, is_initial_sent_player_green)
                    VALUES (${gameId}, ${dimensions}, ${playerRed}, ${playerGreen}, 0::bit, 0::bit)`);
    } catch (err) {
        console.error(err);
    } finally {
        await sql.end();
    }
}

export async function updateWinningPlayer(gameId: number, color: Coin) {
    const sql = new Client(appConfig.connectionString);
    try {
        await sql.connect();
        let winner: number;
        switch (color) {
            case Coin.Red: {
                const res = await sql.query(`SELECT player_red FROM game WHERE id = ${gameId}`);
                winner = parseInt(res.rows[0].player_red);
                break;
            }
            case Coin.Green: {
                const res = await sql.query(`SELECT player_green FROM game WHERE id = ${gameId}`);
                winner = parseInt(res.rows[0].player_green);
                break;
            }
            case Coin.Empty:
                winner = -1;
                break;
        }

        await sql.query(`UPDATE game SET winning_player = ${winner} WHERE id = ${gameId}`);
    } catch (err) {
        console.error(err);
    } finally {
        await sql.end();
    }
}

export async function getPlayerStats(playerId: number): Promise<PlayerStats | null> {
    const sql = new Client(appConfig.connectionString);
    let statistics: PlayerStats | null = null;
    try {
        await sql.connect();

        const totalRes = await sql.query(`SELECT COUNT(g.id) as count
            FROM game g
            WHERE g.player_red = ${playerId} OR g.player_green = ${playerId}`);
        const total = totalRes.rows[0].count;

        const winRes = await sql.query(`SELECT COUNT(g.id) as count
            FROM game g
            WHERE g.winning_player = ${playerId}`);
        const wins = winRes.rows[0].count;

        const lossRes = await sql.query(`SELECT COUNT(g.id) as count
            FROM game g
            WHERE (g.player_red = ${playerId} OR g.player_green = ${playerId})
                AND g.winning_player <> ${playerId} AND g.winning_player IS NOT NULL AND g.winning_player <> -1`);
        const losses = lossRes.rows[0].count;

        statistics = {
            wins,
            losses,
            winPercent: wins / total * 100,
            lossPercent: losses / total * 100
        };
    } catch (err) {
        console.error(err);
    } finally {
        await sql.end();
    }

    return statistics;
}

export async function updatePlayerDimensions(userId: number, dimensions: BoardDimensions) {
    await updateDbValue('player', userId, 'board_dimensions', dimensions.toString());
}

export async function updateDbValue(table: string, id: number, field: string, value: string) {
    const sql = new Client(appConfig.connectionString);
    try {
        await sql.connect();
        await sql.query(`UPDATE ${table} SET ${field} = ${value} WHERE id = ${id}`);
    } catch (err) {
        console.error(err);
    } finally {
        await sql.end();
    }
}

export async function isGamePaired(gameId: number): Promise<boolean> {
    const sql = new Client(appConfig.connectionString);
    let isPaired = false;
    try {
        await sql.connect();
        const res = await sql.query(`SELECT player_red, player_green FROM game WHERE id = ${gameId}`);
        const playerGreen = res.rows[0].player_green;
        const playerRed = res.rows[0].player_red;
        isPaired = !!playerGreen && !!playerRed;
    } catch (err) {
        console.error(err);
    } finally {
        await sql.end();
    }
    return isPaired;
}

export async function isInitialSent(gameId: number, playerColor: Coin): Promise<boolean> {
    const sql = new Client(appConfig.connectionString);
    let isSent = false;
    try {
        await sql.connect();
        const color = (playerColor === Coin.Red ? 'red' : 'green');
        const res = await sql.query(`SELECT is_initial_sent_player_${color} FROM game WHERE id = ${gameId}`);
        if (res.rowCount > 0) {
            isSent = res.rows[0][`is_initial_sent_player_${color}`] as boolean;
        }
    } catch (err) {
        console.error(err);
    } finally {
        await sql.end();
    }
    return isSent;
}

export async function updateInitialSent(gameId: number, playerColor: Coin) {
    const color = (playerColor === Coin.Red ? 'red' : 'green');
    await updateDbValue('game', gameId, `is_initial_sent_player_${color}`, '1::bit');
}