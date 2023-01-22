import { EnchantmentList, EnchantmentType, MinecraftEnchantmentTypes, Enchantment, Items, EntityQueryOptions, world, BlockLocation, ItemStack, MinecraftItemTypes } from 'mojang-minecraft';
import { Enchantments } from "scripts/classes/Enchantments.js";

const effectCallback = world.events.effectAdd;
const entityCallback = world.events.entityCreate;

effectCallback.subscribe(effectFunction);
entityCallback.subscribe(entityCreated);

world.events.beforeItemUse.subscribe((eventData) => {

});

function entityCreated(entityData) {
	if (entityData.entity.id != "itemfilter:container") return;
	let backpackEntity = entityData.entity;
	let backpackLocation = backpackEntity.location;
	let backpackDimension = backpackEntity.dimension;
	const entityQ = new EntityQueryOptions;
	entityQ.location = backpackLocation;
	entityQ.families = ['player'];
	entityQ.closest = 1;
	let backpackOwner = Array.from(backpackDimension.getPlayers(entityQ));
	let ownerInv = backpackOwner[0].getComponent('inventory').container;
	let ownerCurrentSlot = backpackOwner[0].selectedSlot;
	backpackEntity.nameTag = "Backpack";
	let itemsDb = ownerInv.getItem(ownerCurrentSlot).getLore();
	let backpackItemBase = ownerInv.getItem(ownerCurrentSlot);


	if (!itemsDb.length) {
		//sets up a new backpack id
		let id = Math.floor(Math.random() * 10000);
		let oldName = ownerInv.getItem(ownerCurrentSlot).nameTag;
		backpackOwner[0].runCommand(`replaceitem entity @s slot.weapon.mainhand 0 ${backpackItemBase.id} 1 0 {"minecraft:item_lock":{"mode":"lock_in_slot"}}`);
		let newItem = ownerInv.getItem(ownerCurrentSlot);
		newItem.setLore([`id:${id}`]);
		newItem.nameTag = oldName;
		ownerInv.setItem(ownerCurrentSlot, newItem);
		backpackOwner[0].addTag(`id:${id}`);
		return;
	} else {
		//already have an id
		let oldName = ownerInv.getItem(ownerCurrentSlot).nameTag;
		backpackOwner[0].runCommand(`replaceitem entity @s slot.weapon.mainhand 0 ${backpackItemBase.id} 1 0 {"minecraft:item_lock":{"mode":"lock_in_slot"}}`);
		backpackItemBase = ownerInv.getItem(ownerCurrentSlot);
		backpackItemBase.setLore(itemsDb);
		backpackItemBase.nameTag = oldName;
		ownerInv.setItem(ownerCurrentSlot, backpackItemBase);
		backpackOwner[0].addTag(itemsDb[0]);
	}
	//sets the items in the backpack
	let backpackInv = backpackEntity.getComponent('inventory').container;
	for (let items2 of itemsDb) {
		if (items2.includes('id:')) continue;
		let item = items2.replace(/§0/g, '').split(';');
		let newItem = new ItemStack(Items.get(item[0]), parseInt(item[2]), parseInt(item[1]));
		if (item[3] != '0') newItem.nameTag = item[3];
		for (let c = 4; c < item.length; c++) {
			let enchantData = item[c].split(':');
			let enchantType = getEnchantNick(enchantData[0]);
			newItem = Enchantments.setEnchant(newItem, enchantType.id, parseInt(enchantData[1]))
		}
		/*
		//durability
		if(newItem.hasComponent('durability')){
newItem.getComponent('durability').damage = 10;	
		}*/
		/*
		//For Testing Purposes
		for(let compo of newItem.getComponents()){
for(let compo2 in compo){
backpackDimension.runCommand(`say "${compo2}-${compo[compo2]}"`);
	if(compo2.includes('enchantments')){
		for(let compo3 in compo[compo2]){
backpackDimension.runCommand(`say --${compo3}`);
		}
	}
}
		}*/

		backpackInv.addItem(newItem);
	}

}

function enchant(itemStack) {
	const eCompo = itemStack.getComponent("minecraft:enchantments");
	const enchantments = eCompo.enchantments;
	const enchant = enchantments.addEnchantment(new Enchantment(MinecraftEnchantmentTypes.sharpness, 1));
	eCompo.enchantments = enchantments;
	return itemStack;
}

