const { Spell } = require('./spell.js');
const fs = require('fs');

// Creature class
class Creature {
  constructor(type, position) {
    this.position = position;
    this.alive = true;
    this.waiting = true;
    // notarget
    this.destination = false;
    this.route = [];
    const stats = this.findStats(type);
    for (const stat in stats) {
      if (stat !== "creaturetype" && stat !== "creatureset") {
        this[stat] = parseInt(stats[stat]);
      } else {
        this[stat] = stats[stat];
      }
    }
    this.creaturetype = type;
    this.hp = parseInt(this.maxhp);
    this.equipment = false;
    // adjust database and remove these lines
    this.maxmana = 10;
    this.defaultweapon = {
      bash: 2,
      slash: 4,
      pierce: 0,
      block: 0,
      acc: 0,
    };
    // load spell list
    this.repetoire = [];
    this.giverepetoire();
  }

  // validation for actions
  getValidActions(dungeon) {
    const adjacentTiles = dungeon.getNearIndices(this.position, 1);
    // reorder array to suit directional actions
    const potentialTargets = {};
    for (let i = 0; i < 4; i++) {
      const direction = dungeon.getDirection(this.position, adjacentTiles[i]);
      potentialTargets[direction] = adjacentTiles[i];
    }
    potentialTargets[5] = this.position;
    for (let i = 5; i < 9; i++) {
      const direction = dungeon.getDirection(this.position, adjacentTiles[i]);
      potentialTargets[direction] = adjacentTiles[i];
    }
    adjacentTiles.splice(0);
    const actions = { move: [], attack: [] };
    for (const [direction, target] of Object.entries(potentialTargets)) {
      if (dungeon.getTile(target) === "wall") {
        delete potentialTargets[direction];
      } else if (!dungeon.checkOccupancy(target) || direction === "5") {
        actions.move.push(direction);
      } else {
        actions.attack.push(dungeon.getOccupyingCreatureId(target));
      }
    }
    return actions;
  }

  moveCreature(dungeon, direction) {
    const animation = {
      type: "creaturemove",
      from: dungeon.getCartesian(this.position - dungeon.creatures[0].position + 488),
      direction,
    };
    const from = dungeon.getCartesian(this.position);
    const target = {
      x: from.x + ((direction - 1) % 3) - 1,
      y: from.y + Math.ceil((1 - direction) / 3) + 1,
    };
    const targetIndex = dungeon.getIndex(target);
    if (
      dungeon.getTile(targetIndex) !== "wall" &&
      (!dungeon.checkOccupancy(targetIndex) || direction === 5)
    ) {
      this.position = targetIndex;
      const success = true;
      this.waiting = false;
      if (success && this.creaturetype !== "player") {
        const visibleArea = dungeon.visible;
        if (visibleArea.includes(this.position)) {
          dungeon.animations.push(animation);
        }
      }
      return success;
    }
    return false;
  }

  getArmour() {
    let armour = this.armour;
    if (this.inventory) {
      for (const slot in this.equipment) {
        const piece = this.equipment[slot];
        if (piece.armour) {
          armour += parseInt(piece.armour);
        }
      }
    }
    return armour;
  }

  getBlock() {
    let block = 0;
    if (this.inventory) {
      for (const slot in this.equipment) {
        const piece = this.equipment[slot];
        if (piece.block) {
          block += parseInt(piece.block);
        }
      }
    }
    return block;
  }

  getDex() {
    let dex = this.dexterity;
    if (this.inventory) {
      for (const slot in this.equipment) {
        const piece = this.equipment[slot];
        if (piece.dex) {
          dex += parseInt(piece.dex);
        }
      }
    }
    return dex;
  }

