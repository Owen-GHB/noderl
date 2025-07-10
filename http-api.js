// Import required modules and dependencies
// Import required modules and dependencies
const express = require('express');
const router = express.Router();
const { processWithSavefile, returnMinimap, getImageBuffer, startFromSavefile } = require('./playmove.js');

// Unified API endpoint
router.all('/api', async (req, res) => {
  let command, modifier, filename, outputs;

  if (req.method === 'POST') {
    ({ command, modifier } = req.body);
  } else if (req.method === 'GET') {
    ({ command, modifier } = req.query);
  } else {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  if (typeof command === 'undefined') {
    return res.status(400).json({ error: "Command not provided" });
  }

  switch (command) {
    case 'info':
      filename = 'Player';
      if (modifier === 'minimap') {
        let minimap = returnMinimap(filename)
        res.json(minimap);
      } else {
        throw new Error(`bad modifier for command info: ${modifier}`);
      }
      break;
    case 'start':
      outputs = startFromSavefile(modifier);
      res.json(outputs);
      break;

    case 'image':
      if (req.method !== 'GET') {
        return res.status(405).json({ error: "Image command only supports GET requests" });
      }
      const buffer = await getImageBuffer(modifier);
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': buffer.length
      });
      res.end(buffer);
      break;

    default: 
      if (typeof modifier === 'undefined') {
        return res.status(400).json({ error: "Modifier not provided" });
      }
      modifier = modifier.replace(/\\/g, '');
      filename = 'Player';
      let {gameState, dungeon} = processWithSavefile(command, modifier, filename);
      outputs = dungeon.getOutputs(gameState.globals);
      outputs.mapRefresh = gameState.globals.mapRefresh;
      res.json(outputs);
      break;
  }
});

module.exports = router;
