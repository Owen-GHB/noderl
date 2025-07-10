const { Terrain } = require('./mapclass.js');
const { Creature } = require('./creature.js');
const { Humanoid } = require('./humanoid.js');
const { Player } = require('./player.js');
const { Item } = require('./item.js');
const { Spell } = require('./spell.js');
const { createCanvas } = require('canvas');

class Dungeon extends Terrain {
	constructor(thisspace, creatures, items, explored, decals, visible) {
	  let terrain = [];
	  let boardsize = { x: 60, y: 60 };

	  if (arguments.length === 0) {
		boardsize = { x: 60, y: 60 };
		super(boardsize, terrain);
		this.fillspace("wall");
		terrain = this.terrain;
	  } else {
		terrain = thisspace.terrain;
		boardsize = thisspace.boardsize;
		super(boardsize, terrain);
	  }

	  this.terrain = terrain;
	  this.boardsize = boardsize;
	  this.creatures = [];
	  if (creatures !== undefined) this.loadCreatures(creatures);
	  this.items = (items !== undefined) ? items : {};
	  this.explored = (explored !== undefined) ? explored : [];
	  this.decals = (decals !== undefined) ? decals : {};
	  
	  // former global variables
	  this.animations = [];
	  this.eventLog = [];
	  this.automove = false;
	  this.mapRefresh = false;
	  this.currentFloor = 1;

	  if (visible !== undefined) {
		this.visible = visible;
		this.buildDistanceMap(creatures[0].position);
	  } else if (creatures !== undefined) {
		this.visible = this.getLineOfSightFrom(creatures[0].position);
	  } else {
		this.visible = null;
	  }
	}
  // Functions for loading items/creatures into the dungeon
	addPlayer(playername, gender, hairstyle) {
	  const position = this.pickEmpty(this.terrain);
	  this.creatures.push(new Player(position, playername, gender, hairstyle));
	}

	addCreature(creatureset, type, position, equipment, inventory) {
	  if (position === "random") {
		position = this.pickEmpty(this.terrain);
	  }
	  if (
		creatureset === "goblinoid" &&
		type !== "troll" ||
		type === "skeleton" ||
		type === "demon" ||
		type === "baron"
	  ) {
		this.creatures.push(new Humanoid(type, position, equipment, inventory));
	  } else {
		this.creatures.push(new Creature(type, position));
	  }
	}
	
	// New method to load creatures and assign properties
	loadCreatures(creatures) {
		creatures.forEach((creature) => {
		  const { creaturetype, position, creatureset, equipment, inventory } = creature;
		  if (creaturetype=='player') {
			const { playername, gender, hairstyle } =  creature;
			this.addPlayer(playername, gender, hairstyle);  
		  } else {
			this.addCreature(creatureset, creaturetype, position, equipment, inventory);
		  }

		  const newCreature = this.creatures[this.creatures.length - 1];
		  const properties = Object.keys(creature);
		  
		  properties.forEach((property) => {
			newCreature[property]=creature[property];
		  });
		  
		});
	}
	
	addItem(itemclass, name, position) {
	  if (position === "random") {
		position = this.pickEmpty(this.terrain);
	  }
	  if (Array.isArray(position)) {
		position = this.getIndex(position);
	  }
	  if (this.items[position] && Array.isArray(this.items[position])) {
		this.items[position].unshift(new Item(itemclass, name));
	  } else {
		this.items[position] = [new Item(itemclass, name)];
	  }
	}

	pickEmpty(subspace) {
	  let picked = false;
	  let pick;
	  while (!picked) {
		pick = Math.floor(Math.random() * (this.boardsize.x * this.boardsize.y));
		if (this.getTile(pick) !== "wall" && !this.checkOccupancy(pick)) {
		  picked = true;
		}
	  }
	  return pick;
	}
	
	// Utility functions for handling creature locations
	checkOccupancy(target) {
	  let occupied = false;
	  if (Array.isArray(this.creatures)) {
		for (const creature of this.creatures) {
		  if (creature.position === target) {
			occupied = true;
		  }
		}
	  }
	  return occupied;
	}