function effectFunction(effectData) {
	if (effectData.effect.displayName == 'Nausea' && effectData.effect.amplifier == 11) {
		if (effectData.entity.id != "itemfilter:container") return;
		let backpackEntity = effectData.entity;
		let backpackLocation = backpackEntity.location;
		let backpackDimension = backpackEntity.dimension;
		const entityQ = new EntityQueryOptions;
		entityQ.location = backpackLocation;
		entityQ.families = ['player'];
		entityQ.closest = 1;
		let backpackOwner = Array.from(backpackDimension.getPlayers(entityQ));
		let ownerInv = backpackOwner[0].getComponent('inventory').container;
		let backpackInv = backpackEntity.getComponent('inventory').container;
		let backpackDb = [];
		backpackOwner[0].runCommand(`gamerule sendcommandfeedback false`);
		backpackOwner[0].runCommand(`tp ${backpackLocation.x} ${backpackLocation.y - 1.5} ${backpackLocation.z}`);
		backpackOwner[0].runCommand(`gamerule sendcommandfeedback true`);
		backpackOwner[0].runCommand(`title @s actionbar Backpack Close`);
		for (let slot = 0; slot < backpackInv.size; slot++) {
			let item = backpackInv.getItem(slot);
			if (!item) continue;

			//check for equipments armor
			if (item.id.includes('chestplate') || item.id.includes('helmet') || item.id.includes('leggings') || item.id.includes('boots') || item.id.includes('elytra') || item.id.includes('on_a_stick') || item.id.includes('steel') || item.id.includes('backpack')) {
				backpackDimension.spawnItem(item, backpackLocation);
				continue;
			}
			//check for equipments non-armor
			if (item.id.includes('sword') || item.id.includes('hoe') || item.id.includes('axe') || item.id.includes('shovel') || item.id.includes('bow') || item.id.includes('shield') || item.id.includes('shovel') || item.id.includes('rod') || item.id.includes('shears') || item.id.includes('trident')) {
				backpackDimension.spawnItem(item, backpackLocation);
				continue;
			}
			//This is temporary until they add durability component for vanilla equipments
			//Checks for non-vanilla items that has durability
			if (item.hasComponent('durability')) {
				backpackDimension.spawnItem(item, backpackLocation);
				continue;
			}

			let itemFormat = item.id + ';§0' + item.data + ';' + item.amount;
			if (item.nameTag) {
				itemFormat = itemFormat + ';' + item.nameTag;
			} else {
				itemFormat = itemFormat + ';' + '0';
			}
			//save enchants
			let enchants = Enchantments.getEnchants(item);
			for (let enchant of enchants) {
				itemFormat = itemFormat + ';' + `${setEnchantNick(enchant)}:${enchant.level}`;
			}


			/*
			let durability = null;
				if(item.hasComponent('durability')){
		durability = item.getComponent('durability').damage;
		itemFormat = itemFormat + ';' + durability;	
				}
				
				
				for(let compo in item.getComponents()){
				for(let compo2 in item.getComponents()[compo]){
		world.getDimension(`overworld`).runCommand(`say ${compo} - ${compo2}`);
				}
				}
			*/

			backpackDb.push(itemFormat);
		}
		//---	

		let ownerIdTag = backpackOwner[0].getTags().find(tag => tag.includes('id:'));
		for (let slot = 0; slot < ownerInv.size; slot++) {
			let oldName;
			let item = ownerInv.getItem(slot);
			if (!item) continue;
			if (!item.getLore().length) continue;
			if (item.getLore().find(id => id.includes('id:')) == ownerIdTag) {
				if (ownerInv.getItem(slot).nameTag) {
					oldName = ownerInv.getItem(slot).nameTag;
				}
				backpackDb.unshift(ownerIdTag);
				//--unlock bag
				let newBackpack = new ItemStack(Items.get(item.id), 1, 0);
				newBackpack.setLore(backpackDb);
				newBackpack.nameTag = oldName;
				backpackOwner[0].getComponent('inventory').container.setItem(slot, newBackpack);
				backpackOwner[0].removeTag(ownerIdTag);
			}
		}
		//---

	}
}
function setEnchantNick(enchantType) {
	let enchantId = enchantType.type.id;

	switch (enchantId) {
		case 'aquaAffinity':
			return 'aa';
			break;

		case 'baneOfArthropods':
			return 'boa';
			break;

		case 'binding':
			return 'b';
			break;

		case 'blastProtection':
			return 'bp';
			break;

		case 'channeling':
			return 'c';
			break;

		case 'depthStrider':
			return 'ds';
			break;

		case 'efficiency':
			return 'ef';
			break;

		case 'featherFalling':
			return 'ff';
			break;

		case 'fireAspect':
			return 'fa';
			break;

		case 'fireProtection':
			return 'fp';
			break;

		case 'flame':
			return 'f';
			break;

		case 'fortune':
			return 'fo';
			break;

		case 'frostWalker':
			return 'fw';
			break;

		case 'impailing':
			return 'i';
			break;

		case 'infinity':
			return 'in';
			break;

		case 'knockback':
			return 'kb';
			break;

		case 'looting':
			return 'l';
			break;

		case 'loyalty':
			return 'lo';
			break;

		case 'luckOfTheSea':
			return 'los';
			break;

		case 'lure':
			return 'lu';
			break;

		case 'mending':
			return 'm';
			break;

		case 'multishot':
			return 'ms';
			break;

		case 'piercing':
			return 'pi';
			break;

		case 'power':
			return 'po';
			break;

		case 'projectileProtection':
			return 'pp';
			break;

		case 'protection':
			return 'p';
			break;

		case 'punch':
			return 'pu';
			break;

		case 'quickCharge':
			return 'qc';
			break;

		case 'respiration':
			return 'r';
			break;

		case 'riptide':
			return 'rt';
			break;

		case 'sharpness':
			return 'sh';
			break;

		case 'silkTouch':
			return 'st';
			break;

		case 'smite':
			return 'sm';
			break;

		case 'soulSpeed':
			return 'ss';
			break;

		case 'thorns':
			return 't';
			break;

		case 'unbreaking':
			return 'u';
			break;

		case 'vanishing':
			return 'v';
			break;

		default:
			throw 'Nick Error';
	}
}

