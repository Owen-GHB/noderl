const { URL } = require('url');
const { processJSONInput } = require('./json-api.js');

async function handleApiRequest(req, res) {
  try {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    let jsonString;

    if (req.method === 'GET') {
      jsonString = parsedUrl.searchParams.get('json');
      return respond(jsonString, res);
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const contentType = req.headers['content-type'] || '';
          if (contentType.includes('application/x-www-form-urlencoded')) {
            const params = new URLSearchParams(body);
            jsonString = params.get('json');
          } else if (contentType.includes('application/json')) {
            const json = JSON.parse(body);
            jsonString = json?.json;
          }

          respond(jsonString, res);
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid POST body', details: err.message }));
        }
      });
      return;
    }

    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
  } catch (err) {
    console.error("Unhandled API error:", err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: "Internal server error", details: err.message }));
  }
}

function respond(jsonString, res) {
  if (typeof jsonString === 'undefined') {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: "Missing 'json' parameter" }));
    return;
  }

  const result = processJSONInput(jsonString);

  if (result.error) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: result.error,
      ...(result.details && { details: result.details })
    }));
    return;
  }

  if (result.buffer) {
    res.writeHead(200, {
      'Content-Type': result.contentType,
      'Content-Length': result.buffer.length
    });
    res.end(result.buffer);
    return;
  }

  if (result.json) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result.json));
    return;
  }

  res.writeHead(500, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: "Unknown result from command handler" }));
}

module.exports = handleApiRequest;
