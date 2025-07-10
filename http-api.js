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
  let originalModifierString = typeof data.modifier === 'string' ? data.modifier : null;

  if (typeof command === 'undefined') {
    return res.status(400).json({ error: "Command not provided" });
  }

  // Special handling for 'image' command: it expects modifier to be a JSON string.
  if (command === 'image') {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: "Image command only supports GET requests" });
    }
    // Ensure originalModifierString is used if available, otherwise assume modifier is already correct.
    const modifierForImage = originalModifierString !== null ? originalModifierString : modifier;
    if (typeof modifierForImage !== 'string' || !(modifierForImage.trim().startsWith('{') || modifierForImage.trim().startsWith('['))) {
        return res.status(400).json({ error: `Invalid modifier format for image command. Expected a JSON string, got: ${modifierForImage}` });
    }
    try {
      const buffer = await getImageBuffer(modifierForImage);
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': buffer.length
      });
      res.end(buffer);
    } catch (e) {
      console.error("Error in image command processing:", e);
      res.status(500).json({ error: "Failed to process image request", details: e.message });
    }
    return; // End processing for image command here
  }

  // Generic modifier parsing for other commands
  if (typeof modifier === 'string') {
    try {
      const parsedModifier = JSON.parse(modifier);
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

    // 'image' command is handled above
    // default case remains for other commands

    default: 
      if (typeof modifier === 'undefined') {
        return res.status(400).json({ error: "Modifier not provided" });
      }
      // The modifier.replace(/\\/g, '') might be problematic if modifier is an object.
      // This was likely for older string-based modifiers and might need re-evaluation.
      // For now, only apply if modifier is a string.
      if (typeof modifier === 'string') {
        modifier = modifier.replace(/\\/g, '');
      }
      filename = 'Player';
      let {gameState, dungeon} = processWithSavefile(command, modifier, filename);
      outputs = dungeon.getOutputs(gameState.globals);
      outputs.mapRefresh = gameState.globals.mapRefresh;
      res.json(outputs);
      break;
  }
});

module.exports = router;
