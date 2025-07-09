// Import required modules and dependencies
const express = require('express');
const router = express.Router();
const { Terrain, DungeonSpace } = require('./mapclass.js');
const { Dungeon } = require('./dungeon.js');
const fs = require('fs');
const { saveGame, loadGame, savefileExists } = require('./savefile.js');

function buildRandomPath(toFill, sectorSpace) {
  let step = 0;
  let path = [Math.floor(Math.random() * (sectorSpace.boardsize.x * sectorSpace.boardsize.y))];
  let sectorsFilled = 1;

  while (sectorsFilled < toFill) {
    const adjacent = sectorSpace.getNearIndices(path[step], 1);
    const nextStep = adjacent[Math.floor(Math.random() * adjacent.length)];
    if (!path.includes(nextStep)) {
      sectorsFilled++;
    }
    step++;
    path.push(nextStep);
  }

  return path;
}

function carveCorridor(start, end, dungeon) {
  // Move along the long axis to midpoint, then along the short axis, then long axis to endpoint
  let axis, direction;
  if (Math.abs(start.x - end.x) < Math.abs(start.y - end.y)) {
    axis = { long: 'y', short: 'x' };
  } else {
    axis = { long: 'x', short: 'y' };
  }
  direction = {
    x: Math.min(1, Math.max(-1, end.x - start.x)),
    y: Math.min(1, Math.max(-1, end.y - start.y))
  };
  const midpoint = Math.ceil((start[axis.long] + end[axis.long]) / 2) - start[axis.long];

  for (let i = 0; i < Math.abs(midpoint); i++) {
    const thistile = {
      [axis.long]: start[axis.long] + i * direction[axis.long],
      [axis.short]: start[axis.short]
    };
    dungeon.setTile(dungeon.getIndex(thistile), 'floor');
  }

  for (let i = 0; i < Math.abs(start[axis.short] - end[axis.short]); i++) {
    const thistile = {
      [axis.long]: start[axis.long] + midpoint,
      [axis.short]: start[axis.short] + i * direction[axis.short]
    };
    dungeon.setTile(dungeon.getIndex(thistile), 'floor');
  }

  for (let i = 0; i < Math.abs(start[axis.long] - end[axis.long]) - Math.abs(midpoint); i++) {
    const thistile = {
      [axis.long]: start[axis.long] + midpoint + i * direction[axis.long],
      [axis.short]: end[axis.short]
    };
    dungeon.setTile(dungeon.getIndex(thistile), 'floor');
  }

  return dungeon;
}

function connectSectors(sectorIndexPair, sectorspace, dungeon) {
  const sectorsize = {
    x: dungeon.boardsize.x / sectorspace.boardsize.x,
    y: dungeon.boardsize.y / sectorspace.boardsize.y
  };

  const sectorposition = {
    from: sectorspace.getCartesian(sectorIndexPair.from),
    to: sectorspace.getCartesian(sectorIndexPair.to)
  };

  const sectoroffset = {
    from: {
      x: sectorsize.x * sectorposition.from.x,
      y: sectorsize.y * sectorposition.from.y
    },
    to: {
      x: sectorsize.x * sectorposition.to.x,
      y: sectorsize.y * sectorposition.to.y
    }
  };

  const sectormiddle = {
    from: {
      x: sectoroffset.from.x + Math.floor(sectorsize.x / 2),
      y: sectoroffset.from.y + Math.floor(sectorsize.y / 2)
    },
    to: {
      x: sectoroffset.to.x + Math.floor(sectorsize.x / 2),
      y: sectoroffset.to.y + Math.floor(sectorsize.y / 2)
    }
  };

  const from = {
    x: sectormiddle.from.x + Math.floor(Math.random() * 5) - 3,
    y: sectormiddle.from.y + Math.floor(Math.random() * 5) - 3
  };

  const to = {
    x: sectormiddle.to.x + Math.floor(Math.random() * 5) - 3,
    y: sectormiddle.to.y + Math.floor(Math.random() * 5) - 3
  };

  dungeon = carveCorridor(from, to, dungeon);

  return dungeon;
}

