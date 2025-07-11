const express = require('express');
const router = express.Router();
const {
  processJSONInput
} = require('./playmove.js');

router.all('/', async (req, res) => {
  try {
    const jsonString =
      req.method === 'POST' ? req.body?.json :
      req.method === 'GET' ? req.query?.json : undefined;

    if (typeof jsonString === 'undefined') {
      return res.status(400).json({ error: "Missing 'json' parameter" });
    }
    const result = processJSONInput(jsonString);

    if (result.error) {
      return res.status(400).json({
        error: result.error,
        ...(result.details && { details: result.details })
      });
    }

    if (result.buffer) {
      res.writeHead(200, {
        'Content-Type': result.contentType,
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
