// Import required modules and dependencies
const express = require('express');
const router = express.Router();
const { Terrain } = require('./mapclass.js');
const { Dungeon } = require('./dungeon.js');

router.post('/', (req, res) => {
  // Retrieve the necessary session variables
  let floor = req.session.currentFloor;
  let terrain = req.session.terrain[floor];
  let decals = req.session.decals[floor];
  let creatures = req.session.creatures[floor];
  let items = req.session.items[floor];
  let explored = req.session.explored[floor];
  let visible = req.session.visible[floor];

  const boardSize = { x: 60, y: 60 };
  const dungeonSpace = new Terrain(boardSize, terrain);
  let dungeon = new Dungeon(dungeonSpace, creatures, items, explored, decals, visible);

  // Save the session to persist the changes
  req.session.save((err) => {
    if (err) {
      console.error('Error saving session:', err);
      // Handle the error
    } else {
      // Return the response with the necessary data
		res.json(dungeon.getMinimap());
    }
  });
});

module.exports = router;