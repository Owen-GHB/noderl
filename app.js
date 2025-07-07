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
const { Player } = require('./player.js'); // Added for Player object creation
const { loadGame, applyGameStateToSession, listSaveFiles, saveGame, deleteSaveFile, extractGameStateFromSession } = require('./savefile.js'); // Added listSaveFiles, saveGame, deleteSaveFile

// Set the views folder
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Configure the session middleware
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true
}));

// Middleware to load game state from file if it exists
app.use(async (req, res, next) => {
  if (req.session && !req.session.currentFloor) { // Only try to load if session doesn't already have game state
    let playernameToLoad = null; // Changed variable name
    if (req.session.playername) { // Changed characterName to playername
      playernameToLoad = req.session.playername; // Changed characterName to playername
    }
    // No fallback to sessionID for auto-loading; a playername is required.

    if (playernameToLoad) {
      try {
        const gameState = await loadGame(playernameToLoad); // Used playernameToLoad
        applyGameStateToSession(req.session, gameState);
        // Ensure player object from loaded game is correctly instantiated
        if (gameState.creatures && gameState.creatures[0] && gameState.creatures[0].creaturetype === 'player') {
            const playerData = gameState.creatures[0];
            // Create a new Player instance from the loaded data
            // Using playerData.playername for the constructor
            const player = new Player(playerData.position, playerData.playername, playerData.gender, playerData.hairstyle);
            // Overwrite properties from saved data
            for (const key in playerData) {
                if (player.hasOwnProperty(key) || Object.getPrototypeOf(player).hasOwnProperty(key)) {
                    player[key] = playerData[key];
                }
            }
            req.session.creatures[0] = player; // Replace placeholder with full Player object
        }
        console.log(`Loaded game state for character: ${playernameToLoad}`); // Used playernameToLoad
      } catch (error) {
        if (!error.message.includes('Save file not found')) {
          console.warn(`Failed to load game state for character ${playernameToLoad}:`, error.message); // Used playernameToLoad
        }
      }
    }
  }
  next();
});

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
  // If a game is in progress, render the game view
  if (req.session && req.session.currentFloor) {
    res.render('index', { creatures, items });
  } else {
    // Otherwise, show the main menu (which will be updated in index.ejs)
    res.render('menu', { /* any data needed for menu */ });
  }
});

// Route to show the new game form or handle new game creation
app.get('/new-game', (req, res) => {
  res.render('new_game_form'); // We'll need to create this EJS template
});

app.post('/start-new-game', async (req, res) => {
  const { playername, gender, hairstyle } = req.body; // Changed characterName to playername
  if (!playername || playername.trim() === "") { // Changed characterName to playername
    return res.status(400).send("Character name is required.");
  }
  // Basic validation for filename characters (simplified)
  if (!/^[a-zA-Z0-9_\-]+$/.test(playername)) { // Changed characterName to playername
      return res.status(400).send("Character name contains invalid characters.");
  }

  // Initialize a new game session
  // This part needs to be similar to what /levelgen does for a new game,
  // but specifically for creating a brand new player and first level.
  // For now, let's assume a function initializeNewGameSession exists or will be created.

  // Placeholder for new game initialization logic:
  req.session.currentFloor = 0;
  req.session.terrain = { 0: {} }; // Initial empty terrain for floor 0
  req.session.decals = { 0: {} };
  req.session.creatures = { 0: [] };
  req.session.items = { 0: {} };
  req.session.explored = { 0: [] };
  req.session.visible = { 0: [] };

  // Create player
  // The initial position might need to be determined by level generation logic
  const initialPosition = 0; // Placeholder, this needs to be a valid starting tile index
  const player = new Player(initialPosition, playername, gender || 'female', hairstyle || 'hair1'); // Used playername
  req.session.creatures[0][0] = player; // Player is typically creature 0 on floor 0
  req.session.playername = playername; // Changed characterName to playername

  // IMPORTANT: The actual level generation (first level) should happen here or be triggered.
  // For now, we're just setting up basic session structure.
  // A full implementation would call parts of levelgen.js or similar logic.

  try {
    // Save the initial game state
    const gameState = extractGameStateFromSession(req.session);
    await saveGame(playername, gameState); // Used playername
    console.log(`New game started and saved for character: ${playername}`); // Used playername
    res.redirect('/'); // Redirect to the main game page
  } catch (error) {
    console.error('Error starting or saving new game:', error);
    res.status(500).send("Error starting new game.");
  }
});

app.get('/list-saves', async (req, res) => {
  try {
    const saveFiles = await listSaveFiles();
    res.render('list_saves', { saveFiles }); // We'll need to create this EJS template
  } catch (error) {
    console.error('Error listing save files:', error);
    res.status(500).send("Error listing save files.");
  }
});

app.get('/load-game/:playername', async (req, res) => { // Changed route parameter
  const { playername } = req.params; // Changed characterName to playername
  try {
    const gameState = await loadGame(playername); // Used playername
    applyGameStateToSession(req.session, gameState);
    // Ensure player object from loaded game is correctly instantiated
    if (gameState.creatures && gameState.creatures[0] && gameState.creatures[0].creaturetype === 'player') {
        const playerData = gameState.creatures[0];
        // Using playerData.playername for the constructor
        const player = new Player(playerData.position, playerData.playername, playerData.gender, playerData.hairstyle);
        for (const key in playerData) {
            if (player.hasOwnProperty(key) || Object.getPrototypeOf(player).hasOwnProperty(key)) {
                player[key] = playerData[key];
            }
        }
        req.session.creatures[0] = player;
    }
    req.session.playername = playername; // Store playername in session
    console.log(`Game loaded for character: ${playername}`); // Used playername
    res.redirect('/'); // Redirect to the main game page
  } catch (error) {
    console.error(`Error loading game for ${playername}:`, error); // Used playername
    if (error.message.includes('Save file not found')) {
      res.status(404).send(`Save file for character ${playername} not found.`); // Used playername
    } else {
      res.status(500).send(`Error loading game for ${playername}.`); // Used playername
    }
  }
});

// Placeholder for game over logic that will delete the save file
// This will need to be integrated into the actual game over sequence in playmove.js or similar
// For now, adding a simple route to test deletion.
app.post('/game-over-delete-save', async (req, res) => {
    if (req.session && req.session.playername) { // Changed characterName to playername
        try {
            await deleteSaveFile(req.session.playername); // Used playername
            console.log(`Save file for ${req.session.playername} deleted due to game over.`); // Used playername
            // Destroy session or clear game-related parts
            req.session.destroy();
            res.status(200).send(`Save file for ${req.session.playername} deleted.`); // Used playername
        } catch (error) {
            console.error(`Error deleting save file for ${req.session.playername}:`, error); // Used playername
            res.status(500).send("Error deleting save file.");
        }
    } else {
        res.status(400).send("No active character to delete save file for.");
    }
});


// Define other routes and logic as needed

// Start the Express server
app.listen(8000, () => {
  console.log('Express server is running on port 8000');
});
