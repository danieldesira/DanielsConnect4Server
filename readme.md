Server for Daniel's Connect4 based on WebSockets.

## Initial Setup
Set the following environment variables, appropriately:
* `PG_PASSWORD`

## Building
In the terminal, enter `` npm run build ``.

## Debugging
If you are using Visual Studio Code, always make sure terminal is in `` Javascript Debug Terminal `` mode. Otherwise, breakpoints 
will not be hit. To start up server, enter `` npm start `` in the terminal.

Please note that you will be required to build and restart the server before testing any code changes.

## Contributors
### Developers
Daniel Desira

## Version History
### 0.2 (Beta - )
* Converted code to TypeScript
* Board is now replicated on server through `` danieldesira/daniels-connect4-common `` NPM package
* Randomise initial color
* Store game progress in a Postgres database
* Automatically end game if a player is disconnected for at least 30 seconds
* Skip turn is now handled by server

### 0.1.2 (Alpha - 27/03/2023)
* Reconnect disconnected clients
* Code cleanup and some focus on efficiency
* Handle inactivity-related messages

### 0.1.1.3 (Alpha - 14/02/2023)
* Run WebSocket server on same port as HTTP

### 0.1.1.2 (Alpha - 09/02/2023)
* Change WebSocket server port to 443

### 0.1.1.1 (Alpha - 09/02/2023)
* Minor config changes in attempt to host on adaptable.io

### 0.1.1 (Alpha - 08/02/2023)
* Refactoring, attempting to fix issue for Azure app

### 0.1 (Alpha - 30/01/2023)
* Implemented server handling basic game requests