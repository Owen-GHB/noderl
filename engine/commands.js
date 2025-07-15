// Import required modules and dependencies
const path = require('path');
const { initGameState, makeLevels } = require('./levelgen.js');
const { createCanvas, loadImage } = require('canvas');
const { Terrain } = require('./mapclass.js');
const { Dungeon, DungeonFloor } = require('./dungeon.js');
const { saveGame, loadGame, savefileExists } = require('./savefile.js');

function processDungeon(command, modifier, gameState) {
  const dungeon = new Dungeon(gameState);
  const currentFloor = dungeon.getCurrentFloor();

  gameState.globals = {
	  automove:false,
	  animations:[],
	  eventLog:[],
	  mapRefresh:false,
	  currentFloor:dungeon.currentFloor
  };

  if (currentFloor.creatures[0].hp > 0) {
    currentFloor.movePlayer(command, modifier, gameState.globals);
  }

  // Update the game state with the modified dungeon
  gameState.creatures[dungeon.currentFloor] = currentFloor.creatures;
  gameState.items[dungeon.currentFloor] = currentFloor.items;
  gameState.explored[dungeon.currentFloor] = currentFloor.explored;
  gameState.visible[dungeon.currentFloor] = currentFloor.visible;
  gameState.currentFloor = currentFloor.currentFloor;

  // Check if the current floor has changed
  if (gameState.globals.currentFloor === dungeon.currentFloor) {
    gameState.globals.mapRefresh = false;
  } else {
    const player = currentFloor.creatures[0];
    const oldFloor = gameState.globals.currentFloor;
    const newFloor = dungeon.getCurrentFloor();
	  const position = newFloor.creatures[0].position;
    newFloor.creatures[0] = JSON.parse(JSON.stringify(player));
    newFloor.creatures[0].position = position;
    gameState.creatures[dungeon.currentFloor] = newFloor.creatures;
	  gameState.globals.mapRefresh = true; 
  }

  return {gameState, dungeon: currentFloor};
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
      const gameState = loadGame(filename);
      const dungeon = new Dungeon(gameState);
      const currentFloor = dungeon.getCurrentFloor();
      return currentFloor.getMinimap();
}

function startFromSavefile(charName) {
  let gameState = {};
  let dungeon;

  if (savefileExists(charName)) {
    gameState = loadGame(charName);
    if (gameState.creatures[gameState.currentFloor][0].hp <= 0) {
      ({ gameState, dungeon } = makeLevels(gameState, charName));
    }
  } else {
    gameState = initGameState();
    ({ gameState, dungeon } = makeLevels(gameState, charName));
  }

  try {
    saveGame(charName, gameState);
  } catch (err) {
    console.error('Error saving game state for start:', err);
  }

  let dungeonObj;
  if (typeof dungeon === 'undefined') {
    dungeonObj = new Dungeon(gameState);
    dungeon = dungeonObj.getCurrentFloor();
  }

  gameState.globals = {
    automove: false,
    animations: [],
    eventLog: [],
    mapRefresh: true
  };

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

module.exports = {
  processWithSavefile,
  returnMinimap,
  startFromSavefile
};