function getEnchantNick(eNick) {
	switch (eNick) {
		case 'aa':
			return MinecraftEnchantmentTypes.aquaAffinity;
			break;

		case 'boa':
			return MinecraftEnchantmentTypes.baneOfArthropods;
			break;

		case 'b':
			return MinecraftEnchantmentTypes.binding;
			break;

		case 'bp':
			return MinecraftEnchantmentTypes.blastProtection;
			break;

		case 'c':
			return MinecraftEnchantmentTypes.channeling;
			break;

		case 'ds':
			return MinecraftEnchantmentTypes.depthStrider;
			break;

		case 'ef':
			return MinecraftEnchantmentTypes.efficiency;
			break;

		case 'ff':
			return MinecraftEnchantmentTypes.featherFalling;
			break;

		case 'fa':
			return MinecraftEnchantmentTypes.fireAspect;
			break;

		case 'fp':
			return MinecraftEnchantmentTypes.fireProtection;
			break;

		case 'f':
			return MinecraftEnchantmentTypes.flame;
			break;

		case 'fo':
			return MinecraftEnchantmentTypes.fortune;
			break;

		case 'fw':
			return MinecraftEnchantmentTypes.frostWalker;
			break;

		case 'i':
			return MinecraftEnchantmentTypes.impaling;
			break;

		case 'in':
			return MinecraftEnchantmentTypes.infinity;
			break;

		case 'kb':
			return MinecraftEnchantmentTypes.knockback;
			break;

		case 'l':
			return MinecraftEnchantmentTypes.looting;
			break;

		case 'lo':
			return MinecraftEnchantmentTypes.loyalty;
			break;

		case 'los':
			return MinecraftEnchantmentTypes.luckOfTheSea;
			break;

		case 'lu':
			return MinecraftEnchantmentTypes.lure;
			break;

		case 'm':
			return MinecraftEnchantmentTypes.mending;
			break;

		case 'ms':
			return MinecraftEnchantmentTypes.multishot;
			break;

		case 'pi':
			return MinecraftEnchantmentTypes.piercing;
			break;

		case 'po':
			return MinecraftEnchantmentTypes.power;
			break;

		case 'pp':
			return MinecraftEnchantmentTypes.projectileProtection;
			break;

		case 'p':
			return MinecraftEnchantmentTypes.protection;
			break;

		case 'pu':
			return MinecraftEnchantmentTypes.punch;
			break;

		case 'qc':
			return MinecraftEnchantmentTypes.quickCharge;
			break;

		case 'r':
			return MinecraftEnchantmentTypes.respiration;
			break;

		case 'rt':
			return MinecraftEnchantmentTypes.riptide;
			break;

		case 'sh':
			return MinecraftEnchantmentTypes.sharpness;
			break;

		case 'st':
			return MinecraftEnchantmentTypes.silkTouch;
			break;

		case 'sm':
			return MinecraftEnchantmentTypes.smite;
			break;

		case 'ss':
			return MinecraftEnchantmentTypes.soulSpeed;
			break;

		case 't':
			return MinecraftEnchantmentTypes.thorns;
			break;

		case 'u':
			return MinecraftEnchantmentTypes.unbreaking;
			break;

		case 'v':
			return MinecraftEnchantmentTypes.vanishing;
			break;

		default:
			throw 'Nick Error';
	}
}

function tagToJson(myJson) {
	myJson = myJson.replace(/28-/gi, '');
	myJson = myJson.replace(/zx/gi, '"');
	myJson = myJson.replace(/xz/gi, ',');
	return JSON.parse(myJson);
}

function jsonToTag(newTag) {
	newTag = JSON.stringify(newTag)
	newTag = newTag.replace(/["]/gi, 'zx');
	newTag = newTag.replace(/[,]/gi, 'xz');
	newTag = "28-" + newTag;
	return newTag;
}