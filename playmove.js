// Import required modules and dependencies
const express = require('express');
const router = express.Router();
const { Terrain } = require('./mapclass.js');
const { Dungeon } = require('./dungeon.js');
const { saveGame, loadGame, extractGameStateFromSession, applyGameStateToSession } = require('./savefile.js');

router.post('/', (req, res) => {
  // Retrieve the command and modifier from the request body
  const givenCommand = req.body.command;
  let commandModifier = req.body.modifier;
  commandModifier = commandModifier.replace(/\\/g, ''); // Remove slashes
  let gameState = {};
  // Retrieve the necessary session variables
  gameState = req.session.gameState;
  gameState.globals = {
	  automove:false,
	  animations:[],
	  eventLog:[],
	  mapRefresh:false,
	  currentFloor:gameState.currentFloor
  };

  const boardSize = { x: 60, y: 60 };
  const dungeonSpace = new Terrain(boardSize, gameState.terrain[gameState.currentFloor]);
  let dungeon = new Dungeon(dungeonSpace, gameState.creatures[gameState.currentFloor], gameState.items[gameState.currentFloor], gameState.explored[gameState.currentFloor], gameState.decals[gameState.currentFloor], gameState.visible[gameState.currentFloor]);

  if (dungeon.creatures[0].hp > 0) {
    dungeon.movePlayer(givenCommand, commandModifier, gameState.globals);
  } else {
    // Handle the death animation
  }

  // Update the game state with the modified dungeon
  gameState.creatures[gameState.currentFloor] = dungeon.creatures;
  gameState.items[gameState.currentFloor] = dungeon.items;
  gameState.explored[gameState.currentFloor] = dungeon.explored;
  gameState.visible[gameState.currentFloor] = dungeon.visible;
  gameState.currentFloor = dungeon.currentFloor;

  // Update the modified session variables
  req.session.gameState = gameState;

  if (req.session.gameState.currentFloor === gameState.currentFloor) {
    gameState.globals.mapRefresh = false;
  } else {
    const player = dungeon.creatures[0];
    const oldFloor = gameState.currentFloor;
    gameState.currentFloor = req.session.gameState.currentFloor;
    gameState.terrain = req.session.gameState.terrain[gameState.currentFloor];
    gameState.decals = req.session.gameState.decals[gameState.currentFloor];
    gameState.creatures = req.session.gameState.creatures[gameState.currentFloor];
    gameState.items = req.session.gameState.items[gameState.currentFloor];
    gameState.explored = req.session.gameState.explored[gameState.currentFloor];
    gameState.visible = req.session.gameState.visible[gameState.currentFloor];
    const dungeonSpace = new Terrain(boardSize, terrain);
    dungeon = new Dungeon(dungeonSpace, gameState.creatures, gameState.items, gameState.explored, gameState.decals, gameState.visible);
	  const position = dungeon.creatures[0].position;
    dungeon.creatures[0] = JSON.parse(JSON.stringify(player));
    dungeon.creatures[0].position = position;

    gameState.creatures[gameState.currentFloor] = dungeon.creatures;
    req.session.gameState.creatures[gameState.currentFloor] = dungeon.creatures;

    gameState.globals.mapRefresh = true;
  }

  // Save game state to file using session ID as filename
  saveGame(req.sessionID, gameState)
    .then(() => {
      // Return the response with the necessary data
      let outputs = dungeon.getOutputs(gameState.globals);
      outputs.mapRefresh = gameState.globals.mapRefresh;
      res.json(outputs);
    })
    .catch((err) => {
      console.error('Error saving game state:', err);
      // Still return response even if save fails
      let outputs = dungeon.getOutputs(gameState.globals);
      outputs.mapRefresh = gameState.globals.mapRefresh;
      res.json(outputs);
    });
});

module.exports = router;
