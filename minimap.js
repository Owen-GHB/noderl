// Import required modules and dependencies
const express = require('express');
const router = express.Router();
const { Terrain } = require('./mapclass.js');
const { Dungeon } = require('./dungeon.js');
const { saveGame, loadGame, extractGameStateFromSession, applyGameStateToSession } = require('./savefile.js');

router.post('/', (req, res) => {
  // Retrieve the necessary session variables
  let floor = req.session.currentFloor;
  let terrain = req.session.terrain[floor];
  let decals = req.session.decals[floor];
  let creatures = req.session.creatures[floor];
  let items = req.session.items[floor];
  let explored = req.session.explored[floor];
  let visible = req.session.visible[floor];

  const boardSize = { x: 60, y: 60 };
  const dungeonSpace = new Terrain(boardSize, terrain);
  let dungeon = new Dungeon(dungeonSpace, creatures, items, explored, decals, visible);

  // Save game state to file using session ID as filename
  const gameState = extractGameStateFromSession(req.session);
  saveGame(req.sessionID, gameState)
    .then(() => {
      // Return the response with the necessary data
      res.json(dungeon.getMinimap());
    })
    .catch((err) => {
      console.error('Error saving game state:', err);
      // Still return response even if save fails
      res.json(dungeon.getMinimap());
    });
});

module.exports = router;
