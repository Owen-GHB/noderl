const express = require('express');
const router = express.Router();
const { processWithSavefile, returnMinimap, getImageBuffer, startFromSavefile } = require('./playmove.js');

router.all('/api', async (req, res) => {
  try {
    let data, command, modifier, filename, outputs;

    // Extract and parse JSON input
    if (req.method === 'POST') {
      if (typeof req.body?.json !== 'undefined') {
        data = JSON.parse(req.body.json);
      } else {
        return res.status(400).json({ error: "Missing 'json' in POST body" });
      }
    } else if (req.method === 'GET') {
      if (typeof req.query?.json !== 'undefined') {
        data = JSON.parse(req.query.json);
      } else {
        return res.status(400).json({ error: "Missing 'json' in query string" });
      }
    } else {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    // Extract command and modifier
    ({ command, modifier } = data);
    if (typeof command === 'undefined') {
      return res.status(400).json({ error: "Missing 'command' in request data" });
    }

    // Handle each command
    switch (command) {
      case 'image':
        if (req.method !== 'GET') {
          return res.status(405).json({ error: "Image command only supports GET requests" });
        }
        try {
          const buffer = await getImageBuffer(modifier);
          res.writeHead(200, {
            'Content-Type': 'image/png',
            'Content-Length': buffer.length
          });
          res.end(buffer);
        } catch (err) {
          console.error("Image generation error:", err);
          return res.status(400).json({ error: "Failed to generate image", details: err.message });
        }
        break;

      case 'info':
        filename = 'Player';
        if (modifier === 'minimap') {
          const minimap = returnMinimap(filename);
          res.json(minimap);
        } else {
          return res.status(400).json({ error: `Invalid modifier for 'info' command: ${modifier}` });
        }
        break;

      case 'start':
        try {
          outputs = startFromSavefile(modifier);
          res.json(outputs);
        } catch (err) {
          console.error("Start error:", err);
          return res.status(400).json({ error: "Failed to start from savefile", details: err.message });
        }
        break;

      default:
        if (typeof modifier === 'undefined') {
          return res.status(400).json({ error: `Missing 'modifier' for command: ${command}` });
        }
        try {
          filename = 'Player';
          const { gameState, dungeon } = processWithSavefile(command, modifier, filename);
          outputs = dungeon.getOutputs(gameState.globals);
          outputs.mapRefresh = gameState.globals.mapRefresh;
          res.json(outputs);
        } catch (err) {
          console.error("Command processing error:", err);
          return res.status(400).json({ error: `Failed to process command '${command}'`, details: err.message });
        }
        break;
    }
  } catch (err) {
    console.error("Unhandled API error:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

module.exports = router;