	getOccupyingCreatureId(target) {
	  let occupantKey;
	  if (Array.isArray(this.creatures)) {
		for (const [key, creature] of this.creatures.entries()) {
		  if (creature.position === target) {
			occupantKey = key;
		  }
		}
	  }
	  return occupantKey;
	}

	checkLoFBetween(indexFrom, indexTo) {
	  let lof = true;
	  const path = this.getLine(indexFrom, indexTo);
	  const distance = path.distance;
	  if (distance > 8) {
		lof = false;
	  }
	  for (const step in path) {
		if (step !== "distance" && Number.isInteger(Number(step)) && step > 0) {
		  const thisTile = path[step];
		  if (Array.isArray(thisTile)) {
			if ((this.checkOccupancy(thisTile[0]) || this.checkOccupancy(thisTile[1])) && step < distance) {
			  lof = false;
			}
		  } else if (this.checkOccupancy(thisTile) && step < distance) {
			lof = false;
		  }
		}
	  }
	  return lof;
	} 
	
	// Handling the player creature
	movePlayer(command, modifier, globals) {
	  this.animations = globals.animations;
	  this.eventLog = globals.eventLog;
	  this.automove = globals.automove;
	  this.mapRefresh = globals.mapRefresh;
	  this.currentFloor = globals.currentFloor;
	  // modifier is now expected to be pre-parsed by http-api.js
	  // Old lines:
	  // modifier = modifier.replace(/\\/g, '');
	  // modifier = JSON.parse(modifier);
	  switch (command) {
		case "move":
		  if (typeof modifier === 'number') {
			const from = this.getCartesian(this.creatures[0].position);
			const target = {
			  x: from.x + ((modifier - 1) % 3) - 1,
			  y: from.y + Math.ceil((1 - modifier) / 3) + 1
			};
			const targetIndex = this.getIndex(target);
			if (this.checkOccupancy(targetIndex) && modifier !== 5) {
			  const validMove = this.creatures[0].attack(this, this.getOccupyingCreatureId(targetIndex));
			  if (validMove) {
				this.addExploration();
				this.moveMonsters();
			  }
			} else if (modifier === 5) {
			  let validMove = this.creatures[0].pickup(this);
			  if (!validMove) {
				validMove = this.creatures[0].moveCreature(this, modifier);
			  }
			  if (validMove) {
				this.animations.push({ type: "playermove", direction: modifier });
				this.addExploration();
				this.moveMonsters();
			  }
			} else {
			  const validMove = this.creatures[0].moveCreature(this, modifier);
			  if (validMove) {
				this.animations.push({ type: "playermove", direction: modifier });
				this.addExploration();
				this.moveMonsters();
			  }
			}
		  }
		  break;
		case "climbstair":
		  if (modifier === "down" && this.currentFloor < 9 && this.getTile(this.creatures[0].position) === "downstair") {
			this.currentFloor++;
		  } else if (modifier === "down" && this.getTile(this.creatures[0].position) === "downstair") {
			this.creatures[0].hp = 0;
			this.animations.push({ type: "death" });
			this.eventLog.push("You slipped and fell");
		  } else if (modifier === "up" && this.currentFloor > 1 && this.getTile(this.creatures[0].position) === "upstair") {
			this.currentfloor--;
		  }
		  break;
		case "moveto":
		  if (typeof(modifier)=='object' && modifier != null) {
			const target = this.getIndex(modifier);
			const pathFrom = this.buildPath(target);
			const pathTo = this.reversePath(pathFrom);
			const direction = pathTo.length > 0 ? pathTo[0] : 5;
			let validMove = false;
			this.automove = true;
			if (this.checkOccupancy(target) && direction !== 5) {
			  this.automove = false;
			  validMove = this.creatures[0].attack(this, this.getOccupyingCreatureId(target));
			} else if (direction === 5) {
			  this.automove = false;
			  validMove = this.creatures[0].pickup(this);
			  if (!validMove) {
				if (this.terrain[this.creatures[0].position] === 3 && this.currentFloor < 9) {
				  this.currentFloor++;
				} else if (this.terrain[this.creatures[0].position] === 2) {
				  this.currentFloor--;
				} else {
				  validMove = this.creatures[0].moveCreature(this, direction);
				}
			  }
			}
			if (!validMove) {
			  validMove = this.creatures[0].moveCreature(this, direction);
			  if (validMove) {
				this.animations.push({ type: "playermove", direction: direction });
			  }
			}
			if (validMove) {
			  if (this.creatures[0].position === target) {
				this.automove = false;
			  }
			  this.addExploration();
			  this.moveMonsters();
			  const visibleArea = this.visible;
			  if (this.automove) {
				for (let i = 0; i < this.creatures.length; i++) {
				  const creature = this.creatures[i];
				  if (visibleArea.includes(creature.position) && i !== 0) {
					this.automove = false;
					break;
				  }
				}
			  }
			} else {
			  this.automove = false;
			}
		  } else if (modifier === "explore") {
			this.automove = true;
			const validMove = this.creatures[0].explore(this);
			if (validMove) {
			  this.addExploration();
			  this.moveMonsters();
			  const visibleArea = this.visible;
			  for (let i = 0; i < this.creatures.length; i++) {
				const creature = this.creatures[i];
				if (visibleArea.includes(creature.position) && i !== 0) {
				  this.automove = false;
				  break;
				}
			  }
			}
		  }
		  break;
		case "use":
		  const validMoveUse = this.creatures[0].useItem(modifier);
		  if (validMoveUse) {
			this.moveMonsters();
		  }
		  break;
		case "remove":
		  const validMoveRemove = this.creatures[0].rem(modifier);
		  if (validMoveRemove) {
			this.moveMonsters();
		  }
		  break;
		case "pickup":
		  const validMovePickup = this.creatures[0].pickup(this);
		  if (validMovePickup) {
			this.moveMonsters();
		  }
		  break;
		case "drop":
		  const validMoveDrop = this.creatures[0].drop(this, modifier);
		  if (validMoveDrop) {
			this.moveMonsters();
		  }
		  break;
		case "cast":
		  const targetCast = this.getIndex({ x: modifier.x, y: modifier.y });
		  const spellname = modifier.spell;
		  if (this.checkOccupancy(targetCast) && spellname) {
			const validMoveCast = this.creatures[0].cast(this, spellname, this.getOccupyingCreatureId(targetCast));
			if (validMoveCast) {
			  this.moveMonsters();
			}
		  } else {
			if (!spellname) {
			  this.eventLog.push("No spell selected");
			}
		  }
		  break;
		case "wait":
		  let turnsPassed = 0;
		  const visibleAreaWait = this.visible;
		  let vismonster = false;
		  for (let i = 0; i < this.creatures.length; i++) {
			const creature = this.creatures[i];
			if (visibleAreaWait.includes(creature.position) && i !== 0) {
			  vismonster = true;
			  break;
			}
		  }
		  while (turnsPassed < modifier && (this.creatures[0].hp < this.creatures[0].maxhp || this.creatures[0].mana < this.creatures[0].maxmana) && !vismonster) {
			this.creatures[0].moveCreature(this, 5);
			this.moveMonsters();
			turnsPassed++;
			for (let i = 0; i < this.creatures.length; i++) {
			  const creature = this.creatures[i];
			  if (visibleAreaWait.includes(creature.position) && i !== 0) {
				vismonster = true;
				break;
			  }
			}
		  }
		  this.eventLog.push("waited " + turnsPassed + " turns");
		  break;
		case "suicide":
		  this.creatures[0].hp = 0;
		  this.animations.push({ type: "death" });
		  this.eventLog.push("You lose the will to continue");
		  break;
		default:
		  break;
	  }
	}
		
	
	// Global regeneration
	regenAll() {
	  for (var creature of this.creatures) {
		if (creature.hp < creature.maxhp) {
		  const regenPeriod = Math.ceil(200 / creature.maxhp);
		  if ((this.creatures[0].turncount * creature.regen) % regenPeriod < creature.regen) {
			creature.hp++;
		  }
		}
		if (creature.mana < creature.maxmana) {
		  const regenPeriod = Math.ceil(40 / creature.maxmana);
		  if (this.creatures[0].turncount % regenPeriod === 0) {
			creature.mana++;
		  }
		}
	  }
	}

