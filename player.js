const { Humanoid } = require('./humanoid.js');
const { Item } = require('./item.js');

class Player extends Humanoid {
  constructor(position, playername, gender, hairstyle) { // Changed 'name' back to 'playername'
    super("player", position);
    this.creaturetype = "player";
    // this.name = name; // Removed redundant 'name' property
    this.position = position;
    this.alive = true;
    this.waiting = true;
    
    // Add cosmetics
    this.playername = playername; // This is the correct property for the character's name
    this.gender = gender;
    this.hairstyle = hairstyle;
    
    // Add base stats
    const stats = this.findStats("player");
    for (const stat in stats) {
      this[stat] = stats[stat];
    }
    
    this.maxhp = parseInt(this.maxhp);
    this.hp = parseInt(this.maxhp);
    this.level = parseInt(this.level);
    this.experience = 0;
    this.turncount = 0;
    this.maxmana = 4;
    this.mana = this.maxmana;
    
    // Load inventory
    this.inventory = [];
    for (let i = 0; i < 2; i++) {
      this.inventory[i] = new Item("potion", "mend wounds");
    }
    
    // Load spell list
    this.repetoire = [];
    
    // Load equipment
    this.equipment = {
      weapon: false,
      ring: false,
      cloak: false,
      armour: false,
      helmet: false,
      shield: false
    };
    
    // Add and equip starting items
    this.inventory[2] = new Item("weapon", "shortsword");
    this.wear(2);
    this.inventory[2] = new Item("armour", "robes");
    this.wear(2);
  }
  
  gainlevel() {
    this.level++;
    this.maxhp += 4;
    this.hp += 4;
    this.maxmana += 1;
    this.mana += 1;
    if (Math.random() < 0.5) {
      this.strength++;
    } else {
      this.dexterity++;
    }
  }
  
  gainexp(amount) {
    this.experience += amount;
    const requiredExp = (this.level + 1) ** 3;
    if (this.experience >= requiredExp) {
      this.gainlevel();
    }
  }
  
  explore(dungeon) {
    let success = false;
    let upperlimit = Math.max(...dungeon.distancemap);
	let destination = this.position;
    
    for (let tileindex=0;tileindex < dungeon.terrain.length;tileindex++) {
      if (dungeon.distancemap[tileindex] > 0 
	    && dungeon.terrain[tileindex] !== 1
        && dungeon.distancemap[tileindex] < upperlimit
        && !dungeon.explored.includes(tileindex)) {
        destination = tileindex;
        upperlimit = dungeon.distancemap[tileindex];
      }
    }
    
    const pathfrom = dungeon.buildPath(destination);
    const explorepath = dungeon.reversePath(pathfrom);
    
    if (explorepath.length > 0) {
      success = this.moveCreature(dungeon, explorepath[0]);
    } else {
      const exitTile = Object.keys(dungeon.terrain).find((key) => dungeon.terrain[key] === 3);
      const pathToExit = dungeon.buildPath(exitTile);
      const exploreExitPath = dungeon.reversePath(pathToExit);
      
      if (exploreExitPath.length > 0) {
        success = this.moveCreature(dungeon, exploreExitPath[0]);
      } else {
        dungeon.automove = false;
      }
    }
    
    if (success) {
      dungeon.animations.push({ type: "playermove", direction: explorepath[0] });
    }
    
    return success;
  }
}

module.exports = {
  Player
};