function populateRoom(size, centre, dungeon, floor) {
  const creatureset = chooseCreatureSet(floor);
  const monsterlist = makeMonsterList(creatureset, floor);
  const lowcorner = {
    x: centre.x - Math.ceil(size.x / 2),
    y: centre.y - Math.ceil(size.y / 2)
  };
  var position;

  for (const type in monsterlist) {
    const amount = monsterlist[type];
    if (amount > 0) {
      for (let i = 0; i < amount; i++) {
        let picked = false;
        while (!picked) {
          const creaturepos = {
            x: getRandomInt(lowcorner.x + 1, lowcorner.x + size.x - 1),
            y: getRandomInt(lowcorner.y + 1, lowcorner.y + size.y - 1)
          };
          position = dungeon.getIndex(creaturepos);
          if (
            dungeon.getTile(position) !== "wall" &&
            !dungeon.checkOccupancy(position)
          ) {
            picked = true;
          }
        }
        dungeon.addCreature(creatureset, type, position);
      }
    }
  }

  for (let i = 0; i < 3; i++) {
    const rn = getRandomInt(1, 5);
    if (rn === 5) {
      let picked = false;
      while (!picked) {
        const itempos = {
          x: getRandomInt(lowcorner.x + 1, lowcorner.x + size.x - 1),
          y: getRandomInt(lowcorner.y + 1, lowcorner.y + size.y - 1)
        };
        const position = dungeon.getIndex(itempos);
        if (
          dungeon.getTile(position) !== "wall" &&
          !dungeon.checkOccupancy(position)
        ) {
          picked = true;
        }
      }
      const iteminfo = chooseItem(floor);
      dungeon.addItem(iteminfo.itemclass, iteminfo.name, position);
    }
  }

  return dungeon;
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomElements(arr, count) {
  const shuffled = arr.slice();
  let currentIndex = shuffled.length;
  let temporaryValue, randomIndex;

  // While there remain elements to shuffle
  while (currentIndex !== 0) {
    // Pick a remaining element
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // Swap it with the current element
    temporaryValue = shuffled[currentIndex];
    shuffled[currentIndex] = shuffled[randomIndex];
    shuffled[randomIndex] = temporaryValue;
  }

  // Return the first 'count' elements
  return shuffled.slice(0, count);
}

function chooseCreatureSet(floor) {
  const weights = {
    animal: 60 + floor * 5,
    goblinoid: 50 + floor * 10,
    undead: (floor + Math.abs(floor - 2) - 2) * 10,
    demonic: (floor + Math.abs(floor - 3) - 3) * 10
  };

  if (floor > 7) {
    weights.animal = 0;
  }

  let cweight = 0;
  let chosen = false;
  let creatureset;

  for (const set in weights) {
    cweight += weights[set];
  }

  const rn = getRandomInt(1, cweight);
  cweight = 0;

  for (const set in weights) {
    cweight += weights[set];
    if (!chosen && rn <= cweight) {
      creatureset = set;
      chosen = true;
    }
  }

  return creatureset;
}

function makeMonsterList(creatureset, floor) {
  const creatureData = JSON.parse(fs.readFileSync('./creatures.json','utf-8'));
  const list = creatureData.filter(entry => entry.creatureset === creatureset);
  
  let cweight = 0;
  let weights = {};

  list.forEach((entry, entryno) => {
    if (Math.abs(floor - entry.level) < 3) {
      weights[entryno] = parseInt(1000 / Math.pow(Math.abs(floor - entry.level) + 1, 2));
    } else {
      weights[entryno] = 1;
    }
    list[entryno].level = 0;
    cweight += weights[entryno];
  });

  const roompopulation = getRandomInt(floor * 4, floor * 6);
  let choice = -1;
  let placed = 0;

  while (roompopulation > placed) {
    const rn = getRandomInt(1, cweight);
    cweight = 0;

    if (creatureset !== "animal") {
      choice = -1;
    }

    list.forEach((entry, entryno) => {
      cweight += weights[entryno];
      if (choice < 0 && rn <= cweight) {
        choice = entryno;
      }
    });

    list[choice].level++;
    placed += list[choice].level;
  }

  let updatedList = {};

  list.forEach((entry, entryno) => {
    if (entry.level > 0) {
      updatedList[entry.creaturetype] = entry.level;
    }
  });

  return updatedList;
}

function chooseItem(floor) {
  const weights = {
    potion: 4,
    ring: 2,
    weapon: 3,
    armour: 3,
    shield: 2,
    helmet: 1,
  };

  let cweight = 0;
  let chosen = false;

  for (const set in weights) {
    cweight += weights[set];
  }

  const rn = getRandomInt(1, cweight);
  cweight = 0;

  let final = { itemclass: null };

  for (const set in weights) {
    cweight += weights[set];
    if (!chosen && rn <= cweight) {
      final.itemclass = set;
      chosen = true;
    }
  }

	const itemList = JSON.parse(fs.readFileSync('./items.json','utf-8'));

	let list = [];

	try {
	  list = itemList.filter(item => item.class === final.itemclass);
	} catch (error) {
	  console.log("itemclass not found");
	}

  const updatedWeights = {};

  list.forEach((entry, entryno) => {
    updatedWeights[entryno] = parseInt(1000 / Math.pow(Math.max(entry.rarity - floor, 1), 2));
    cweight += updatedWeights[entryno];
  });

  let choice = -1;
  const rn2 = getRandomInt(1, cweight);
  cweight = 0;

  list.forEach((entry, entryno) => {
    cweight += updatedWeights[entryno];
    if (choice < 0 && rn2 <= cweight) {
      final.name = entry.name;
      choice++;
    }
  });

  return final;
}

function carveRectangle(size, centre, dungeon) {
  const lowcorner = {
    x: centre.x - Math.ceil(size.x / 2),
    y: centre.y - Math.ceil(size.y / 2),
  };

  for (let i = 0; i < size.x; i++) {
    for (let j = 0; j < size.y; j++) {
      const tilepos = {
        x: lowcorner.x + i,
        y: lowcorner.y + j,
      };
      const tileindex = dungeon.getIndex(tilepos);
      dungeon.setTile(tileindex, "floor");
    }
  }

  return dungeon;
}

function carveSector(sectorindex, sectorspace, dungeon, floor, args) {
  const sectorsize = {
    x: dungeon.boardsize.x / sectorspace.boardsize.x,
    y: dungeon.boardsize.y / sectorspace.boardsize.y,
  };

  const sectorposition = sectorspace.getCartesian(sectorindex);
  const sectoroffset = {
    x: sectorsize.x * sectorposition.x,
    y: sectorsize.y * sectorposition.y,
  };
  const sectormiddle = {
    x: sectoroffset.x + Math.floor(sectorsize.x / 2),
    y: sectoroffset.y + Math.floor(sectorsize.y / 2),
  };

  const roomsize = {
    x: getRandomInt(6, 10),
    y: getRandomInt(6, 10),
  };

  const roomcentre = {
    x: sectormiddle.x,
    y: sectormiddle.y,
  };

  dungeon = carveRectangle(roomsize, roomcentre, dungeon);

  if (dungeon.creatures[0]) {
    dungeon = populateRoom(roomsize, roomcentre, dungeon, floor);
  }

  if (args && args === "final") {
    const lowcorner = {
      x: roomcentre.x - Math.ceil(roomsize.x / 2),
      y: roomcentre.y - Math.ceil(roomsize.y / 2),
    };
    const stairpos = {
      x: getRandomInt(lowcorner.x + 1, lowcorner.x + roomsize.x - 1),
      y: getRandomInt(lowcorner.y + 1, lowcorner.y + roomsize.y - 1),
    };
  }

  return dungeon;
}

function makeDecals(dungeon) {
  const candidates = getRandomElements(Object.keys(dungeon.terrain), 210);
  const decals = {};
  candidates.forEach(candidate => {
    if (parseInt(dungeon.terrain[candidate]) === 1) {
      const decal = getRandomInt(1, 9);
      decals[candidate] = decal;
    }
  });
  return decals;
}

function makeLevel(dungeon, floor) {
  const sectorsize = 15;
  const tofill = 4 + 2 * Math.min(floor, 3);
  const sectorspace = {
    x: dungeon.boardsize.x / sectorsize,
    y: dungeon.boardsize.y / sectorsize
  };
  const sectormap = new DungeonSpace(sectorspace);
  const path = buildRandomPath(tofill, sectormap);
  let args = "none";

  dungeon = carveSector(path[0], sectormap, dungeon, floor, args);
  dungeon.addPlayer("Gwilim", "male", 0);

  const carved = [path[0]];

  for (let i = 1; i < path.length; i++) {
    args = "none";
    if (i === path.length - 1) {
      args = "final";
    }
    const sectorindexpair = {
      from: path[i - 1],
      to: path[i]
    };

    dungeon = connectSectors(sectorindexpair, sectormap, dungeon);

    if (!carved.includes(path[i])) {
      dungeon = carveSector(path[i], sectormap, dungeon, floor);
      carved.push(path[i]);
    }
  }

  if (floor > 1) {
    dungeon.setTile(dungeon.creatures[0].position, "upstair");
  }

  // Treat items
  for (const key in dungeon.items) {
	if (Array.isArray(dungeon.items[key])) {
      dungeon.items[key].forEach(thisitem => {
        const quality = thisitem.setQuality();
        let enchant = false;
        if (!quality) {
          enchant = thisitem.setEnchant(floor);
        }
        if (enchant) {
          thisitem.setBrand();
        }
      });
    }
  }

  dungeon.setTile(dungeon.pickEmpty(dungeon.terrain), "downstair");
  dungeon.decals = makeDecals(dungeon);
  dungeon.explored = [];
  dungeon.addExploration();
  return dungeon;
}

function initGameState() {
  return {
    globals: {
      automove: false,
      animations: [],
      eventLog: [],
      mapRefresh: true
    },
    terrain: [],
    decals: [],
    creatures: [],
    items: [],
    explored: [],
    visible: []
  };
}

function makeLevels(gameState) {
  let dungeon;
  for (let floor = 9; floor > 0; floor--) {
    dungeon = new Dungeon();
    dungeon = makeLevel(dungeon, floor);

    gameState.terrain[floor] = dungeon.terrain;
    gameState.decals[floor] = dungeon.decals;
    gameState.creatures[floor] = dungeon.creatures;
    gameState.items[floor] = dungeon.items;
    gameState.explored[floor] = dungeon.explored;
    gameState.visible[floor] = dungeon.visible;
  }
  gameState.currentFloor = 1;
  return { gameState, dungeon };
}

router.post('/', (req, res) => {
  const boardSize = { x: 60, y: 60 };
  let dungeon;
  let gameState = {};

  if (savefileExists('Player')) {
    gameState = loadGame(req.sessionID);
    gameState.globals = {
      automove:false,
      animations:[],
      eventLog:[],
      mapRefresh:true
    };

    const dungeonSpace = new Terrain(boardSize, gameState.terrain[gameState.currentFloor]);
    dungeon = new Dungeon(dungeonSpace, gameState.creatures[gameState.currentFloor], gameState.items[gameState.currentFloor], gameState.explored[gameState.currentFloor], gameState.decals[gameState.currentFloor]);

    if (dungeon.creatures[0].hp > 0) {
      // No action needed if the player is alive
    } else {
      ({ gameState, dungeon } = makeLevels(gameState));
    }
  } else {
    gameState = initGameState();
    ({ gameState, dungeon } = makeLevels(gameState));
  }
  
  // Save game state to file using session ID as filename
  try {
    saveGame('Player', gameState);
  } catch (err) {
    console.error('Error saving game state:', err);
  }
  let outputs = dungeon.getOutputs(gameState.globals);
  outputs.mapRefresh = gameState.globals.mapRefresh;
  res.json(outputs);
});

module.exports = router;
