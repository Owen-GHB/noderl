class DungeonSpace {
  constructor(boardsize) {
    if (boardsize) {
      this.boardsize = boardsize;
    } else {
      this.boardsize = {
        x: 75,
        y: 75,
        z: 5
      };
    }
  }

  getx(tileindex) {
    const cartesianx = tileindex % this.boardsize.x;
    return cartesianx;
  }

  gety(tileindex) {
    const cartesiany = Math.floor(tileindex / this.boardsize.y);
    return cartesiany;
  }

  getCartesian(tileindex) {
    const cartesian = {
      x: this.getx(tileindex),
      y: this.gety(tileindex)
    };
    return cartesian;
  }

  getIndex(cartesian) {
    const tileindex = cartesian.x + cartesian.y * this.boardsize.x;
    return tileindex;
  }

  checkborder(tileindex) {
    const tilepos = this.getCartesian(tileindex);
    const borders = {};
    switch (tilepos.x) {
      case 0:
        borders.x = "low";
        break;
      case this.boardsize.x - 1:
        borders.x = "high";
        break;
      default:
        borders.x = "none";
    }
    switch (tilepos.y) {
      case 0:
        borders.y = "low";
        break;
      case this.boardsize.y - 1:
        borders.y = "high";
        break;
      default:
        borders.y = "none";
    }
    return borders;
  }

  getNearIndices(tileindex, radius) {
    const centre = this.getCartesian(tileindex);
    const xlow = Math.max(centre.x - radius, 0);
    const xhigh = Math.min(centre.x + radius, this.boardsize.x - 1);
    const ylow = Math.max(centre.y - radius, 0);
    const yhigh = Math.min(centre.y + radius, this.boardsize.y - 1);
    const nearindices = [];
    for (let i = xlow; i <= xhigh; i++) {
      for (let j = ylow; j <= yhigh; j++) {
        nearindices.push(i + this.boardsize.x * j);
      }
    }
    return nearindices;
  }

	getDirection(indexfrom, indexto) {
	  const start = this.getCartesian(indexfrom);
	  const end = this.getCartesian(indexto);
	  const offset = {
		x: this.getx(indexto) - this.getx(indexfrom),
		y: this.gety(indexto) - this.gety(indexfrom),
	  };

	  let direction = [];

	  if (offset.y > 2 * Math.abs(offset.x)) {
		direction = 2;
	  } else if (offset.y === 2 * Math.abs(offset.x) && offset.x > 0) {
		direction.push(2);
		direction.push(3);
	  } else if (offset.y > (1 / 2) * Math.abs(offset.x) && offset.x > 0) {
		direction = 3;
	  } else if (offset.y === (1 / 2) * Math.abs(offset.x) && offset.x > 0) {
		direction.push(3);
		direction.push(6);
	  } else if (offset.y === 2 * Math.abs(offset.x) && offset.x < 0) {
		direction.push(2);
		direction.push(1);
	  } else if (offset.y > (1 / 2) * Math.abs(offset.x) && offset.x < 0) {
		direction = 1;
	  } else if (offset.y === (1 / 2) * Math.abs(offset.x) && offset.x < 0) {
		direction.push(1);
		direction.push(4);
	  } else if (Math.abs(offset.y) < (1 / 2) * Math.abs(offset.x) && offset.x > 0) {
		direction = 6;
	  } else if (offset.y === (-1 / 2) * Math.abs(offset.x) && offset.x > 0) {
		direction.push(6);
		direction.push(3);
	  } else if (Math.abs(offset.y) < (1 / 2) * Math.abs(offset.x) && offset.x < 0) {
		direction = 4;
	  } else if (offset.y === (-1 / 2) * Math.abs(offset.x) && offset.x < 0) {
		direction.push(4);
		direction.push(7);
	  } else if (offset.y < -1 / 2 * Math.abs(offset.x) && offset.x > 0) {
		direction = 9;
	  } else if (offset.y === (-1 / 2) * Math.abs(offset.x) && offset.x > 0) {
		direction.push(9);
		direction.push(8);
	  } else if (offset.y < -1 / 2 * Math.abs(offset.x) && offset.x < 0) {
		direction = 7;
	  } else if (offset.y === (-1 / 2) * Math.abs(offset.x) && offset.x < 0) {
		direction.push(7);
		direction.push(8);
	  } else if (offset.y < -2 * Math.abs(offset.x)) {
		direction = 8;
	  } else if (offset.y === 0 && offset.x === 0) {
		direction = 5;
	  } else {
		console.log("This maths is bad");
	  }

	  return direction;
	}

	getLine(indexfrom, indexto) {
	  const start = this.getCartesian(indexfrom);
	  const end = this.getCartesian(indexto);
	  const offset = {
		x: this.getx(indexto) - this.getx(indexfrom),
		y: this.gety(indexto) - this.gety(indexfrom),
	  };

	  let longaxis, shortaxis;

	  if (Math.abs(offset.x) > Math.abs(offset.y)) {
		longaxis = "x";
		shortaxis = "y";
	  } else {
		longaxis = "y";
		shortaxis = "x";
	  }

	  const direction = {
		x: Math.min(1, Math.max(-1, end.x - start.x)),
		y: Math.min(1, Math.max(-1, end.y - start.y)),
	  };

	  const distance = Math.max(Math.abs(offset.x), Math.abs(offset.y));
	  let diagonals = Math.min(Math.abs(offset.x), Math.abs(offset.y));
	  let laterals = distance - diagonals;

	  const lateralshift = this.getIndex({
		[longaxis]: start[longaxis] + direction[longaxis],
		[shortaxis]: start[shortaxis],
	  }) - indexfrom;

	  const diagonalshift = this.getIndex({
		[longaxis]: start[longaxis] + direction[longaxis],
		[shortaxis]: start[shortaxis] + direction[shortaxis],
	  }) - indexfrom;

	  let npaths;

	  if (laterals !== 0 && diagonals !== 0 && distance % 2 === 0) {
		npaths = 2;
	  } else {
		npaths = 1;
	  }

	  const returnvalue = {
		npaths: npaths,
	  };

	  if (npaths === 1) {
		const path = [];
		path[0] = indexfrom;
		path[distance] = indexto;

		for (let i = 1; i <= distance / 2; i++) {
		  if (diagonals > laterals) {
			path[i] = path[i - 1] + diagonalshift;
			diagonals--;
			path[distance - i] = path[distance - i + 1] - diagonalshift;
			diagonals--;
		  } else if (laterals > diagonals) {
			path[i] = path[i - 1] + lateralshift;
			laterals--;
			path[distance - i] = path[distance - i + 1] - lateralshift;
			laterals--;
		  }
		}

		returnvalue[0] = indexfrom;
		for (let i = 1; i <= distance; i++) {
		  returnvalue[i] = path[i];
		}
	  }

	  if (npaths === 2) {
		const paths = [[], []];
		paths[0][0] = indexfrom;
		paths[1][0] = indexfrom;
		paths[0][distance] = indexto;
		paths[1][distance] = indexto;

		for (let i = 1; i < distance / 2; i++) {
		  if (diagonals > laterals) {
			paths[0][i] = paths[0][i - 1] + diagonalshift;
			paths[1][i] = paths[1][i - 1] + diagonalshift;
			diagonals--;
			paths[0][distance - i] = paths[0][distance - i + 1] - diagonalshift;
			paths[1][distance - i] = paths[1][distance - i + 1] - diagonalshift;
			diagonals--;
		  } else if (laterals > diagonals) {
			paths[0][i] = paths[0][i - 1] + lateralshift;
			paths[1][i] = paths[1][i - 1] + lateralshift;
			laterals--;
			paths[0][distance - i] = paths[0][distance - i + 1] - lateralshift;
			paths[1][distance - i] = paths[1][distance - i + 1] - lateralshift;
			laterals--;
		  } else if (laterals === diagonals) {
			paths[0][i] = paths[0][i - 1] + (i % 2) * diagonalshift + ((i + 1) % 2) * lateralshift;
			paths[1][i] = paths[1][i - 1] + ((i + 1) % 2) * diagonalshift + (i % 2) * lateralshift;
			paths[0][distance - i] = paths[0][distance - i + 1] - ((i + 1) % 2) * diagonalshift - (i % 2) * lateralshift;
			paths[1][distance - i] = paths[1][distance - i + 1] - (i % 2) * diagonalshift - ((i + 1) % 2) * lateralshift;
			diagonals--;
			laterals--;
		  }
		}

		paths[0][distance / 2] = paths[0][distance / 2 - 1] + ((distance / 2) % 2) * diagonalshift + ((distance / 2 + 1) % 2) * lateralshift;
		paths[1][distance / 2] = paths[1][distance / 2 - 1] + ((distance / 2 + 1) % 2) * diagonalshift + ((distance / 2) % 2) * lateralshift;

		for (let i = 0; i < distance + 1; i++) {
		  returnvalue[i] = [];
		  returnvalue[i][0] = paths[0][i];
		  returnvalue[i][1] = paths[1][i];
		}
	  }

	  returnvalue.distance = distance;
	  return returnvalue;
	}
}

