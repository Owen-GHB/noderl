// Import required modules and dependencies
// Import required modules and dependencies
const express = require('express');
const router = express.Router();
const { processWithSavefile, returnMinimap, getImageBuffer, startFromSavefile } = require('./playmove.js');

// Unified API endpoint
router.all('/api', async (req, res) => {
  let command, modifier, filename, outputs, data;

  if (req.method === 'POST') {
    if (req.body.json) {
      data = JSON.parse(req.body.json);
    } else {
      return res.status(400).json({ error: "JSON data not provided in POST request" });
    }
  } else if (req.method === 'GET') {
    if (req.query.json) {
      data = JSON.parse(req.query.json);
    } else {
      return res.status(400).json({ error: "JSON data not provided in GET request" });
    }
  } else {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  ({ command, modifier } = data);

  if (typeof command === 'undefined') {
    return res.status(400).json({ error: "Command not provided in JSON data" });
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
