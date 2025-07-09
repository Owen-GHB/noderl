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
  // Retrieve the necessary session variables
  let floor = req.session.currentFloor;
  let terrain = req.session.terrain[floor];
  let decals = req.session.decals[floor];
  let creatures = req.session.creatures[floor];
  let items = req.session.items[floor];
  let explored = req.session.explored[floor];
  let visible = req.session.visible[floor];
  let globals = {
	  automove:false,
	  animations:[],
	  eventLog:[],
	  mapRefresh:false,
	  currentFloor:floor
  };

  const boardSize = { x: 60, y: 60 };
  const dungeonSpace = new Terrain(boardSize, terrain);
  let dungeon = new Dungeon(dungeonSpace, creatures, items, explored, decals, visible);

  if (dungeon.creatures[0].hp > 0) {
    dungeon.movePlayer(givenCommand, commandModifier, globals);
  } else {
    // Handle the death animation
  }

  // Update the modified session variables
  req.session.creatures[floor] = dungeon.creatures;
  req.session.items[floor] = dungeon.items;
  req.session.explored[floor] = dungeon.explored;
  req.session.visible[floor] = dungeon.visible;
  req.session.currentFloor = dungeon.currentFloor;

  if (req.session.currentFloor === floor) {
    globals.mapRefresh = false;
  } else {
    const player = dungeon.creatures[0];
    const oldFloor = floor;
    floor = req.session.currentFloor;
    terrain = req.session.terrain[floor];
    decals = req.session.decals[floor];
    creatures = req.session.creatures[floor];
    items = req.session.items[floor];
    explored = req.session.explored[floor];
    visible = req.session.visible[floor];
    const dungeonSpace = new Terrain(boardSize, terrain);
    dungeon = new Dungeon(dungeonSpace, creatures, items, explored, decals, visible);
	const position = dungeon.creatures[0].position;
    dungeon.creatures[0] = JSON.parse(JSON.stringify(player));
    dungeon.creatures[0].position = position;

    req.session.creatures[floor] = dungeon.creatures;

    globals.mapRefresh = true;
  }

  // Save game state to file using session ID as filename
  const gameState = extractGameStateFromSession(req.session);
  saveGame(req.sessionID, gameState)
    .then(() => {
      // Return the response with the necessary data
      let outputs = dungeon.getOutputs(globals);
      outputs.mapRefresh = globals.mapRefresh;
      res.json(outputs);
    })
    .catch((err) => {
      console.error('Error saving game state:', err);
      // Still return response even if save fails
      let outputs = dungeon.getOutputs(globals);
      outputs.mapRefresh = globals.mapRefresh;
      res.json(outputs);
    });
});

module.exports = router;