class Terrain extends DungeonSpace {
  constructor(boardsize, terrain) {
    super(boardsize);
    this.boardsize = { x: 75, y: 75 };
    this.terrain = [];
    this.distancemap = [];

    if (arguments.length === 1) {
      this.boardsize = boardsize;
      this.fillspace("wall");
    } else if (arguments.length === 2) {
      this.boardsize = boardsize;
      this.terrain = terrain;
    }

    for (let index in this.terrain) {
      this.distancemap[index] = -1;
    }
  }

	fillspace(thing) {
	  let value;
	  switch (thing) {
		case "floor":
		  value = 0;
		  break;
		case "wall":
		  value = 1;
		  break;
		default:
		  value = 1;
		  break;
	  }
	  for (let i = 0; i < this.boardsize.x * this.boardsize.y; i++) {
		this.terrain.push(value);
	  }
	}

	getTile(position) {
	  let tile = this.terrain[position];
	  switch (tile) {
		case 0:
		  tile = "floor";
		  break;
		case 1:
		  tile = "wall";
		  break;
		case 2:
		  tile = "upstair";
		  break;
		case 3:
		  tile = "downstair";
		  break;
		default:
		  tile = "wall";
		  break;
	  }
	  return tile;
	}

	setTile(position, tile) {
	  switch (tile) {
		case "floor":
		  this.terrain[position] = 0;
		  break;
		case "wall":
		  this.terrain[position] = 1;
		  break;
		case "upstair":
		  this.terrain[position] = 2;
		  break;
		case "downstair":
		  this.terrain[position] = 3;
		  break;
		default:
		  this.terrain[position] = 1;
		  break;
	  }
	}
	getarea(positions) {
	  let tiles = [];
	  for (let i = 0; i < positions.length; i++) {
		tiles.push(this.gettile(positions[i]));
	  }
	  return tiles;
	}

