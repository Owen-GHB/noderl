// Import required modules and dependencies
const express = require('express');
const router = express.Router();
const { Terrain } = require('./mapclass.js');
const { Dungeon } = require('./dungeon.js');
const { saveGame, loadGame } = require('./savefile.js');

router.post('/', (req, res) => {
  // Retrieve the necessary session variables
  let gameState = loadGame(req.sessionID);

  const boardSize = { x: 60, y: 60 };
  const dungeonSpace = new Terrain(boardSize, gameState.terrain[gameState.currentFloor]);
  let dungeon = new Dungeon(dungeonSpace, gameState.creatures[gameState.currentFloor], gameState.items[gameState.currentFloor], gameState.explored[gameState.currentFloor], gameState.decals[gameState.currentFloor], gameState.visible[gameState.currentFloor]);

  // Save game state to file using session ID as filename
  try {
    saveGame(req.sessionID, gameState);
  } catch (err) {
    console.error('Error saving game state:', err);
  }
  // Return the response with the necessary data
  res.json(dungeon.getMinimap());
});

module.exports = router;
