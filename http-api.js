// Import required modules and dependencies
// Import required modules and dependencies
const express = require('express');
const router = express.Router();
const path = require('path');
const { createCanvas, loadImage } = require('canvas');
const { Terrain, DungeonSpace } = require('./mapclass.js');
const { Dungeon } = require('./dungeon.js');
const { initGameState, makeLevels } = require('./levelgen.js');
const { processWithSavefile } = require('./playmove.js');
const { saveGame, loadGame, savefileExists } = require('./savefile.js');

// Unified API endpoint
router.all('/api', async (req, res) => {
  let command, modifier;

  if (req.method === 'POST') {
    ({ command, modifier } = req.body);
  } else if (req.method === 'GET') {
    command = req.query.command;
    modifier = req.query.modifier;
  } else {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  if (typeof command === 'undefined') {
    return res.status(400).json({ error: "Command not provided" });
  }

  switch (command) {
    case 'info':
      if (modifier === 'minimap') {
        const filename = 'Player'; // As per original /minimap route
        let gameState = loadGame(filename);
        const boardSize = { x: 60, y: 60 };
        const dungeonSpace = new Terrain(boardSize, gameState.terrain[gameState.currentFloor]);
        let dungeon = new Dungeon(dungeonSpace, gameState.creatures[gameState.currentFloor], gameState.items[gameState.currentFloor], gameState.explored[gameState.currentFloor], gameState.decals[gameState.currentFloor], gameState.visible[gameState.currentFloor]);
        // Save game state (as in original) - consider if this is necessary for 'info'
        try {
          saveGame(filename, gameState);
        } catch (err) {
          console.error('Error saving game state for minimap:', err);
        }
        res.json(dungeon.getMinimap());
      } else {
        res.status(400).json({ error: `bad modifier for command info: ${modifier}` });
      }
      break;

    case 'start':
      const startFilename = modifier || 'Player'; // Use modifier as filename, default to 'Player'
      const boardSize = { x: 60, y: 60 };
      let startDungeon;
      let startGameState = {};

      if (savefileExists(startFilename)) {
        startGameState = loadGame(startFilename);
        startGameState.globals = {
          automove: false,
          animations: [],
          eventLog: [],
          mapRefresh: true
        };
        if (startGameState.creatures[startGameState.currentFloor][0].hp <= 0) {
          ({ gameState: startGameState, dungeon: startDungeon } = makeLevels(startGameState));
        }
      } else {
        startGameState = initGameState();
        ({ gameState: startGameState, dungeon: startDungeon } = makeLevels(startGameState));
      }

      try {
        saveGame(startFilename, startGameState);
      } catch (err) {
        console.error('Error saving game state for start:', err);
      }

      if (typeof startDungeon === 'undefined') {
        const dungeonSpace = new Terrain(boardSize, startGameState.terrain[startGameState.currentFloor]);
        startDungeon = new Dungeon(dungeonSpace, startGameState.creatures[startGameState.currentFloor], startGameState.items[startGameState.currentFloor], startGameState.explored[startGameState.currentFloor], startGameState.decals[startGameState.currentFloor], startGameState.visible[startGameState.currentFloor]);
      }
      let startOutputs = startDungeon.getOutputs(startGameState.globals);
      startOutputs.mapRefresh = startGameState.globals.mapRefresh;
      res.json(startOutputs);
      break;

    case 'image':
      if (req.method !== 'GET') {
        return res.status(405).json({ error: "Image command only supports GET requests" });
      }
      let tilesize, imageof;
      try {
        const imageParams = JSON.parse(modifier);
        tilesize = parseInt(imageParams.tilesize, 10);
        imageof = imageParams.imageof;
        if (isNaN(tilesize) || typeof imageof !== 'string') {
          throw new Error("Invalid parameters for image command");
        }
      } catch (e) {
        return res.status(400).json({ error: "Invalid or missing JSON modifier for image command. Expected { \"tilesize\": <int>, \"imageof\": \"<string>\" }" });
      }

      const canvas = createCanvas(tilesize, tilesize);
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, tilesize, tilesize);

      if (imageof !== 'none') {
        try {
            const original = await loadImage(path.join(__dirname, `static/tiles/${imageof}.png`));
            ctx.drawImage(original, 0, 0, tilesize, tilesize);
        } catch (imgError) {
            console.error(`Error loading image ${imageof}:`, imgError);
            // Optionally send a default image or error image
            ctx.fillStyle = "#FF0000"; // Red for error
            ctx.fillRect(0, 0, tilesize, tilesize);
        }
      } else {
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, tilesize, tilesize);
      }

      const imageData = canvas.toDataURL('image/png');
      const base64Data = imageData.replace(/^data:image\/png;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': buffer.length
      });
      res.end(buffer);
      break;

    default: // Corresponds to the old /playmove
      // The 'command' variable from the switch is the actual command for playmove
      // The 'modifier' variable is its modifier.
      // Ensure modifier is a string if it came from GET query; playmove expects it.
      let playMoveModifier = (typeof modifier === 'string') ? modifier.replace(/\\/g, '') : modifier;
      const playMoveFilename = 'Player'; // Fixed filename as in original /playmove

      // If the original command was one of the specific keywords, but ended up here (e.g. POST to 'image')
      // we should probably error or handle it as an invalid playmove command.
      // For now, we assume 'command' is the intended playmove command.
      let {gameState, dungeon} = processWithSavefile(command, playMoveModifier, playMoveFilename);
      let outputs = dungeon.getOutputs(gameState.globals);
      outputs.mapRefresh = gameState.globals.mapRefresh;
      res.json(outputs);
      break;
  }
});

module.exports = router;