	setarea(positions, tiles) {
	  for (let i = 0; i < positions.length; i++) {
		this.settile(positions[i], tiles[i]);
	  }
	}

	getLineOfSightFrom(position) {
	  let neartiles = this.getNearIndices(position, 7);
	  let visible = [];
	  for (let i = 0; i < neartiles.length; i++) {
		if (this.checklosbetween(position, neartiles[i])) {
		  visible.push(neartiles[i]);
		}
	  }
	  return visible;
	}
	checklosbetween(indexfrom, indexto) {
	  let los = true;
	  let path = this.getLine(indexfrom, indexto);
	  let distance = path.distance;
	  
	  if (distance > 7) {
		los = false;
	  }
	  
	  
	  
	  for (let step in path) {
		if (!/^\d$/.test(step)) {
		  continue;
		}
		
		let thistile = path[step];
		
		if (Array.isArray(thistile)) {
		  if (
			this.getTile(thistile[0]) === "wall" &&
			this.getTile(thistile[1]) === "wall" &&
			step < distance
		  ) {
			los = false;
		  }
		} else if (this.getTile(thistile) === "wall" && step < distance) {
		  los = false;
		}
	  }
	  
	  return los;
	}
	buildDistanceMap(goal) {
	  for (let index in this.terrain) {
		this.distancemap[index] = -1;
	  }
	  
	  this.distancemap[goal] = 0;
	  let edge = this.getNearIndices(goal, 1);
	  let step = 1;
	  
	  while (edge.length > 0) {
		for (let i = edge.length - 1; i >= 0; i--) {
		  let tileindex = edge[i];
		  
		  if (this.terrain[tileindex] === 1 || this.distancemap[tileindex] >= 0) {
			edge.splice(i, 1);
		  } else {
			this.distancemap[tileindex] = step;
		  }
		}
		
		for (let edgeindex in edge) {
		  let tileindex = edge[edgeindex];
		  let neartiles = this.getNearIndices(tileindex, 1);
		  
		  for (let tileindex of neartiles) {
			if (
			  this.terrain[tileindex] !== 1 &&
			  this.distancemap[tileindex] < 0 &&
			  !edge.includes(tileindex)
			) {
			  edge.push(tileindex);
			}
		  }
		}
		
		step++;
	  }
	}
	buildPath(origin) {
	  let goal = Object.keys(this.distancemap).find(key => this.distancemap[key] === 0);
	  let path = [];
	  let nopath = false;
	  let stepsleft = this.distancemap[origin];
	  let currenttile = origin;
	  
	  if (stepsleft > 0) {
		while (stepsleft > 0 && !nopath) {
		  let adjacenttiles = this.getNearIndices(currenttile, 1);
		  adjacenttiles.splice(4, 1);
		  let choices = {
			tiles: [],
			directions: [],
			mod: []
		  };
		  
		  for (let dir in adjacenttiles) {
			let tile = adjacenttiles[dir];
			
			if (
			  this.distancemap[tile] >= 0 &&
			  this.distancemap[tile] < stepsleft
			) {
			  choices.tiles.push(tile);
			  choices.directions.push(this.getDirection(currenttile, tile));
			  choices.mod.push(Math.abs(this.getx(tile) - this.getx(goal)) + Math.abs(this.gety(tile) - this.gety(goal)));
			}
		  }
		  
		  if (choices.tiles.length > 0) {
			let minima = Object.keys(choices.mod).reduce((acc, key) => {
			  if (choices.mod[key] === Math.min(...choices.mod)) {
				acc.push(key);
			  }
			  return acc;
			}, []);
			
			let choice = minima.length > 1 ? minima[Math.floor(Math.random() * minima.length)] : minima[0];
			currenttile = choices.tiles[choice];
			let direction = choices.directions[choice];
			path.push(direction);
			stepsleft--;
		  } else {
			nopath = true;
		  }
		}
	  }
	  
	  return path;
	}
	reversePath(path) {
	  let reversepath = [];
	  
	  if (path.length > 0) {
		for (let step = 0; step < path.length; step++) {
		  let direction = path[step];
		  reversepath[path.length - step - 1] = 10 - direction;
		}
	  }
	  
	  return reversepath;
	}
}

module.exports = {
  Terrain,
  DungeonSpace
};