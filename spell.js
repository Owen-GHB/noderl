
class Spell {
  constructor(spellname) {
    this.school = null;
    this.nature = null;
    this.spellname = spellname;
    this.cost = null;
    this.level = null;
    this.power = null;

    const info = this.findinfo(spellname);

    for (const property in info) {
      if (property !== "name") {
        this[property] = info[property];
      }
    }

    this.cost = parseInt(this.cost);
    this.power = parseInt(this.power);
    this.level = parseInt(this.level);
  }

  findinfo(spellname) {
    const spells = {
      'shock': { school: 'lightning', nature: 'damage', name: 'shock', level: 1, cost: 1, power: 1 },
      'lightning': { school: 'lightning', nature: 'damage', name: 'lightning', level: 3, cost: 3, power: 3 },
      'burn': { school: 'fire', nature: 'damage', name: 'burn', level: 1, cost: 1, power: 1 },
      'fireball': { school: 'fire', nature: 'damage', name: 'fireball', level: 3, cost: 3, power: 3 },
      'chill': { school: 'frost', nature: 'damage', name: 'chill', level: 1, cost: 1, power: 1 },
      'freeze': { school: 'frost', nature: 'damage', name: 'freeze', level: 3, cost: 3, power: 3 },
      'blink': { school: 'arcane', nature: 'translocation', name: 'blink', level: 2, cost: 2, power: 2 }
    };

    return spells[spellname] || {};
  }
}

module.exports = {
  Spell
};
