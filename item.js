const fs = require('fs');

class Item {
  constructor(itemclass, name) {
    this.category = null;
    this.itemclass = itemclass;
    this.name = name;
    this.strrep = null;
    this.affects = null;
    this.carryable = null;

    if (itemclass === "corpse") {
      this.category = "corpse";
      this.affects = null;
      this.carryable = false;
      this.strrep = `${name} ${itemclass}`;

      if (
        name === "orcslave" ||
        name === "orcsoldier" ||
        name === "orcshaman" ||
        name === "orccaptain"
      ) {
        this.name = "orc";
      }

      if (name === "goblinsoldier" || name === "goblinshaman") {
        this.name = "goblin";
      }
    } else if (itemclass === "none") {
      const info = {
        category: "none",
        affects: false,
        carryable: false,
      };

      for (const key in info) {
        this[key] = info[key];
      }

      this.strrep = "nothing";
    } else {
      const info = this.findinfo(itemclass, name);
	    
      for (const key in info) {
        this[key] = info[key];
      }

      this.carryable = true;

      if (this.category === "consumable" || this.itemclass === "ring") {
        this.strrep = `${this.itemclass} of ${this.name}`;
      } else if (this.itemclass === "weapon" || this.name === "robes") {
        this.strrep = this.name;
      } else {
        this.strrep = `${this.name} ${this.itemclass}`;
      }
    }
  }

	findinfo(itemclass, name) {
	  const itemsData = JSON.parse(fs.readFileSync('./items.json','utf-8'));
	  const foundItem = itemsData.find(obj => obj.class === itemclass && obj.name === name);
	  return foundItem || null;
	}
 
  setQuality() {
    let quality = false;

    if (this.itemclass === "weapon") {
      const rn = getRandomNumber(1, 6);

      if (rn === 6) {
        quality = true;
        this.affects.acc += 1;
        this.strrep = `well balanced ${this.strrep}`;
      }
    } else if (this.itemclass === "armour") {
      const rn = getRandomNumber(1, 5);

      if (rn === 5) {
        quality = true;
        this.affects.armour += 1;
        this.strrep = `thick ${this.strrep}`;
      }
    }

    return quality;
  }

  setEnchant(floor) {
    let enchant = false;

    if (this.itemclass === "weapon") {
      const rn = getRandomNumber(1, 5);

      if (rn === 5) {
        enchant = getRandomNumber(1, Math.ceil(floor / 3));

        for (let i = 0; i < enchant; i++) {
          let rn2 = getRandomNumber(0, 2);

          if (rn2 === 2) {
            rn2 = getRandomNumber(0, 2);
          }

          const weaponattr = ["bash", "slash", "pierce"];
          this.affects[weaponattr[rn2]]++;
        }

        this.strrep = `+${enchant} enchanted ${this.strrep}`;
      }
    } else if (this.itemclass === "armour") {
      const rn = getRandomNumber(1, 5);

      if (rn === 5) {
        enchant = getRandomNumber(1, Math.min(Math.floor(floor / 3) + 1, 4));
        this.affects.block += enchant;
        this.strrep = `+${enchant} enchanted ${this.strrep}`;
      }
    } else if (this.name === "dexterity") {
      enchant = getRandomNumber(0, floor);
      this.affects.dexterity += enchant;
      this.strrep = `+${enchant + 1} ${this.strrep}`;
    } else if (this.name === "strength") {
      enchant = getRandomNumber(0, floor);
      this.affects.strength += enchant;
      this.strrep = `+${enchant + 1} ${this.strrep}`;
    } else if (this.name === "magic") {
      enchant = getRandomNumber(0, floor);
      this.affects.maxmana += enchant;
      this.strrep = `+${enchant + 1} ${this.strrep}`;
    }

    return enchant;
  }

  setBrand() {
    const rn = getRandomNumber(1, 5);

    if (rn === 5 && this.itemclass === "weapon") {
      this.strrep = `${this.strrep} of possibility`;
    }
  }

  setego() {
    // The setego() function is empty. No implementation provided.
  }
}

function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = {
  Item
};