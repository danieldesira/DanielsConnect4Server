"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Player = exports.Colors = void 0;
var Colors;
(function (Colors) {
    Colors["Red"] = "red";
    Colors["Green"] = "greenyellow";
})(Colors = exports.Colors || (exports.Colors = {}));
var Player = exports.Player = /** @class */ (function () {
    function Player() {
    }
    Player.getOpponent = function (player) {
        var opponent = null;
        Player.currentPlayers.forEach(function (p) {
            if (p.gameId === player.gameId && p.color !== player.color) {
                opponent = p;
            }
        });
        return opponent;
    };
    Player.getPlayerCountForCurrentGameId = function () {
        var playerCount = 0;
        Player.currentPlayers.forEach(function (p) {
            if (p.gameId === Player.currentGameId) {
                playerCount++;
            }
        });
        return playerCount;
    };
    Player.updateGameId = function () {
        var playerCount = Player.getPlayerCountForCurrentGameId();
        if (playerCount > 1) {
            Player.currentGameId++;
        }
    };
    Player.connectNewPlayer = function (player) {
        Player.currentPlayers.add(player);
    };
    Player.removePlayer = function (player) {
        Player.currentPlayers.delete(player);
    };
    Player.getCurrentGameId = function () {
        return Player.currentGameId;
    };
    Player.currentPlayers = new Set();
    Player.currentGameId = 0;
    return Player;
}());
