Server for Daniel's Connect4 based on WebSockets.

## Initial Setup
Set the following environment variables, appropriately:
* `DATABASE_URL`: Please note that our host `adaptable.io` provides this by default. 

## Building for production
In the terminal, enter `npm run build`.

## Debugging
If you are using Visual Studio Code, always make sure terminal is in `Javascript Debug Terminal` mode. Otherwise, breakpoints 
will not be hit. To start up the dev server, enter `npm run dev` in the terminal. Any code changes to the TypeScript files 
will cause the application to restart.

## Contributors
### Developers
Daniel Desira

## Version History
### 0.2.7 (Beta - 05/12/2023 5:15PM Malta time)
* Internal: Prettify code
* Fixed bug when attempting to pair a player with different dimensions
* Send player profile pics on game start
* Internal: Read version from package.json/config

### 0.2.6 (Beta - 25/11/2023 3:20PM Malta time)
* Internal: Upgraded Common library to 0.2.1
* Added support for themes

### 0.2.5 (Beta - 07/10/2023 11:45PM Malta time)
* Create flag in the database to prevent `InitialMessage` to be resent after player reconnection
* Row in `game` table only created when an unpairable player connects
* Code cleanup

### 0.2.4 (Beta - 03/10/2023 5PM Malta time)
* Sending error message when Google token has expired
* Adapt to multiple dimensions
* Internal: Code cleanup
* Google signon: Clear undefined names/surnames
* Google signon: Returns 401 if user is not authenticated
* HTTP server: Read token through Authorization header

### 0.2.3 (Beta - 05/08/2023)
* Fix CORS origins for deployment

### 0.2.2 (Beta - 05/08/2023)
* User management through Google SSO token
* Set winner in database and provide win/loss statistics
* Internal: Installed and configure and `nodemon` as a dev server
* Internal: Configure and refactor code for improved type safety
* Internal: Install Express and configure CORS policy

### 0.2.1 (Beta - 18/07/2023)
* Applied fix for adaptable.io deployment: Using the `DATABASE_URL` variable that the platform provides fixing DB/SSL error

### 0.2 (Beta - 18/07/2023)
* Converted code to TypeScript
* Board is now replicated on server through `danieldesira/daniels-connect4-common` NPM package
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