// Import required modules and dependencies
const express = require('express');
const router = express.Router();
const { Terrain } = require('./mapclass.js');
const { Dungeon } = require('./dungeon.js');
const { saveGame, loadGame } = require('./savefile.js');

function processCommand(command, modifier, gameState) {
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
    dungeon.movePlayer(command, modifier, gameState.globals);
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
    let terrain = gameState.terrain[gameState.currentFloor];
    let creatures = gameState.creatures[gameState.currentFloor];
    let items = gameState.items[gameState.currentFloor];
    let explored = gameState.explored[gameState.currentFloor];
    let decals = gameState.decals[gameState.currentFloor];
    let visible = gameState.visible[gameState.currentFloor];

    const dungeonSpace = new Terrain(boardSize, terrain);
    dungeon = new Dungeon(dungeonSpace, creatures, items, explored, decals, visible);
	  const position = dungeon.creatures[0].position;
    dungeon.creatures[0] = JSON.parse(JSON.stringify(player));
    dungeon.creatures[0].position = position;
    gameState.creatures[gameState.currentFloor] = dungeon.creatures;
	  gameState.globals.mapRefresh = true; 
  }

  return {gameState, dungeon};
}

function processWithSavefile(command, commandModifier, filename) {
  let gameState = {};
  let dungeon;
  gameState = loadGame(filename);
  ({gameState, dungeon} = processCommand(command, commandModifier, gameState));

  // Save game state to file
  try {
    saveGame(filename, gameState);
  } catch (err) {
    console.error('Error saving game state:', err);
  }
  
  return {gameState, dungeon};
}

router.post('/', (req, res) => {
  // Retrieve the command and modifier from the request body
  const givenCommand = req.body.command;
  let commandModifier = req.body.modifier;
  commandModifier = commandModifier.replace(/\\/g, ''); // Remove slashes
  const filename = 'Player'; // Use a fixed filename for simplicity
  let {gameState, dungeon} = processWithSavefile(givenCommand, commandModifier, filename);
  // Return the response with the necessary data
  let outputs = dungeon.getOutputs(gameState.globals);
  outputs.mapRefresh = gameState.globals.mapRefresh;
  res.json(outputs);
});

module.exports = router;
