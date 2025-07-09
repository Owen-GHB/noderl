// Import required modules and dependencies
const express = require('express');
const router = express.Router();
const { Terrain } = require('./mapclass.js');
const { Dungeon } = require('./dungeon.js');
const { saveGame, loadGame } = require('./savefile.js');

router.post('/', (req, res) => {
  // Retrieve the command and modifier from the request body
  const givenCommand = req.body.command;
  let commandModifier = req.body.modifier;
  commandModifier = commandModifier.replace(/\\/g, ''); // Remove slashes
  let gameState = {};
  gameState = loadGame('Player');
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

  // Check if the current floor has changed
  if (gameState.globals.currentFloor === gameState.currentFloor) {
    gameState.globals.mapRefresh = false;
  } else {
    const player = dungeon.creatures[0];
    const oldFloor = gameState.globals.currentFloor;
    const dungeonSpace = new Terrain(boardSize, gameState.terrain[gameState.currentFloor]);
    dungeon = new Dungeon(dungeonSpace, gameState.creatures[gameState.currentFloor], gameState.items[gameState.currentFloor], gameState.explored[gameState.currentFloor], gameState.decals[gameState.currentFloor], gameState.visible[gameState.currentFloor]);
	const position = dungeon.creatures[0].position;
    dungeon.creatures[0] = JSON.parse(JSON.stringify(player));
    dungeon.creatures[0].position = position;
    gameState.creatures[gameState.currentFloor] = dungeon.creatures;
	  gameState.globals.mapRefresh = true; 
  }

  // Save game state to file using session ID as filename
  try {
    saveGame('Player', gameState);
  } catch (err) {
    console.error('Error saving game state:', err);
  }
  // Return the response with the necessary data
  let outputs = dungeon.getOutputs(gameState.globals);
  outputs.mapRefresh = gameState.globals.mapRefresh;
  res.json(outputs);
});

module.exports = router;
