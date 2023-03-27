const Colors = Object.freeze({
    Red: 'red',
    Green: 'greenyellow'
});

module.exports = {
    getOpponent,
    getPlayerCountForCurrentGameId,
    updateGameId,
    connectNewPlayer,
    removePlayer,
    getCurrentGameId,
    Colors
};

let currentPlayers = new Set();
let currentGameId = 0;

function getOpponent(player) {
    let opponent = null;
    currentPlayers.forEach((p) => {
        if (p.gameId === player.gameId && p.color !== player.color) {
            opponent = p;
        }
    });
    return opponent;
}

function getPlayerCountForCurrentGameId() {
    let playerCount = 0;
    currentPlayers.forEach((p) => {
        if (p.gameId === currentGameId) {
            playerCount++;
        }
    });
    return playerCount;
}

function updateGameId() {
    let playerCount = getPlayerCountForCurrentGameId();
    if (playerCount > 1) {
        currentGameId++;
    }
}

function connectNewPlayer(player) {
    currentPlayers.add(player);
}

function removePlayer(player) {
    currentPlayers.delete(player);
}

function getCurrentGameId() {
    return currentGameId;
}