	// Update exploration visibility and movement tables
	addExploration() {
	  this.visible = this.getLineOfSightFrom(this.creatures[0].position);
	  const visible = this.visible;
	  for (let i = 0; i < visible.length; i++) {
		const location = visible[i];
		if (!this.explored.includes(location)) {
		  this.explored.push(location);
		}
	  }
	  this.buildDistanceMap(this.creatures[0].position);
	}

	// Computer controlled AI methods, includes call to global regen
	moveMonsters() {
	  this.creatures[0].turncount++;
	  this.regenAll();
	  for (var creature of this.creatures) {
		creature.waiting = true;
		if (creature.creaturetype !== 'player' && creature.alive && this.creatures[0].hp > 0) {
		  creature.moveAI(this);
		}
	  }
	}
	
	getOutputs() {
	  let output = {};
	  output.stats = this.getPlayerStats();
	  output.terrain = this.getVisibleTerrain(false);
	  output.explored = this.getVisibleTerrain(true);
	  output.creatures = this.getVisibleCreatures();
	  const nearExploration = Array.from(new Set(this.explored)).filter(location =>
		this.getNearIndices(this.creatures[0].position, 6).includes(location)
	  );
	  output.items = this.getVisibleItems(nearExploration);
	  output.decals = this.getVisibleDecals(nearExploration);
	  output.clear = this.automove;
	  output.movelog = this.eventLog;
	  if (this.animations.length) output.animations = this.animations;
	  if (this.mapRefresh) {
		// output.minimap = this.getMinimap(this.explored);
		output.mapRefresh = true;
	  }
	  return output;
	}
	getPlayerStats() {
	  const stats = {};
	  if (this.creatures[0] !== undefined) {
		stats.hp = this.creatures[0].hp;
		stats.maxhp = this.creatures[0].maxhp;
		stats.mana = this.creatures[0].mana;
		stats.maxmana = this.creatures[0].maxmana;
		stats.experience = this.creatures[0].experience;
		stats.level = this.creatures[0].level;
		stats.strength = parseInt(this.creatures[0].strength);
		stats.dexterity = parseInt(this.creatures[0].dexterity);
		stats.equipment = [];
		for (const slot in this.creatures[0].equipment) {
		  const possession = this.creatures[0].equipment[slot];
		  if (possession !== false) {
			if (possession.category === "equipment" && possession.itemclass !== "ring") {
			  stats.equipment.push({
				type: possession.name,
				strrep: possession.strrep
			  });
			} else {
			  stats.equipment.push({
				type: possession.itemclass,
				strrep: possession.strrep
			  });
			}
		  } else {
			stats.equipment.push(false);
		  }
		}
		stats.inventory = [];
		for (const slot in this.creatures[0].inventory) {
		  const possession = this.creatures[0].inventory[slot];
		  if (possession.category === "equipment" && possession.itemclass !== "ring") {
			stats.inventory.push({
			  type: possession.name,
			  strrep: possession.strrep
			});
		  } else {
			stats.inventory.push({
			  type: possession.itemclass,
			  strrep: possession.strrep
			});
		  }
		}
		stats.repetoire = this.creatures[0].repetoire;
		stats.position = this.getCartesian(this.creatures[0].position);
		if (this.items[this.creatures[0].position] !== undefined) {
		  stats.onground = this.items[this.creatures[0].position];
		} else {
		  stats.onground = false;
		}
	  } else {
		stats.hp = ":(";
		stats.inventory = null;
		stats.position = this.getCartesian(this.creatures[0].position);
	  }
	  return stats;
	}
	getVisibleTerrain(incexp) {
	  let visible;
	  if (incexp) {
		visible = this.explored.filter(location => this.getNearIndices(this.creatures[0].position, 8).includes(location));
	  } else {
		visible = this.visible;
	  }
	  const centre = this.getCartesian(this.creatures[0].position);
	  const radius = 8;
	  const xlow = centre.x - radius;
	  const xhigh = centre.x + radius;
	  const ylow = centre.y - radius;
	  const yhigh = centre.y + radius;
	  let map = "";
	  for (let i = xlow; i <= xhigh; i++) {
		if (i !== xlow) {
		  map += "L";
		}
		for (let j = ylow; j <= yhigh; j++) {
		  if (visible.includes(this.getIndex({ x: i, y: j }))) {
			map += this.terrain[this.getIndex({ x: i, y: j })];
		  } else {
			map += "u";
		  }
		}
	  }
	  return map;
	}	
	getVisibleItems() {
	  const visible = this.explored.filter(location => 
	    this.getNearIndices(this.creatures[0].position, 8).includes(location)
	  );
	  let outputs = [];
	  if (typeof this.items === "object" && this.items !== null) {
		for (const position in this.items) {
		  if (visible.includes(parseInt(position))) {
			const itemstack = this.items[position];
			const output = {};
			if (itemstack[0].itemclass !== "corpse") {
			  if (itemstack[0].category === "equipment" && itemstack[0].itemclass !== "ring") {
				output["type"] = itemstack[0].name;
			  } else {
				output["type"] = itemstack[0].itemclass;
			  }
			} else {
			  output["type"] = itemstack[0].name + itemstack[0].itemclass;
			}
			output["position"] = this.getCartesian(position);
			outputs.push(output);
		  }
		}
	  }
	  return outputs.length ? outputs : false;
	}

