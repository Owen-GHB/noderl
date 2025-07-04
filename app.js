const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const playMoveRouter = require('./playmove');
const levelGenRouter = require('./levelgen');
const getImageRouter = require('./getimage');
const minimapRouter = require('./minimap');
const creatures = require('./creatures.json');
const items = require('./items.json');

// Set the views folder
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Configure the session middleware
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true
}));

// Parse JSON bodies
app.use(bodyParser.json());

// Parse URL-encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));

// Use the playmove router for the /playmove API endpoint
app.use('/playmove', playMoveRouter);

// Use the levelgen router for the /levelgen API endpoint
app.use('/levelgen', levelGenRouter);

// Use the getimage router for the /getimage API endpoint
app.use('/getimage', getImageRouter);

// Use the minimap router for the /minimap API endpoint
app.use('/minimap', minimapRouter);

// Serve static files from the /static directory
app.use('/', express.static(__dirname + '/static'));

app.get('/', (req, res) => {
  // Render the index.ejs template and pass creaturesData and objectsData as variables
  res.render('index', { creatures, items });
});

// Define other routes and logic as needed

// Start the Express server
app.listen(8000, () => {
  console.log('Express server is running on port 8000');
});