const fs = require('fs').promises;
const path = require('path');

// Ensure save directory exists
const SAVE_DIR = path.join(__dirname, 'save');

async function ensureSaveDirectory() {
  try {
    await fs.access(SAVE_DIR);
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.mkdir(SAVE_DIR, { recursive: true });
    } else {
      throw error;
    }
  }
}

/**
 * Save game state to a file
 * @param {string} saveFileName - Name of the save file (without extension)
 * @param {Object} gameState - Game state object matching session structure
 * @param {number} gameState.currentFloor - Current floor number
 * @param {Object} gameState.terrain - Terrain data indexed by floor
 * @param {Object} gameState.decals - Decals data indexed by floor
 * @param {Object} gameState.creatures - Creatures data indexed by floor
 * @param {Object} gameState.items - Items data indexed by floor
 * @param {Object} gameState.explored - Explored areas indexed by floor
 * @param {Object} gameState.visible - Visible areas indexed by floor
 * @returns {Promise<void>}
 */
async function saveGame(saveFileName, gameState) {
  try {
    await ensureSaveDirectory();
    
    // Validate required properties
    const requiredProperties = ['currentFloor', 'terrain', 'decals', 'creatures', 'items', 'explored', 'visible'];
    for (const prop of requiredProperties) {
      if (!(prop in gameState)) {
        throw new Error(`Missing required property: ${prop}`);
      }
    }
    
    // Create save data with metadata
    const saveData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      gameState: {
        currentFloor: gameState.currentFloor,
        terrain: gameState.terrain,
        decals: gameState.decals,
        creatures: gameState.creatures,
        items: gameState.items,
        explored: gameState.explored,
        visible: gameState.visible
      }
    };
    
    const saveFilePath = path.join(SAVE_DIR, `${saveFileName}.json`);
    await fs.writeFile(saveFilePath, JSON.stringify(saveData, null, 2), 'utf8');
    
    console.log(`Game saved successfully to: ${saveFilePath}`);
  } catch (error) {
    console.error('Error saving game:', error);
    throw error;
  }
}

/**
 * Load game state from a file
 * @param {string} saveFileName - Name of the save file (without extension)
 * @returns {Promise<Object>} Game state object matching session structure
 */
async function loadGame(saveFileName) {
  try {
    const saveFilePath = path.join(SAVE_DIR, `${saveFileName}.json`);
    
    // Check if file exists
    try {
      await fs.access(saveFilePath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Save file not found: ${saveFileName}.json`);
      }
      throw error;
    }
    
    const saveDataRaw = await fs.readFile(saveFilePath, 'utf8');
    const saveData = JSON.parse(saveDataRaw);
    
    // Validate save data structure
    if (!saveData.gameState) {
      throw new Error('Invalid save file format: missing gameState');
    }
    
    const gameState = saveData.gameState;
    const requiredProperties = ['currentFloor', 'terrain', 'decals', 'creatures', 'items', 'explored', 'visible'];
    
    for (const prop of requiredProperties) {
      if (!(prop in gameState)) {
        throw new Error(`Invalid save file: missing required property ${prop}`);
      }
    }
    
    console.log(`Game loaded successfully from: ${saveFilePath}`);
    console.log(`Save timestamp: ${saveData.timestamp}`);
    
    return gameState;
  } catch (error) {
    console.error('Error loading game:', error);
    throw error;
  }
}

/**
 * List all available save files
 * @returns {Promise<Array<Object>>} Array of save file info objects
 */
async function listSaveFiles() {
  try {
    await ensureSaveDirectory();
    
    const files = await fs.readdir(SAVE_DIR);
    const saveFiles = files.filter(file => file.endsWith('.json'));
    
    const saveFileInfo = [];
    
    for (const file of saveFiles) {
      try {
        const filePath = path.join(SAVE_DIR, file);
        const stats = await fs.stat(filePath);
        const saveDataRaw = await fs.readFile(filePath, 'utf8');
        const saveData = JSON.parse(saveDataRaw);
        
        saveFileInfo.push({
          fileName: file.replace('.json', ''),
          fullPath: filePath,
          timestamp: saveData.timestamp || 'Unknown',
          version: saveData.version || 'Unknown',
          currentFloor: saveData.gameState?.currentFloor || 'Unknown',
          fileSize: stats.size,
          lastModified: stats.mtime
        });
      } catch (error) {
        console.warn(`Error reading save file ${file}:`, error.message);
      }
    }
    
    // Sort by last modified date (newest first)
    saveFileInfo.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
    
    return saveFileInfo;
  } catch (error) {
    console.error('Error listing save files:', error);
    throw error;
  }
}

/**
 * Delete a save file
 * @param {string} saveFileName - Name of the save file (without extension)
 * @returns {Promise<void>}
 */
async function deleteSaveFile(saveFileName) {
  try {
    const saveFilePath = path.join(SAVE_DIR, `${saveFileName}.json`);
    
    // Check if file exists
    try {
      await fs.access(saveFilePath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Save file not found: ${saveFileName}.json`);
      }
      throw error;
    }
    
    await fs.unlink(saveFilePath);
    console.log(`Save file deleted: ${saveFilePath}`);
  } catch (error) {
    console.error('Error deleting save file:', error);
    throw error;
  }
}

/**
 * Extract game state from Express session for saving
 * @param {Object} session - Express session object
 * @returns {Object} Game state object ready for saving
 */
function extractGameStateFromSession(session) {
  return {
    currentFloor: session.currentFloor,
    terrain: session.terrain,
    decals: session.decals,
    creatures: session.creatures,
    items: session.items,
    explored: session.explored,
    visible: session.visible
  };
}

/**
 * Apply loaded game state to Express session
 * @param {Object} session - Express session object
 * @param {Object} gameState - Loaded game state
 */
function applyGameStateToSession(session, gameState) {
  session.currentFloor = gameState.currentFloor;
  session.terrain = gameState.terrain;
  session.decals = gameState.decals;
  session.creatures = gameState.creatures;
  session.items = gameState.items;
  session.explored = gameState.explored;
  session.visible = gameState.visible;
}

module.exports = {
  saveGame,
  loadGame,
  listSaveFiles,
  deleteSaveFile,
  extractGameStateFromSession,
  applyGameStateToSession
};