	getVisibleCreatures() {
	  const visible = this.visible;
	  let outputs = [];
	  if (Array.isArray(this.creatures)) {
		for (const creature of this.creatures) {
		  if (visible.includes(creature.position)) {
			const output = {};
			output["type"] = creature.creaturetype;
			output["condition"] = creature.hp / creature.maxhp;
			output["position"] = this.getCartesian(creature.position);
			output["equipment"] = [];
			if (creature.equipment !== false) {
			  for (const slot in creature.equipment) {
				const posession = creature.equipment[slot];
				if (posession !== false && posession.itemclass !== "ring") {
				  output["equipment"].push(posession.name);
				}
			  }
			}
			outputs.push(output);
		  }
		}
	  }
	  return outputs;
	}

	getVisibleDecals() {
	  const visible = this.explored.filter(location => this.getNearIndices(this.creatures[0].position, 8).includes(location));
	  const centre = this.getCartesian(this.creatures[0].position);
	  const radius = 8;
	  const xlow = centre.x - radius;
	  const xhigh = centre.x + radius;
	  const ylow = centre.y - radius;
	  const yhigh = centre.y + radius;
	  let map = "";
	  for (let i = xlow; i <= xhigh; i++) {
		if (i !== xlow) {
		  map += "L";
		}
		for (let j = ylow; j <= yhigh; j++) {
		  const index = this.getIndex({ x: i, y: j });
		  if (visible.includes(parseInt(index)) && index in this.decals) {
			map += this.decals[index];
		  } else {
			map += "0";
		  }
		}
	  }
	  return map;
	}
	getMinimap() {
	  let strrep = "";
	  for (let i = 0; i < this.boardsize.x * this.boardsize.y; i++) {
		if ((i % 60) === 0 && i !== 0) {
		  strrep += "L";
		}
		const tilerep = this.terrain[i];
		if (this.explored.includes(i)) {
		  strrep += tilerep;
		} else {
		  strrep += "u";
		}
	  }
	  return strrep;
	}

	drawPicture() {

	  const picture = createCanvas(this.boardsize.x * 3, this.boardsize.y * 3);
	  const ctx = picture.getContext('2d');
	  const floor = 'rgb(160, 160, 160)';
	  const player = 'rgb(0, 255, 0)';
	  const wall = 'rgb(80, 80, 80)';

	  for (let i = 0; i < this.boardsize.x * this.boardsize.y; i++) {
		const tilexy = this.getCartesian(i);
		const imagex = 3 * tilexy.x;
		const imagey = 3 * tilexy.y;
		let colour;
		if (this.getTile(i) === 'wall') {
		  colour = wall;
		} else {
		  colour = floor;
		}
		if (true || this.explored.includes(i)) {
		  ctx.fillStyle = colour;
		  ctx.fillRect(imagex, imagey, 2, 2);
		}
	  }

	  return picture;
	}
}

module.exports = {
  Dungeon
};