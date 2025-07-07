// Import required modules and dependencies
// Import required modules and dependencies
const express = require('express');
const router = express.Router();
const { Terrain } = require('./mapclass.js');
const { Dungeon } = require('./dungeon.js');
// Updated to include deleteSaveFile
const { saveGame, loadGame, extractGameStateFromSession, applyGameStateToSession, deleteSaveFile } = require('./savefile.js');

router.post('/', async (req, res) => { // Added async here
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
    // Player is dead
    globals.eventLog.push("You have died."); // Add a death message to the log
    // The client-side will likely show a death screen based on HP or a flag
    if (req.session.playername) { // Changed characterName to playername
      try {
        await deleteSaveFile(req.session.playername); // Used playername
        console.log(`Save file for character ${req.session.playername} deleted upon death.`); // Used playername
        globals.eventLog.push(`Character ${req.session.playername}'s save file deleted.`); // Used playername
        // Optionally, clear playername from session or destroy session to prevent auto-load
        // req.session.playername = null; // Or handle session destruction in app.js based on a death flag
      } catch (error) {
        console.error(`Error deleting save file for ${req.session.playername} upon death:`, error); // Used playername
        globals.eventLog.push(`Error deleting save file: ${error.message}`);
      }
    }
  }

  // Update the modified session variables
  // Important: Only update session creatures if player is not dead, or handle appropriately
  // If player is dead, the game should effectively end or go to a game over screen.
  // For now, we'll update, but the UI should prevent further actions if player HP <= 0.
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

  // Save game state to file using playername if available
  const gameState = extractGameStateFromSession(req.session);
  const saveFileName = req.session.playername || req.sessionID; // Fallback to sessionID if no playername

  // Only save if the player is alive. Dead characters' progress isn't saved.
  if (dungeon.creatures[0].hp > 0) {
    saveGame(saveFileName, gameState)
      .then(() => {
        console.log(`Game state saved for: ${saveFileName}`);
        // Return the response with the necessary data
        let outputs = dungeon.getOutputs(globals);
        outputs.mapRefresh = globals.mapRefresh;
        res.json(JSON.stringify(outputs));
      })
      .catch((err) => {
        console.error('Error saving game state:', err);
        // Still return response even if save fails
        let outputs = dungeon.getOutputs(globals);
        outputs.mapRefresh = globals.mapRefresh;
        res.json(JSON.stringify(outputs));
      });
  } else {
    // Player is dead, don't save. Just return the game state (which includes death message).
    console.log(`Player is dead. Game state for ${saveFileName} not saved.`);
    let outputs = dungeon.getOutputs(globals);
    outputs.mapRefresh = globals.mapRefresh;
    res.json(JSON.stringify(outputs));
  } // This closes the 'else' block

}); // This closes router.post('/', async (req, res) => { ... });

module.exports = router;
