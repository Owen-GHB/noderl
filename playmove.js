// Import required modules and dependencies
const path = require('path');
const { initGameState, makeLevels } = require('./levelgen.js');
const { createCanvas, loadImage } = require('canvas');
const { Terrain } = require('./mapclass.js');
const { Dungeon } = require('./dungeon.js');
const { saveGame, loadGame, savefileExists } = require('./savefile.js');

function processDungeon(command, modifier, gameState) {
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

function processWithSavefile(command, modifier, filename) {
  
  let gameState = {};
  let dungeon;
  gameState = loadGame(filename);
  ({gameState, dungeon} = processDungeon(command, modifier, gameState));

  // Save game state to file
  try {
    saveGame(filename, gameState);
  } catch (err) {
    console.error('Error saving game state:', err);
  }
  
  return {gameState, dungeon};
}

function returnMinimap(filename) {
      let gameState = loadGame(filename);
      const boardSize = { x: 60, y: 60 };
      const dungeonSpace = new Terrain(boardSize, gameState.terrain[gameState.currentFloor]);
      let dungeon = new Dungeon(dungeonSpace, gameState.creatures[gameState.currentFloor], gameState.items[gameState.currentFloor], gameState.explored[gameState.currentFloor], gameState.decals[gameState.currentFloor], gameState.visible[gameState.currentFloor]);
      return dungeon.getMinimap();
}

function startFromSavefile(filename) {
  const boardSize = { x: 60, y: 60 };
  let dungeon;
  let gameState = {};

  if (savefileExists(filename)) {
    gameState = loadGame(filename);
    gameState.globals = {
      automove: false,
      animations: [],
      eventLog: [],
      mapRefresh: true
    };
    if (gameState.creatures[gameState.currentFloor][0].hp <= 0) {
      ({ gameState: gameState, dungeon: dungeon } = makeLevels(gameState));
    }
  } else {
    gameState = initGameState();
    ({ gameState: gameState, dungeon: dungeon } = makeLevels(gameState));
  }

  try {
    saveGame(filename, gameState);
  } catch (err) {
    console.error('Error saving game state for start:', err);
  }

  if (typeof dungeon === 'undefined') {
    const dungeonSpace = new Terrain(boardSize, gameState.terrain[gameState.currentFloor]);
    dungeon = new Dungeon(dungeonSpace, gameState.creatures[gameState.currentFloor], gameState.items[gameState.currentFloor], gameState.explored[gameState.currentFloor], gameState.decals[gameState.currentFloor], gameState.visible[gameState.currentFloor]);
  }
  let outputs = dungeon.getOutputs(gameState.globals);
  outputs.mapRefresh = gameState.globals.mapRefresh;
  return outputs;
}

async function getImageBuffer(modifier) {
  let {tilesize, imageof} = modifier;
  const canvas = createCanvas(tilesize, tilesize);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, tilesize, tilesize);

  if (imageof !== 'none') {
    try {
        const original = await loadImage(path.join(__dirname, `static/tiles/${imageof}.png`));
        ctx.drawImage(original, 0, 0, tilesize, tilesize);
    } catch (imgError) {
        console.error(`Error loading image ${imageof}:`, imgError);
    }
  } else {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, tilesize, tilesize);
  }

  const imageData = canvas.toDataURL('image/png');
  const base64Data = imageData.replace(/^data:image\/png;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  return buffer;
}

async function processCommand(command, modifier, filename) {
  try {
    switch (command) {
      case 'image':
        const buffer = await getImageBuffer(modifier);
        return { buffer, contentType: 'image/png' };

      case 'info':
        if (modifier === 'minimap') {
          const minimap = returnMinimap(filename);
          return { json: minimap };
        } else {
          return { error: `Invalid modifier for 'info' command: ${modifier}`, status: 400 };
        }

      case 'start':
        const outputs = startFromSavefile(modifier);
        return { json: outputs };

      default:
        if (typeof modifier === 'undefined') {
          return { error: `Missing 'modifier' for command: ${command}`, status: 400 };
        }
        const { gameState, dungeon } = processWithSavefile(command, modifier, filename);
        const output = dungeon.getOutputs(gameState.globals);
        output.mapRefresh = gameState.globals.mapRefresh;
        return { json: output };
    }
  } catch (err) {
    console.error(`Error handling command '${command}':`, err);
    return {
      error: `Failed to process command '${command}'`,
      details: err.message,
      status: 400
    };
  }
}

async function processJSONInput(jsonString) {
  let data;

  try {
    data = JSON.parse(jsonString);
  } catch (err) {
    return { error: "Invalid JSON format"};
  }

  const { command, modifier } = data;

  if (!command) {
    return { error: "Missing 'command' in request data"};
  }

  const filename = 'Player';

  return await processCommand(command, modifier, filename);
}

module.exports = {
  processJSONInput
};