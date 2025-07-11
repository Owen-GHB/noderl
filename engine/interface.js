const { processWithSavefile, returnMinimap, startFromSavefile } = require('./commands.js');

function processCommand(command, modifier, filename) {
  try {
    switch (command) {
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

module.exports = {
  processCommand
};