	attack(dungeon, victimid) {
	  const validactions = this.getValidActions(dungeon);
	  const victim = dungeon.creatures[victimid];
	  let weapon;
	  let advweapon;
	  
	  if (Array.isArray(this.inventory) && this.equipment.weapon) {
		weapon = this.equipment.weapon.affects;
	  } else {
		weapon = this.defaultweapon;
	  }
	  
	  if (Array.isArray(victim.inventory) && victim.equipment.weapon) {
		advweapon = victim.equipment.weapon.affects;
	  } else {
		advweapon = victim.defaultweapon;
	  }
	  
	  if (validactions.attack && dungeon.getNearIndices(this.position, 1).includes(victim.position)) {
		let hitroll = Math.floor(Math.random() * 100) + 1;
		let tohit = Math.round(100 * Math.pow(0.4, 1 / Math.max(this.dexterity + weapon.acc, 1)));
		const nomiss = hitroll < tohit;
		
		hitroll = Math.floor(Math.random() * 100) + 1;
		tohit = Math.round(100 * Math.pow(0.9, victim.getDex()));
		let hit = hitroll < tohit;
		
		if (!hit) {
		  hitroll = Math.floor(Math.random() * 100) + 1;
		  tohit = Math.round(100 * Math.pow(0.98, this.dexterity + weapon.acc - victim.getDex()));
		  const advhit = hitroll > tohit;
		  hit = advhit;
		}
		
		hitroll = Math.floor(Math.random() * 100) + 1;
		tohit = Math.round(100 * Math.pow(0.95, victim.getBlock()));
		let noblock = hitroll < tohit;
		
		if (!noblock) {
		  hitroll = Math.floor(Math.random() * 100) + 1;
		  tohit = Math.round(100 * Math.pow(0.97, this.strength - victim.strength));
		  const advnoblock = hitroll > tohit;
		  noblock = advnoblock;
		}
		
		hitroll = Math.floor(Math.random() * 100) + 1;
		tohit = Math.round(100 * Math.pow(0.98, this.getDex()));
		const crit = hitroll > tohit;
		
		let damage = 0;
		
		for (let i = 0; i < weapon.bash; i++) {
		  damage += Math.floor(Math.random() * weapon.slash) + 1;
		}
		
		damage = Math.round(damage * Math.pow(1.125, this.strength - 6));
		const reduction = Math.floor(Math.random() * victim.getArmour()) + 1;
		
		if (!crit) {
		  damage = Math.max(damage - reduction, 1);
		  damage += weapon.pierce;
		} else {
		  damage += weapon.pierce;
		  damage = Math.round(damage * Math.pow(1.1, this.getDex()));
		}
		
		damage *= hit * nomiss * noblock;
		
		dungeon.creatures[victimid].hp -= damage;
		
		const direction = dungeon.getDirection(this.position, victim.position);
		
		dungeon.animations.push({
		  type: "melee",
		  location: dungeon.getCartesian(this.position - dungeon.creatures[0].position + 488),
		  direction: direction
		});
		
		if (damage > 0) {
		  dungeon.animations.push({
			type: "bleed",
			location: dungeon.getCartesian(victim.position - dungeon.creatures[0].position + 488)
		  });
		}
		
		const eventLog = [];
		
		if (!nomiss) {
		  dungeon.eventLog.push(`${this.creaturetype} missed ${victim.creaturetype}`);
		} else if (!hit) {
		  dungeon.eventLog.push(`${victim.creaturetype} dodged ${this.creaturetype}'s attack`);
		} else if (!noblock) {
		  dungeon.eventLog.push(`${victim.creaturetype} blocked ${this.creaturetype}'s attack`);
		} else if (crit) {
		  dungeon.eventLog.push(`${this.creaturetype} hit ${victim.creaturetype} for ${damage} damage!`);
		} else {
		  dungeon.eventLog.push(`${this.creaturetype} hit ${victim.creaturetype} for ${damage} damage`);
		}
		
		this.waiting = false;
		
		if (victim.hp < 1) {
		  const location = victim.position;
		  
		  if (victimid) {
			if (Array.isArray(victim.inventory)) {
			  dungeon.creatures[victimid].dropAll(dungeon);
			}
			
			dungeon.addItem("corpse", victim.creaturetype, location);
			dungeon.creatures[victimid].alive = false;
			dungeon.creatures[0].gainexp(victim.level);
			dungeon.creatures.splice(victimid,1);
		  } else {
			dungeon.animations.push({ type: "death" });
			dungeon.eventLog.push("Oh no! You died :(");
		  }
		}
		
		return true;
	  } else {
		return false;
	  }
	}

