const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const apiRouter = require('./http-api');

// Parse JSON bodies
app.use(bodyParser.json());

// Parse URL-encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));

// Use the API router for all API endpoints
app.use('/api', apiRouter);

// Serve static files from the /static directory
app.use('/', express.static(__dirname + '/static'));

// Start the Express server
app.listen(8000, () => {
  console.log('Express server is running on port 8000');
});
