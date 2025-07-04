const { Creature } = require('./creature.js');
const { Item } = require('./item.js');

class Humanoid extends Creature {
  constructor(type, position, equipment, inventory) {
    super(type, position);
    this.inventory = inventory ? inventory : [];
    this.equipment = equipment ? equipment : {
      weapon: false,
      ring: false,
      cloak: false,
      armour: false,
      helmet: false,
      gloves: false,
      shield: false
    };
    this.maxmana = 12;
    this.hp = parseInt(this.maxhp);

    this.giverepetoire();
    if (this.equipment.weapon==false) this.giveequipment();
  }

  pickup(dungeon) {
    let success = false;
    let exhausted = false;
    const itemLocation = this.position;
    if (dungeon.items[itemLocation]?.length > 0) {
      let stackIndex = 0;
      while (!success) {
        if (!dungeon.items[itemLocation][stackIndex]) {
          break;
        }
        const item = dungeon.items[itemLocation][stackIndex];
        if (item.carryable) {
          this.inventory.push(item);
          this.waiting = false;
          dungeon.items[itemLocation].splice(stackIndex, 1);
          if (dungeon.items[itemLocation].length === 0) {
            delete dungeon.items[itemLocation];
          }
          success = true;
        }
        stackIndex++;
      }
    }
    return success;
  }

  drop(dungeon, invpos) {
    let success = false;
    const itemLocation = this.position;
    if (this.inventory[invpos]) {
      const item = this.inventory[invpos];
      dungeon.items[itemLocation] = dungeon.items[itemLocation] || [];
      dungeon.items[itemLocation].push(Object.assign({}, item));
      this.waiting = false;
      this.inventory.splice(invpos, 1);
      success = true;
    }
    return success;
  }

  useItem(inventoryslot) {
    let success = false;
    if (this.inventory[inventoryslot]) {
      const item = this.inventory[inventoryslot];
      if (item.category === 'consumable') {
        if (item.affects) {
          const modifying = item.affects;
          for (const stat in modifying) {
            this[stat] += parseInt(modifying[stat]);
			if (stat === 'hp' && this.hp > this.maxhp) {
              this.hp = this.maxhp;
            }
          }
        }
        this.inventory.splice(inventoryslot, 1);
      } else if (item.category === 'equipment') {
        this.wear(inventoryslot);
      }
      success = true;
    }
    return success;
  }

  wear(invpos) {
    let success = false;
    if (this.inventory[invpos] && this.inventory[invpos].category === 'equipment') {
      const eqSlot = this.inventory[invpos].itemclass;
      if (eqSlot) {
        if (this.equipment[eqSlot]) {
          this.rem(eqSlot);
        }
        const modifying = this.inventory[invpos].affects;
        if (this.inventory[invpos].itemclass === 'ring') {
          for (const stat in modifying) {
            if (stat === 'hp' && this.hp > this.maxhp) {
              this.hp = this.maxhp;
            }
            this[stat] += parseInt(modifying[stat]);
          }
        }
        this.equipment[eqSlot] = Object.assign({}, this.inventory[invpos]);
        this.inventory.splice(invpos, 1);
        success = true;
      }
    }
    return success;
  }

  rem(eqslot) {
    let success = false;
    if (this.equipment[eqslot]) {
      this.inventory.push(Object.assign({}, this.equipment[eqslot]));
      const modifying = this.equipment[eqslot].affects;
      if (this.equipment[eqslot].itemclass === 'ring') {
        for (const stat in modifying) {
          if (stat === 'hp' && this.hp < 1) {
            this.hp = 1;
          }
          this[stat] -= parseInt(modifying[stat]);
        }
      }
      this.equipment[eqslot] = false;
      success = true;
    }
    return success;
  }

  dropAll(dungeon) {
    for (const slot in this.equipment) {
      if (this.equipment[slot] !== false) {
        this.rem(slot);
      }
    }
    while (this.inventory.length > 0) {
      this.drop(dungeon, 0);
    }
  }

	giveequipment() {
	  if (this.equipment.weapon == false) {
		  let weapontype;
		  if (this.creatureset === "goblinoid") {
			const weapontypes = ["spear", "knife", "handaxe", "spetum", "waraxe", "mace", "billhook", "broadsword"];
			let weapontypeIndex = Math.floor(Math.random() * (Math.min(this.level, 7) + Math.floor(this.level / 3)));
			weapontype = weapontypes[weapontypeIndex];
			
			if (this.creaturetype === "goblinshaman" || this.creaturetype === "orcshaman") {
			  weapontype = "staff";
			}
		  } else if (this.creatureset === "demonic") {
			const weapontypes = ["demonsword", "demonwhip", "demontrident"];
			
			if (this.creaturetype === "demon") {
			  weapontype = "demontrident";
			} else {
			  let weapontypeIndex = Math.floor(Math.random() * 2);
			  weapontype = weapontypes[weapontypeIndex];
			}
		  } else if (this.creatureset === "undead") {
			const weapontypes = ["spetum", "mace", "billhook"];
			let weapontypeIndex = Math.floor(Math.random() * 3);
			weapontype = weapontypes[weapontypeIndex];
		  }
		  if (typeof(weapontype)!='undefined'){
			  this.inventory[0] = new Item("weapon", weapontype);
			  if (!this.inventory[0].setQuality()) {
				this.inventory[0].setEnchant(this.level);
			  }
			  this.wear(0);
		  }
		}
	}
}

module.exports = {
  Humanoid
};