	moveToward(dungeon, destination) {
	  const direction = dungeon.getDirection(this.position, destination);
	  let success = false;
	  let animation = {};

	  if (Array.isArray(direction)) {
		success = this.moveCreature(dungeon, direction[0]) * direction[0];
		if (success && this.creaturetype !== "player") {
		  animation.direction = direction[0];
		} else if (this.creaturetype !== "player") {
		  success = this.moveCreature(dungeon, direction[1]) * direction[1];
		  if (success && this.creaturetype !== "player") {
			animation.direction = direction[1];
		  }
		}
	  } else {
		success = this.moveCreature(dungeon, direction) * direction;
	  }

	  return success;
	}
	movewrtGoal(dungeon, objective) {
	  let success = false;
	  const adjacentTiles = dungeon.getNearIndices(this.position, 1);
	  const slope = {};

	  for (let i = 0; i < 4; i++) {
		const direction = dungeon.getDirection(this.position, adjacentTiles[i]);
		if (
		  dungeon.distancemap[adjacentTiles[i]] > 0 &&
		  !dungeon.checkOccupancy(adjacentTiles[i])
		) {
		  slope[direction] =
			dungeon.distancemap[adjacentTiles[i]] - dungeon.distancemap[this.position];
		}
	  }

	  slope[5] = 0;

	  for (let i = 5; i < 9; i++) {
		const direction = dungeon.getDirection(this.position, adjacentTiles[i]);
		if (
		  dungeon.distancemap[adjacentTiles[i]] > 0 &&
		  !dungeon.checkOccupancy(adjacentTiles[i])
		) {
		  slope[direction] =
			dungeon.distancemap[adjacentTiles[i]] - dungeon.distancemap[this.position];
		}
	  }

	  let bestCase;

	  switch (objective) {
		case "toward":
		  bestCase = Math.min(...Object.values(slope));
		  break;
		case "away":
		  bestCase = Math.max(...Object.values(slope));
		  break;
		case "along":
		  bestCase = 0;
		  break;
		default:
		  break;
	  }

	const filteredSlope = {};

	for (const direction in slope) {
		if (slope[direction] === bestCase) {
		  filteredSlope[direction] = slope[direction];
		}
	}

	const directions = Object.keys(filteredSlope);
	  const randomDirection = directions[Math.floor(Math.random() * directions.length)];
	  success = this.moveCreature(dungeon, randomDirection);

	  return success;
	}

