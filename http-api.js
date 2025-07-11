const express = require('express');
const router = express.Router();
const {
  processWithSavefile,
  returnMinimap,
  getImageBuffer,
  startFromSavefile
} = require('./playmove.js');

async function handleApiCommand(jsonString, method) {
  let data;

  try {
    data = JSON.parse(jsonString);
  } catch (err) {
    return { error: "Invalid JSON format", status: 400 };
  }

  const { command, modifier } = data;

  if (!command) {
    return { error: "Missing 'command' in request data", status: 400 };
  }

  const filename = 'Player';

  try {
    switch (command) {
      case 'image':
        if (method !== 'GET') {
          return { error: "Image command only supports GET requests", status: 405 };
        }
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

router.all('/api', async (req, res) => {
  try {
    const jsonString =
      req.method === 'POST' ? req.body?.json :
      req.method === 'GET' ? req.query?.json : undefined;

    if (typeof jsonString === 'undefined') {
      return res.status(400).json({ error: "Missing 'json' parameter" });
    }

    const result = await handleApiCommand(jsonString, req.method);

    if (result.error) {
      return res.status(result.status || 400).json({
        error: result.error,
        ...(result.details && { details: result.details })
      });
    }

    if (result.buffer) {
      res.writeHead(200, {
        'Content-Type': result.contentType || 'application/octet-stream',
        'Content-Length': result.buffer.length
      });
      return res.end(result.buffer);
    }

    if (result.json) {
      return res.json(result.json);
    }

    return res.status(500).json({ error: "Unknown result from command handler" });
  } catch (err) {
    console.error("Unhandled API error:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

module.exports = router;
