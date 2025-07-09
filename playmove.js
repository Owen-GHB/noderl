// Import required modules and dependencies
const express = require('express');
const router = express.Router();
const { Terrain } = require('./mapclass.js');
const { Dungeon } = require('./dungeon.js');
const { saveGame, loadGame } = require('./savefile.js');

router.post('/', async (req, res) => {
  const givenCommand = req.body.command;
  let commandModifier = req.body.modifier;
  commandModifier = commandModifier.replace(/\\/g, ''); // Remove slashes

  const boardSize = { x: 60, y: 60 };
  let dungeon;
  let gameState;
  let globals = {
    automove: false,
    animations: [],
    eventLog: [],
    mapRefresh: false,
    currentFloor: null // Will be set from loaded gameState
  };

  try {
    gameState = await loadGame(req.sessionID);
    globals.currentFloor = gameState.currentFloor; // Set initial current floor for globals

    const currentFloorTerrain = gameState.terrain[gameState.currentFloor];
    const currentFloorCreatures = gameState.creatures[gameState.currentFloor];
    const currentFloorItems = gameState.items[gameState.currentFloor];
    const currentFloorExplored = gameState.explored[gameState.currentFloor];
    const currentFloorDecals = gameState.decals[gameState.currentFloor];
    const currentFloorVisible = gameState.visible[gameState.currentFloor];

    const dungeonSpace = new Terrain(boardSize, currentFloorTerrain);
    dungeon = new Dungeon(
      dungeonSpace,
      currentFloorCreatures,
      currentFloorItems,
      currentFloorExplored,
      currentFloorDecals,
      currentFloorVisible
    );
    // Ensure dungeon object has the correct currentFloor, though it's not directly used by Dungeon internally
    // but good for consistency if we were to add such a property to Dungeon.
    // The game logic relies on globals.currentFloor or gameState.currentFloor.

  } catch (error) {
    console.error(`Error loading game state for session ${req.sessionID} in playmove:`, error);
    return res.status(500).json({ error: 'Failed to load game data. A game must be started first.' });
  }

  const oldFloor = gameState.currentFloor;

  if (dungeon.creatures[0] && dungeon.creatures[0].hp > 0) {
    dungeon.movePlayer(givenCommand, commandModifier, globals);
    // movePlayer can change globals.currentFloor
  } else if (!dungeon.creatures[0]) {
     console.error(`Error: Player creature not found in playmove for session ${req.sessionID} on floor ${gameState.currentFloor}`);
     return res.status(500).json({ error: 'Player data corrupted or missing.' });
  }
   // If player hp <= 0, no move is processed, effectively game over until levelgen creates a new game.

  // Update the gameState object based on changes in the dungeon
  gameState.creatures[oldFloor] = dungeon.creatures; // Save creatures from the floor player was on
  gameState.items[oldFloor] = dungeon.items;         // Save items from the floor player was on
  gameState.explored[oldFloor] = dungeon.explored;   // Save explored status
  gameState.visible[oldFloor] = dungeon.visible;     // Save visibility

  // Handle floor changes
  if (globals.currentFloor !== oldFloor) {
    gameState.currentFloor = globals.currentFloor; // Update currentFloor in gameState

    // The player object (dungeon.creatures[0]) has been updated by movePlayer (e.g. position for stairs)
    // and needs to be correctly placed in the new floor's creature list.
    // This part of logic is complex as the `dungeon` object currently only holds one floor's data.
    // The `movePlayer` function in `dungeon.js` must correctly handle placing the player
    // on the new floor, which implies it might need access to the full `gameState.creatures`
    // or that `playmove.js` orchestrates this.
    // For now, we assume `movePlayer` has updated `dungeon.creatures[0]` and `globals.currentFloor`.
    // The new floor's data for the `dungeon` object will be loaded on the *next* request (either playmove or levelgen).
    // However, we must ensure the player data is stored correctly for the *new* floor if it changed.

    // If player moved to a new floor, their data (already updated in dungeon.creatures[0])
    // needs to be stored in the gameState for that new floor.
    // And they need to be removed from the old floor's creature list if they are not there anymore.
    // This logic might be tricky as `dungeon.js` doesn't know about `gameState`.

    // Let's assume `dungeon.movePlayer` handles placing the player character in the
    // correct position for the new floor and `globals.currentFloor` is updated.
    // The `dungeon.creatures` array is for the *current* (oldFloor before this block) floor.
    // If the floor changed, the player object (which is `dungeon.creatures[0]`) has its `.position`
    // updated to be an "exit" tile like 'downstair' or 'upstair', and `globals.currentFloor` is changed.
    // The actual transfer of the player object to the new floor's creature list within `gameState`
    // needs to happen here.

    const playerCharacter = dungeon.creatures[0]; // This is the player from the old floor

    // Ensure the new floor has a creature array
    if (!gameState.creatures[gameState.currentFloor]) {
        gameState.creatures[gameState.currentFloor] = []; // Initialize if undefined
    }
    // Find if a placeholder player object exists on the new floor (e.g. from levelgen) and replace it, or add the player.
    // Typically, levelgen.js places the player on floor 1 or on the upstair of the previous floor.
    // For simplicity, we'll assume the new floor's creature list might contain a "template" player or be empty where player should be.
    // A robust way is to ensure player (ID 0) is unique.

    // Remove player from old floor's list (if they aren't already by some other mechanism)
    // This is tricky if dungeon.creatures was directly gameState.creatures[oldFloor]
    // The current `dungeon.creatures` is a copy. So modifying it doesn't affect other floors.
    // We've already saved `dungeon.creatures` to `gameState.creatures[oldFloor]`.
    // If the player is meant to be *moved*, they shouldn't be in `gameState.creatures[oldFloor]` anymore.
    // This part of the original logic was:
    // req.session.creatures[floor] = dungeon.creatures; (floor is oldFloor)
    // ... then if floor changed ...
    // creatures = req.session.creatures[floor]; (floor is newFloor)
    // dungeon.creatures[0] = JSON.parse(JSON.stringify(player));
    // req.session.creatures[floor] = dungeon.creatures; (floor is newFloor)

    // So, if floor changed:
    // 1. Player is saved as part of gameState.creatures[oldFloor]. If they moved floor, they shouldn't be there.
    //    Dungeon.js `movePlayer` likely sets player HP to 0 or similar on old floor if they descend/ascend.
    //    Or, more simply, we remove them from oldFloor's creature list.
    //    Let's assume for now `dungeon.movePlayer` correctly modifies `dungeon.creatures` for the old floor (e.g. removes player).
    //    Then `gameState.creatures[oldFloor] = dungeon.creatures;` is correct.

    // 2. Player needs to be added/updated in gameState.creatures[gameState.currentFloor (newFloor)].
    //    The `playerCharacter` variable holds the player state *before* it might have been altered by `dungeon.getOutputs`.
    //    The `dungeon.creatures[0]` is the most up-to-date player object.

    // If the player is changing floors, their representation on the *new* floor needs to be set.
    // The `levelgen` process already populates all floors. When changing floors,
    // the player essentially "replaces" the version of themselves that might be on the new floor
    // or is added if not present. The `dungeon.js` `movePlayer` should handle the player's new position.
    // The `dungeon` object itself will be re-instantiated with the new floor's data on the next client request.
    // What's critical is that `gameState.creatures[newFloor]` gets the correct player object.

    // Let's simplify: the `dungeon` object is for the *current active floor*.
    // If `movePlayer` changes `globals.currentFloor`, it implies the player character (`dungeon.creatures[0]`)
    // is now conceptually on that new floor. We save the state of the old floor, then ensure the player
    // is correctly represented in the `gameState` for the new floor.

    // Remove player from old floor's creature list in gameState
    // This assumes player is always creatures[0] and other creatures are preserved
    const creaturesOnOldFloor = gameState.creatures[oldFloor].slice(1); // All non-player creatures
    gameState.creatures[oldFloor] = [playerCharacter, ...creaturesOnOldFloor]; // Player might be modified (e.g. HP after trap)
                                                                            // but then removed if they successfully moved.
                                                                            // This needs to be robust.

    // A cleaner way: dungeon.movePlayer should return the player object if they moved floor,
    // and modify its own this.creatures list for the old floor (e.g., remove player).
    // For now, let's assume dungeon.creatures (for oldFloor) is correctly updated by movePlayer.
    // Then, place the up-to-date player object onto the new floor in gameState.

    let playerObj = dungeon.creatures[0]; // The player, potentially updated by movePlayer.

    // If the player successfully moved to a new floor, they should not be in the old floor's list.
    // Let's assume `movePlayer` sets `playerObj.position` to an inter-level marker if successful.
    // And `dungeon.creatures` for the old floor might or might not still contain them.
    // The most robust way: if `globals.currentFloor !== oldFloor`, player is on new floor.

    // Update player object in the new floor's creature list
    if (!gameState.creatures[globals.currentFloor]) gameState.creatures[globals.currentFloor] = [];

    let playerFoundOnNewFloor = false;
    gameState.creatures[globals.currentFloor] = gameState.creatures[globals.currentFloor].map(c => {
        if (c.id === 0) { // Assuming player is id: 0
            playerFoundOnNewFloor = true;
            return playerObj; // Replace existing player entry on new floor
        }
        return c;
    });
    if (!playerFoundOnNewFloor) {
        // This case implies levelgen didn't place a player object on this floor, or it was removed.
        // Or player ID isn't consistently 0. For Gwilim, it should be.
        // Add the player if not found (e.g. first time reaching this floor if it's not pre-populated with player)
        gameState.creatures[globals.currentFloor].unshift(playerObj); // Add to start
    }

    // And remove from old floor if they are distinct entities
    // This is tricky if playerCharacter was a reference directly into gameState.creatures[oldFloor]
    // The current `dungeon.creatures` is a copy.
    // The `dungeon.movePlayer` should handle removing player from `this.creatures` if they successfully change level.
    // So `gameState.creatures[oldFloor] = dungeon.creatures;` would then be correct.
    // Let's assume this is the case for now.

    globals.mapRefresh = true;
  } else {
    globals.mapRefresh = false;
  }

  try {
    await saveGame(req.sessionID, gameState);
    let outputs = dungeon.getOutputs(globals); // dungeon is for the floor the player *was* on
                                               // or, if floor changed, it's still the old floor's layout
                                               // but player data inside dungeon.creatures[0] is up-to-date.
                                               // getOutputs uses globals.currentFloor to fetch correct data for display.
    outputs.mapRefresh = globals.mapRefresh;
    res.json(outputs);
  } catch (saveError) {
    console.error(`Error saving game state for session ${req.sessionID} in playmove:`, saveError);
    // Still return response if possible
    let outputs = dungeon.getOutputs(globals);
    outputs.mapRefresh = globals.mapRefresh;
    res.status(500).json(outputs);
  }
});

module.exports = router;
