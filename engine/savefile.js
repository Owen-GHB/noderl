const fs = require('fs');
const path = require('path');

// Ensure save directory exists
const SAVE_DIR = path.join(__dirname, 'save');

function ensureSaveDirectory() {
  try {
    fs.accessSync(SAVE_DIR);
  } catch (error) {
    if (error.code === 'ENOENT') {
      fs.mkdirSync(SAVE_DIR, { recursive: true });
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
 */
function saveGame(saveFileName, gameState) {
  try {
    ensureSaveDirectory();
    
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
    fs.writeFileSync(saveFilePath, JSON.stringify(saveData, null, 2), 'utf8');
    
  } catch (error) {
    console.error('Error saving game:', error);
    throw error;
  }
}

/**
 * Load game state from a file
 * @param {string} saveFileName - Name of the save file (without extension)
 * @returns {Object} Game state object matching session structure
 */
function loadGame(saveFileName) {
  try {
    const saveFilePath = path.join(SAVE_DIR, `${saveFileName}.json`);
    
    // Check if file exists
    try {
      fs.accessSync(saveFilePath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Save file not found: ${saveFileName}.json`);
      }
      throw error;
    }
    
    const saveDataRaw = fs.readFileSync(saveFilePath, 'utf8');
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
    
    return gameState;
  } catch (error) {
    console.error('Error loading game:', error);
    throw error;
  }
}

/**
 * List all available save files
 * @returns {Array<Object>} Array of save file info objects
 */
function listSaveFiles() {
  try {
    ensureSaveDirectory();
    
    const files = fs.readdirSync(SAVE_DIR);
    const saveFiles = files.filter(file => file.endsWith('.json'));
    
    const saveFileInfo = [];
    
    for (const file of saveFiles) {
      try {
        const filePath = path.join(SAVE_DIR, file);
        const stats = fs.statSync(filePath);
        const saveDataRaw = fs.readFileSync(filePath, 'utf8');
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
 */
function deleteSaveFile(saveFileName) {
  try {
    const saveFilePath = path.join(SAVE_DIR, `${saveFileName}.json`);
    
    // Check if file exists
    try {
      fs.accessSync(saveFilePath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Save file not found: ${saveFileName}.json`);
      }
      throw error;
    }
    
    fs.unlinkSync(saveFilePath);
  } catch (error) {
    throw error;
  }
}

/**
 * Check if a save file exists
 * @param {string} saveFileName - Name of the save file (without extension)
 * @returns {boolean} True if the file exists, false otherwise
 */
function savefileExists(saveFileName) {
  const saveFilePath = path.join(SAVE_DIR, `${saveFileName}.json`);
  return fs.existsSync(saveFilePath);
}

module.exports = {
  saveGame,
  loadGame,
  listSaveFiles,
  deleteSaveFile,
  savefileExists
};
