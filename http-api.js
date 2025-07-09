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

router.post('/playmove', (req, res) => {
  // Retrieve the command and modifier from the request body
  let { command, modifier } = req.body;
  modifier = modifier.replace(/\\/g, ''); // Remove slashes
  const filename = 'Player'; // Use a fixed filename for simplicity
  let {gameState, dungeon} = processWithSavefile(command, modifier, filename);

  // Return the response with the necessary data
  let outputs = dungeon.getOutputs(gameState.globals);
  outputs.mapRefresh = gameState.globals.mapRefresh;
  res.json(outputs);
});

router.post('/levelgen', (req, res) => {
  const boardSize = { x: 60, y: 60 };
  const filename = 'Player';
  let dungeon;
  let gameState = {};

  if (savefileExists(filename)) {
    gameState = loadGame(filename);
    gameState.globals = {
      automove:false,
      animations:[],
      eventLog:[],
      mapRefresh:true
    };
    if (gameState.creatures[gameState.currentFloor][0].hp <= 0) {
      ({ gameState, dungeon } = makeLevels(gameState));
    }
  } else {
    gameState = initGameState();
    ({ gameState, dungeon } = makeLevels(gameState));
  }
  
  // Save game state to file using session ID as filename
  try {
    saveGame(filename, gameState);
  } catch (err) {
    console.error('Error saving game state:', err);
  }
  if (typeof(dungeon) === 'undefined') {
      const dungeonSpace = new Terrain(boardSize, gameState.terrain[gameState.currentFloor]);
      dungeon = new Dungeon(dungeonSpace, gameState.creatures[gameState.currentFloor], gameState.items[gameState.currentFloor], gameState.explored[gameState.currentFloor], gameState.decals[gameState.currentFloor], gameState.visible[gameState.currentFloor]);
  }
  let outputs = dungeon.getOutputs(gameState.globals);
  outputs.mapRefresh = gameState.globals.mapRefresh;
  res.json(outputs);
});

router.post('/minimap', (req, res) => {
  const filename = 'Player';
  let gameState = loadGame(filename);

  const boardSize = { x: 60, y: 60 };
  const dungeonSpace = new Terrain(boardSize, gameState.terrain[gameState.currentFloor]);
  let dungeon = new Dungeon(dungeonSpace, gameState.creatures[gameState.currentFloor], gameState.items[gameState.currentFloor], gameState.explored[gameState.currentFloor], gameState.decals[gameState.currentFloor], gameState.visible[gameState.currentFloor]);

  // Save game state to file using session ID as filename
  try {
    saveGame(filename, gameState);
  } catch (err) {
    console.error('Error saving game state:', err);
  }
  // Return the response with the necessary data
  res.json(dungeon.getMinimap());
});

router.get('/getimage', async (req, res) => {
  const tilesize = parseInt(req.query.tilesize, 10);
  const imageof = req.query.imageof;

  const canvas = createCanvas(tilesize, tilesize);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, tilesize, tilesize);

  if (imageof !== 'none') {
    const original = await loadImage(path.join(__dirname, `static/tiles/${imageof}.png`));
    ctx.drawImage(original, 0, 0, tilesize, tilesize);
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
});

module.exports = router;
