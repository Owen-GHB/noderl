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
      // Fallback for non-JSON requests or direct calls if any
      ({ command, modifier } = req.body);
      data = { command, modifier };
    }
  } else if (req.method === 'GET') {
    if (req.query.json) {
      data = JSON.parse(req.query.json);
    } else {
      // Fallback for non-JSON requests or direct calls if any
      ({ command, modifier } = req.query);
      data = { command, modifier };
    }
  } else {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  ({ command, modifier } = data);

  if (typeof command === 'undefined') {
    return res.status(400).json({ error: "Command not provided" });
  }

  // If modifier is a string that looks like JSON, parse it.
  if (typeof modifier === 'string') {
    try {
      // Attempt to parse modifier if it's a JSON string
      // This handles cases where modifier was an object stringified on the client
      const parsedModifier = JSON.parse(modifier);
      // Check if it was actually JSON (e.g. starts with { or [)
      // and not just a simple string like "Player" or "minimap"
      if (modifier.trim().startsWith('{') || modifier.trim().startsWith('[')) {
        modifier = parsedModifier;
      }
    } catch (e) {
      // Modifier is not a JSON string, keep it as is
    }
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