	cast(dungeon, spellname, victim) {
	  let knowspell = false;
	  let eventLog = [];
	  let spell;
	  
	  for (const known of this.repetoire) {
		if (known.spellname === spellname) {
		  spell = known;
		  knowspell = true;
		  break;
		}
	  }
	  
	  let cancast = true;
	  
	  if (this.creaturetype === "player" && (!this.equipment.weapon || this.equipment.weapon.name !== "staff")) {
		cancast = false;
		eventLog.push("Must wield a staff to cast spells");
	  }
	  
	  const lof = dungeon.checkLoFBetween(this.position, dungeon.creatures[victim].position);
	  
	  if (this.creaturetype === "player" && !lof) {
		eventLog.push("No line of fire");
	  }
	  
	  cancast *= lof * knowspell;
	  
	  let success = false;
	  
	  if (cancast && this.mana >= spell.cost) {
		this.mana -= spell.cost;
		
		if (spell.nature === "damage") {
		  const damage = Math.floor(Math.random() * (spell.power + this.level) + spell.power);
		  dungeon.creatures[victim].hp -= damage;
		  
		  const animations = [];
		  animations.push({
			type: spell.spellname,
			origin: dungeon.getCartesian(this.position - dungeon.creatures[0].position + 488),
			location: dungeon.getCartesian(dungeon.creatures[victim].position - dungeon.creatures[0].position + 488)
		  });
		  
		  eventLog.push(`${this.creaturetype} cast ${spell.spellname} against ${dungeon.creatures[victim].creaturetype} for ${damage} damage`);
		  
		  this.waiting = false;
		  
		  if (dungeon.creatures[victim].hp < 1) {
			const location = dungeon.creatures[victim].position;
			
			if (victim) {
			  if (Array.isArray(dungeon.creatures[victim].inventory)) {
				dungeon.creatures[victim].dropall(dungeon);
			  }
			  
			  dungeon.additem("corpse", dungeon.creatures[victim].creaturetype, location);
			  dungeon.creatures[victim].alive = false;
			  dungeon.creatures[0].gainexp(dungeon.creatures[victim].level);
			  delete dungeon.creatures[victim];
			} else {
			  eventLog.push("Oh no! You died :(");
			}
		  }
		  
		  success = true;
		}
	  } else {
		if (this.mana < spell.cost) {
		  eventLog.push("Not enough mana");
		}
	  }
	  
	  return { success, eventLog };
	}

	moveAI(dungeon) {
	  let validActions = this.getValidActions(dungeon);
	  let nearToPlayer = dungeon.visible.includes(this.position);
	  
	  if (nearToPlayer) {
		this.route = dungeon.buildPath(this.position);
	  }
	  
	  if (validActions.attack && this.waiting) {
		for (let victim of validActions.attack) {
		  if (this.waiting && victim === 0) {
			this.attack(dungeon, 0);
		  }
		}
	  }
	  
	  if (this.waiting && nearToPlayer) {
		if (this.repetoire[0]) {
		  let rn = Math.floor(Math.random() * 3) + 1;
		  if (rn === 1) {
			let cast = this.cast(dungeon, this.repetoire[0].spellname, 0);
			if (!cast && this.waiting) {
			  this.movewrtGoal(dungeon, "along");
			  this.route = dungeon.buildPath(this.position);
			}
		  }
		}
	  }
	  
	  if (this.route.length > 0 && this.waiting) {
		let direction = this.route.shift();
		this.moveCreature(dungeon, direction);
	  }
	  
	  if (this.waiting && nearToPlayer) {
		this.movewrtGoal(dungeon, "toward");
		this.route = dungeon.buildPath(this.position);
	  }
	  
	  let moved = false;
	  if (this.waiting) {
		while (!moved) {
		  let direction = Math.floor(Math.random() * 9) + 1;
		  moved = this.moveCreature(dungeon, direction);
		}
	  }
	}


	findStats(type) {
	  // Load the JSON array from creatures.json (assuming it's available)
	  const creaturesData = JSON.parse(fs.readFileSync('./creatures.json','utf-8'));

	  // Find the creature object with matching creaturetype
	  const creature = creaturesData.find(obj => obj.creaturetype === type);

	  // Return the creature object if found, otherwise return null or handle the error case as needed
	  return creature || null;
	}

  // Helper method to give a repertoire of spells to the creature
	giverepetoire() {
	  if (this.creaturetype === "imp" || this.creaturetype === "baron") {
		this.repetoire.push(new Spell("burn"));
	  } else if (
		this.creaturetype === "goblinshaman" ||
		this.creaturetype === "orcshaman"
	  ) {
		this.repetoire.push(new Spell("shock"));
	  } else if (this.creaturetype === "banshee") {
		this.repetoire.push(new Spell("chill"));
	  }
	}
}

module.exports = {
  Creature
};