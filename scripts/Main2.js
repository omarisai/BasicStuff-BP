import { system, EnchantmentList, EnchantmentType, MinecraftEnchantmentTypes, Enchantment, ItemTypes, EntityQueryOptions, world, BlockLocation, Location, ItemStack, MinecraftItemTypes } from '@minecraft/server';
import { Enchantments } from "classes/Enchantments.js";

const forbiddenItems = ["bps", "shulker_box"];
let globalTick = 0;
let tempStorage = [];
let inital_bp_setup = true;
let hub_loc;
const dimensions = ['overworld', 'nether', 'the_end'];

system.events.beforeWatchdogTerminate.subscribe((eventData) => {
	eventData.cancel = true;
});


world.events.effectAdd.subscribe(async (eventData) => {
	try {
		let amp = eventData.effect.amplifier;
		let dur = eventData.effect.duration;
		let effectCode = '' + amp + dur;
		if (effectCode == '840') {
			let entity = eventData.entity;
			let entityTagID = entity.getTags().filter(tag => tag.includes('bps_id'));
			let limit = 5;
			let itemCount = 0;
			let itemLore = [];
			let backpackInv = entity.getComponent(`inventory`).container;
			for (let slot = 0; backpackInv.size > slot; slot++) {
				let item = backpackInv.getItem(slot);
				if (!item) continue;
				if (forbiddenItems.filter(forbiddenItem => item.typeId.includes(forbiddenItem)).length) {
					entity.dimension.spawnItem(item, new Location(entity.location.x, entity.location.y, entity.location.z));
					backpackInv.setItem(slot, new ItemStack(ItemTypes.get("minecraft:barrier"), 0, 0));
					continue;
				}
				let itemName = item.typeId;
				let newName = '';
				let charArr;
				let itemNameArray;
				try {
					itemName = itemName.split(':')[1];
					itemNameArray = itemName.split('_');
				} catch (e) {
					continue;
				}
				for (let word of itemNameArray) {
					charArr = Array.from(word);
					charArr[0] = charArr[0].toUpperCase();
					newName += charArr.join("") + " ";
				}
				itemLore.push(`§7${newName}x${item.amount}`);
				itemCount++;
				if (itemCount > (backpackInv.size - backpackInv.emptySlotsCount)) break;
			}
			backpackInv = entity.getComponent(`inventory`).container;
			let eQuery = { tags: [entityTagID[0]], type: "bps:container_entity_new" }
			let getBpMain = Array.from(world.getDimension(`overworld`).getEntities(eQuery));
			let mainInv = getBpMain[0].getComponent(`inventory`).container;
			updateMainBp(backpackInv, mainInv);

			//Update backpack item inside player inventory
			let playerOwner = getOwnerPlayer(entity.dimension, entity.location);
			if (!playerOwner) return;
			let playerInv = playerOwner.getComponent(`inventory`).container;
			for (let slot = 0; 9 > slot; slot++) {
				let bpItem = playerInv.getItem(slot);
				if (!bpItem) continue;
				if (bpItem.typeId.includes('bp')) {
					let idLore = bpItem.getLore().filter(tag => tag.includes('bps'));
					if (idLore[0] == entityTagID[0]) {
						itemLore.unshift(idLore[0]);
						if (itemCount >= 5) {
							let newLore = itemLore.slice(0, 6);
							newLore[6] = "§7and " + (itemCount - 5) + " more...";
							bpItem.setLore(newLore);
							playerInv.setItem(slot, bpItem);
						} else {
							bpItem.setLore(itemLore);
							playerInv.setItem(slot, bpItem);
						}
					}
				}
			}
		}
	} catch (e) {
		world.getDimension(`overworld`).runCommandAsync(`say [Backpack+] ${e}`);
	}
});

system.run(async function tick(eventData) {
	system.run(tick);
	globalTick++;
	try {
		//if(eventData.currentTick%2 != 0) return;
		if (globalTick % 40 == 0) world.getDimension(`overworld`).runCommandAsync(`event entity @e[type=bps:container_entity_temp] timeout`);


		let eQuery = { type: 'bps:container_entity_new' }
		let eQuery2 = { type: 'bps:bp_central' }
		let bp = Array.from(world.getDimension('overworld').getEntities(eQuery));
		let bp_central = Array.from(world.getDimension('overworld').getEntities(eQuery2));
		let playerList = "";


		for (let player of Array.from(world.getPlayers())) {
			playerList = playerList + '§e' + player.name + "\n";
		}
		for (let bag of bp) {
			if (bag.getComponent('minecraft:health').current <= 1) {
				bag.runCommand(`event entity @s reset_health`);
				bag.getComponent('minecraft:health').setCurrent(9);
				let noticeItem = new ItemStack(ItemTypes.get('minecraft:paper'), 1, 0);
				noticeItem.nameTag = `This backpack has been killed using /kill\nLast Players Online: \n${playerList}`;
				bag.getComponent('inventory').container.addItem(noticeItem);
			}
		}

		let players = Array.from(world.getPlayers());
		for (let player of players) {

			if (inital_bp_setup && player.dimension.id.includes(`overworld`)) {
				inital_bp_setup = false;
				await initial_setup(player.location);
			} else if (inital_bp_setup && bp_central.length > 0) {
				inital_bp_setup = false;
				await initial_setup(player.location);
			}

			if (inital_bp_setup && (globalTick % 60 == 0)) {
				world.getDimension(`overworld`).runCommandAsync(`say "[Backpack+] §cInitial Setup Fail."`);
			}
			if (inital_bp_setup) {
				continue;
			}


			let playerTags = player.getTags();
			let playerInv = player.getComponent(`inventory`).container;
			let getBackpack = player.getComponent(`inventory`).container.getItem(player.selectedSlot);


			//Remove tag if empty slot
			if (!getBackpack) {
				player.removeTag(`open_bps`);
				let slotTag = player.getTags().filter(tag => tag.includes('bps_slot'));
				let bpId = player.getTags().filter(tag => tag.includes('bps_id'));
				if (slotTag.length <= 0) continue;
				let bpsTags = player.getTags().filter(tag => tag.includes('bps'));
				if (slotTag.length > 0) {
					//player.runCommandAsync("say dropped");
					//let oldSlotBP = playerInv.getItem(parseInt(slotTag[0].split(':')[1]));
					//let slotBP = parseInt(slotTag[0].split(':')[1]);
					drop_closeBackPack(player, bpId[0]);
					player.removeTag(bpId[0]);
					player.removeTag(slotTag[0]);
					//for(let tag of bpsTags){
					//	player.removeTag(tag);
					//}
					//if (!oldSlotBP) return;
					//unlockBackPack(player,oldSlotBP,slotBP);
				}
				continue;
			}
			let bpsTag = Array.from(player.getTags()).filter(tag => tag.includes(`open_bps`));
			let bpSize;
			let switchBP = '';
			switch (getBackpack.typeId) {
				case "bps:backpack_xl":
					var pId = player.getTags().filter(tag => tag.includes(`bps_id`));
					switchBP = getBackpack.getLore()[0];
					if (switchBP != pId) {
						closeBackPack(player);
					}
					if (switchBP) player.addTag(switchBP);
					bpSize = "xl";
					mainBackpack(bpSize, getBackpack.typeId, bpsTag, player, getBackpack);
					break;

				case "bps:backpack_medium":

					var pId = player.getTags().filter(tag => tag.includes(`bps_id`));
					switchBP = getBackpack.getLore()[0];
					if (switchBP != pId) {
						closeBackPack(player);
					}
					if (switchBP) player.addTag(switchBP);
					bpSize = "medium";
					mainBackpack(bpSize, getBackpack.typeId, bpsTag, player, getBackpack);
					break;

				case "bps:backpack_big":

					var pId = player.getTags().filter(tag => tag.includes(`bps_id`));
					switchBP = getBackpack.getLore()[0];
					if (switchBP != pId) {
						closeBackPack(player);
					}
					if (switchBP) player.addTag(switchBP);
					bpSize = "big";
					mainBackpack(bpSize, getBackpack.typeId, bpsTag, player, getBackpack);
					break;

				case "bps:backpack":

					var pId = player.getTags().filter(tag => tag.includes(`bps_id`));
					switchBP = getBackpack.getLore()[0];
					if (switchBP != pId) {
						closeBackPack(player);
					}
					if (switchBP) player.addTag(switchBP);
					bpSize = "small";
					mainBackpack(bpSize, getBackpack.typeId, bpsTag, player, getBackpack);
					break;

				default:
					closeBackPack(player);
			}
		}
	} catch (e) {
		world.getDimension(`overworld`).runCommandAsync(`say ${e} - tick"`);
	}
})

async function initial_setup(location) {
	await wait(60);
	const eQuery = { type: 'bps:container_entity_new', excludeTags: ['main_bp'] }
	const eQuery2 = { type: 'bps:bp_central' }
	let backpacks = Array.from(world.getDimension('overworld').getEntities(eQuery));
	let bp_hub = Array.from(world.getDimension('overworld').getEntities(eQuery2));

	return new Promise(resolve => {
		if (bp_hub.length <= 0) {
			const newLocation = new Location(location.x, -64, location.z);
			let bpCentralEntity = world.getDimension('overworld').spawnEntity(`bps:bp_central`, newLocation);
			bpCentralEntity.nameTag = "BP CENTRAL";
			bpCentralEntity.runCommandAsync(`tp @e[type=bps:container_entity_new] @s`);
			bpCentralEntity.runCommandAsync(`say "[Backpack+] §eInitial Setup Complete."`);
			hub_loc = new Location(Math.floor(bpCentralEntity.location.x), Math.floor(bpCentralEntity.location.y), Math.floor(bpCentralEntity.location.z));
		} else {
			hub_loc = new Location(Math.floor(bp_hub[0].location.x), Math.floor(bp_hub[0].location.y), Math.floor(bp_hub[0].location.z));
			bp_hub[0].runCommandAsync(`tp @e[type=bps:container_entity_new] @s`);
			bp_hub[0].runCommandAsync(`event entity @e[type=bps:container_entity_temp] timeout`);
		}

		if (backpacks.length <= 0) return;

		for (let bp of backpacks) {
			let inv_size = bp.getComponent('inventory').container.size;
			if (inv_size == 16) bp.nameTag = 'Small Backpack';
			if (inv_size == 32) bp.nameTag = 'Medium Backpack';
			if (inv_size == 42) bp.nameTag = 'Big Backpack';
			if (inv_size == 63) bp.nameTag = 'XL Backpack';
		}
		resolve();
	});
}

function getOwnerPlayer(dimension, location) {
	let eQuery = { type: 'minecraft:player', location: location, closest: 1 }
	let player = Array.from(dimension.getEntities(eQuery));
	if (player.length > 0) {
		return player[0];
	} else {
		return false;
	}
}

function drop_closeBackPack(player, bpTag) {
	return new Promise((resolve) => {
		let eQuery = { tags: [bpTag], type: "bps:container_entity_new" }
		let eQuery2 = { tags: [bpTag], type: "bps:container_entity_temp" }
		let getBpMain = Array.from(world.getDimension(`overworld`).getEntities(eQuery));
		let getBpTemp = Array.from(world.getDimension(`overworld`).getEntities(eQuery2));
		let tempInv = getBpTemp[0].getComponent(`inventory`).container;
		let mainInv = getBpMain[0].getComponent(`inventory`).container;
		for (let index = 0; index < tempInv.size; index++) {
			let item = tempInv.getItem(index);
			if (!item) continue;
			if (item.typeId.includes("bps:")) {
				player.dimension.spawnItem(item, new Location(player.location.x, player.location.y, player.location.z));
				tempInv.setItem(index, new ItemStack(ItemTypes.get("minecraft:apple"), 0, 0));
			}
		}
		tempInv = getBpTemp[0].getComponent(`inventory`).container;
		updateMainBp(tempInv, mainInv);
		player.runCommandAsync(`event entity @e[type=bps:container_entity_temp,tag="${bpTag}"] despawn2`);
		resolve();
	});
}

function closeBackPack(player) {
	return new Promise((resolve) => {
		player.removeTag(`open_bps`);
		let slotTag = player.getTags().filter(tag => tag.includes('bps_slot'));
		let idTag = player.getTags().filter(tag => tag.includes('bps_id'));
		if (slotTag.length > 0) {
			let playerInv = player.getComponent(`inventory`).container;
			let oldSlotBP = playerInv.getItem(parseInt(slotTag[0].split(':')[1]));
			let slotBP = parseInt(slotTag[0].split(':')[1]);
			let oldBPID = oldSlotBP.getLore()[0];
			let bpsTags = player.getTags().filter(tag => tag.includes('bps'));
			for (let tag of bpsTags) {
				player.removeTag(tag);
			}
			//unlockBackPack(player,oldSlotBP,slotBP);
			let eQuery = { tags: [idTag[0]], type: "bps:container_entity_new" }
			let eQuery2 = { tags: [idTag[0]], type: "bps:container_entity_temp" }
			let getBpMain = Array.from(world.getDimension(`overworld`).getEntities(eQuery));
			let getBpTemp = Array.from(world.getDimension(`overworld`).getEntities(eQuery2));
			let tempInv = getBpTemp[0].getComponent(`inventory`).container;
			let mainInv = getBpMain[0].getComponent(`inventory`).container;
			updateMainBp(tempInv, mainInv);
			player.runCommandAsync(`event entity @e[type=bps:container_entity_temp,tag="${oldBPID}"] despawn2`);
			//player.runCommandAsync(`execute @s[tag=bps_portal] ~ ~ ~ tp @e[type=bps:container_entity_new] ~ 127 ~`);		
		}
		resolve();
	});
}

function avoidDuplicateID(id) {
	let alphabetAdd = ["A", "C", "D", "E", "F", "G", "H", "I", "J"];
	let eQuery = { type: `bps:container_entity_new` }
	let entitiesEnd = Array.from(world.getDimension(`overworld`).getEntities(eQuery));
	let entitiesNether = Array.from(world.getDimension(`overworld`).getEntities(eQuery));
	let entities = Array.from(world.getDimension(`overworld`).getEntities(eQuery));
	entities.concat(entitiesNether);
	entities.concat(entitiesEnd);
	for (let entity of entities) {
		let tags = entity.getTags();
		for (let tag of tags) {
			if (tag == id) {
				return "bps_id:" + alphabetAdd[Math.floor(Math.random() * 7)] + alphabetAdd[Math.floor(Math.random() * 7)] + Math.floor(Math.random() * 10000);
			}
		}
	}
	return id;
}

async function mainBackpack(bpSize, bpId, bpsTag, player, getBackpack) {
	if (getBackpack.getLore().length <= 0 || getBackpack.getLore()[0].includes('bps')) {
		let backPackUID = getBackpack.getLore()[0];
		if (bpsTag.length <= 0) {
			try {
				let backpackItemLore = getBackpack.getLore();
				if (backpackItemLore.length > 0) {
					player.addTag(`open_bps`);
					player.addTag(`bps_slot:${player.selectedSlot}`);
					//lockBackPack(player,getBackpack);
					try {
						setupBackpackTempInventory(backPackUID, player.dimension, player.location, bpSize);
					} catch (e) {
						player.runCommandAsync(`tellraw @s {"rawtext":[{"text":"[Backpack+] §c${e}."}]}`);
						return;
					}
				} else {
					let newBackPack = backpackSetup(getBackpack);
					player.getComponent(`inventory`).container.setItem(player.selectedSlot, newBackPack);
					//lockBackPack(player,getBackpack);
					backPackUID = newBackPack.getLore()[0];
					setupBackpackInventory(backPackUID, player.dimension, player.location, bpSize);
				}

			} catch (e) {
				world.getDimension(`overworld`).runCommandAsync(`say ${e}`);
			}
		} else {

			player.runCommandAsync(`execute @s ~ ~ ~ detect ~ ~ ~ portal -1 tag @s add bps_portal`);
			player.runCommandAsync(`execute @s ~ ~ ~ detect ~ ~ ~ end_portal -1 tag @s add bps_portal`);
			player.runCommandAsync(`event entity @e[type=bps:container_entity_temp,tag="${backPackUID}"] timeout`);
			player.runCommandAsync(`execute @s ~ ~ ~ tp @e[type=bps:container_entity_temp,tag="${backPackUID}"] ~ ~1.5 ~`);
			player.runCommandAsync(`execute @s[tag=bps_portal] ~ ~ ~ event entity @e[type=bps:container_entity_temp,tag="${backPackUID}"] despawn2`);
			player.runCommandAsync(`execute @s ~ ~ ~ tag @s remove bps_portal`);

		}
	}
}

async function wait(ticks) {
	let t = 0;
	let currentTick = 0;
	return await new Promise(resolve => {

		system.run(async function tick(eventData) {
			currentTick++;
			if (currentTick <= ticks) {
				resolve();
				return;
			} else {
				system.run(tick);
			}
		});
	});
}

async function bpTp(player, backPackUID) {

	let eQuery = { type: 'bps:container_entity_new', tags: [backPackUID] }
	let playerDimension = player.dimension;
	let pl = new Location(player.location.x, (player.location.y + 1.5), player.location.z);
	let pl2 = new Location(player.location.x, 0, player.location.z);
	let bpEntity;
	for (let d of dimensions) {
		bpEntity = Array.from(world.getDimension(d).getEntities(eQuery));
		if (bpEntity.length > 0) {
			bpEntity[0].runCommandAsync(`say Teleporting to ${bpEntity[0].location.x},${bpEntity[0].location.y},${bpEntity[0].location.z} in ${bpEntity[0].dimension.id}`);
			bpEntity[0].teleport(pl, playerDimension, 0, 0, false);
			return;
		}
	}

}

function backpackSetup(backpackItem) {
	let currentLore = backpackItem.getLore();
	currentLore[0] = "bps_id:" + Math.floor(Math.random() * 10000);
	currentLore[0] = avoidDuplicateID(currentLore[0]);
	backpackItem.setLore(currentLore);
	return backpackItem;
}

async function lockBackPack(player, getBackpack) {
	return new Promise((resolve) => {
		let lore = getBackpack.getLore();
		player.runCommandAsync(`replaceitem entity @s slot.weapon.mainhand 0 ${getBackpack.typeId} 1 0 {"minecraft:item_lock":{"mode":"lock_in_slot"}}`);
		getBackpack = player.getComponent(`inventory`).container.getItem(player.selectedSlot);
		getBackpack.setLore(lore);
		player.getComponent(`inventory`).container.setItem(player.selectedSlot, getBackpack);
		resolve();
	});
}

async function unlockBackPack(player, getBackpack, slot) {
	return new Promise((resolve) => {
		let lore = getBackpack.getLore();
		player.runCommandAsync(`replaceitem entity @s slot.hotbar ${slot} ${getBackpack.typeId} 1 0`);
		getBackpack = player.getComponent(`inventory`).container.getItem(slot);
		getBackpack.setLore(lore);
		player.getComponent(`inventory`).container.setItem(slot, getBackpack);
		resolve();
	});
}

function setupBackpackInventory(bpId, currentDimension, currentLocation, bpSize) {
	let backpackContainerEntity = world.getDimension(`overworld`).spawnEntity(`bps:container_entity_new`, hub_loc);
	if (bpSize == 'small') {
		backpackContainerEntity.nameTag = "Small Backpack";
	} else if (bpSize == 'medium') {
		backpackContainerEntity.nameTag = "Medium Backpack";
	} else if (bpSize == 'big') {
		backpackContainerEntity.nameTag = "Big Backpack";
	} else if (bpSize == 'xl') {
		backpackContainerEntity.nameTag = "XL Backpack";
	} else {
		backpackContainerEntity.nameTag = "Backpack";
	}
	//backpackContainerEntity.addTag(bpSize);
	backpackContainerEntity.addTag(bpId);
	backpackContainerEntity.runCommandAsync(`event entity @s ${bpSize}`);
	//Scrapped code due to dying in some servers
	//backpackContainerEntity.kill();
	//backpackContainerEntity.getComponent('minecraft:health').resetToMaxValue;
	backpackContainerEntity.runCommandAsync(`tp @s @e[type=bps:bp_central,c=1]`);
}

function setupBackpackTempInventory(bpId, currentDimension, currentLocation, bpSize) {
	let newLocation = new Location(currentLocation.x, currentLocation.y + 1.5, currentLocation.z);
	let backpackContainerEntity = currentDimension.spawnEntity(`bps:container_entity_temp`, newLocation);
	if (bpSize == 'small') {
		backpackContainerEntity.nameTag = "Small Backpack";
	} else if (bpSize == 'medium') {
		backpackContainerEntity.nameTag = "Medium Backpack";
	} else if (bpSize == 'big') {
		backpackContainerEntity.nameTag = "Big Backpack";
	} else if (bpSize == 'xl') {
		backpackContainerEntity.nameTag = "XL Backpack";
	} else {
		backpackContainerEntity.nameTag = "Backpack";
	}
	backpackContainerEntity.addTag(bpId);
	backpackContainerEntity.runCommandAsync(`event entity @s ${bpSize}`);
	backpackContainerEntity.kill();

	const eQuery = { tags: [bpId], type: "bps:container_entity_new" }
	let getBpMain = Array.from(world.getDimension(`overworld`).getEntities(eQuery));
	let tempInv = backpackContainerEntity.getComponent(`inventory`).container;
	let mainInv;
	try {
		mainInv = getBpMain[0].getComponent(`inventory`).container;
	} catch (e) {
		backpackContainerEntity.runCommandAsync(`event entity @e[tag="${bpId}",type=bps:container_entity_temp] despawn2`);
		throw "Main Backpack Unable To Be Found. Please do 'bp reset' while holding this backpack";
		return;
	}

	updateTempBp(tempInv, mainInv);
}

function updateTempBp(tempBpInv, mainBpInv) {
	for (let slot = 0; mainBpInv.size > slot; slot++) {
		let item = mainBpInv.getItem(slot);
		if (!item) continue;
		tempBpInv.setItem(slot, item);
	}
}

function updateMainBp(tempBpInv, mainBpInv) {
	try {
		for (let slot = 0; mainBpInv.size > slot; slot++) {
			mainBpInv.setItem(slot, new ItemStack(ItemTypes.get(`minecraft:barrier`), 0, 0));
		}
		for (let slot = 0; tempBpInv.size > slot; slot++) {
			let item = tempBpInv.getItem(slot);
			if (!item) continue;
			mainBpInv.setItem(slot, item);
		}
	} catch (e) {
		player.runCommandAsync(`tellraw @s {"rawtext":[{"text":"[Backpack+] §cFailed To Update Main Backpack."}]}`);
	}
}

world.events.playerLeave.subscribe((eventData) => {
	world.getDimension(`overworld`).runCommandAsync(`event entity @e[type=bps:container_entity_temp] timeout`);
});

/*
* syntax: reset bp
* syntax: bp clean <all/temps/backpack>
* syntax: bp drop <backpack id: number>
* syntax: bp view <backpack id: number>
* syntax: bp list
*/

world.events.beforeChat.subscribe((eventData) => {
	let commandArr = eventData.message.trim().split(' ');
	let command = commandArr[0] + ' ' + commandArr[1];
	switch (command) {

		case "bp clean":
			if (commandArr[2] == "all") {
				eventData.sender.runCommandAsync(`function reset`);
				eventData.sender.runCommandAsync(`tellraw @s {"rawtext":[{"text":"[Backpack+] §eSuccesfully reset the addon. Restart you world or server to begin setup again."}]}`);
			} else if (commandArr[2] == "temps") {
				eventData.sender.runCommandAsync(`event entity @e[type=bps:container_entity_temp] despawn2`);
				eventData.sender.runCommandAsync(`tellraw @s {"rawtext":[{"text":"[Backpack+] §eRemoved all temporary backpack entities."}]}`);
			} else if (commandArr[2] == "backpack") {
				eventData.sender.runCommandAsync(`event entity @e[type=bps:container_entity_new] despawn2`);
				eventData.sender.runCommandAsync(`tellraw @s {"rawtext":[{"text":"[Backpack+] §eRemoved all backpack entities."}]}`);
			} else {
				eventData.sender.runCommandAsync(`tellraw @s {"rawtext":[{"text":"[Backpack+] §a>>bp clean syntaxes<<\n-bp clean all\n-bp clean temps\n-bp clean backpack"}]}`);
			}
			eventData.cancel = true;
			break;

		case "bp reset":

			eventData.cancel = true;
			let item = eventData.sender.getComponent(`inventory`).container.getItem(eventData.sender.selectedSlot);
			if (!item) {
				eventData.sender.runCommandAsync(`tellraw @s {"rawtext":[{"text":"[Backpack+] §cMust be a backpack."}]}`);
				return;
			}
			if (!item.typeId.includes('bps')) {
				eventData.sender.runCommandAsync(`tellraw @s {"rawtext":[{"text":"[Backpack+] §cMust be a backpack."}]}`);
				return;
			}
			let bpId = item.getLore()[0];
			try {
				eventData.sender.getComponent(`inventory`).container.setItem(eventData.sender.selectedSlot, new ItemStack(ItemTypes.get('minecraft:barrier'), 0, 0));
			} catch (e) {
				eventData.sender.runCommand(`say ${e}`);
			}
			eventData.sender.runCommandAsync(`give @s ${item.typeId}`);
			try {
				eventData.sender.runCommandAsync(`event entity @e[tag="${bpId}"] despawn2`);
			} catch (e) { }
			eventData.sender.runCommandAsync(`tellraw @s {"rawtext":[{"text":"[Backpack+] §eSuccesfully reset backpack."}]}`);
			break;

		case "bp central":
			eventData.cancel = true;
			if (eventData.sender.getTags().filter(tag => tag == 'op').length <= 0) {
				eventData.sender.runCommandAsync(`tellraw @s {"rawtext":[{"text":"[Backpack+] §cMust be an OP to use this command."}]}`);
				return;
			}
			let eQuery = { type: `bps:bp_central` }
			let bpCentral = Array.from(world.getDimension(`overworld`).getEntities(eQuery));
			if (bpCentral.length > 0) {
				let bpl = bpCentral[0].location;
				eventData.sender.runCommandAsync(`tellraw @s {"rawtext":[{"text":"[Backpack+] §eBackpack Central Location: ${Math.floor(bpl.x)},${Math.floor(bpl.y)},${Math.floor(bpl.z)}"}]}`);
			} else {
				eventData.sender.runCommandAsync(`tellraw @s {"rawtext":[{"text":"[Backpack+] §cBackpack Central Location: Not Found`);
			}
			break;

		case "bp move":
			eventData.cancel = true;
			if (eventData.sender.getTags().filter(tag => tag == 'op').length <= 0) {
				eventData.sender.runCommandAsync(`tellraw @s {"rawtext":[{"text":"[Backpack+] §cMust be an OP to use this command."}]}`);
				return;
			}
			if (!eventData.sender.dimension.id.includes('overworld')) {
				eventData.sender.runCommandAsync(`tellraw @s {"rawtext":[{"text":"[Backpack+] §cThis command can only be used in the overworld."}]}`);
				return;
			}
			let pl = eventData.sender.location;
			let nl = new Location(pl.x, -64, pl.z);
			eventData.sender.runCommandAsync(`tp @e[type=bps:bp_central] ${nl.x} ${nl.y} ${nl.z}`);
			eventData.sender.runCommandAsync(`tp @e[type=bps:container_entity_new] ${nl.x} ${nl.y} ${nl.z}`);
			let eQuery2 = { type: `bps:bp_central` }
			let bpCentral2 = Array.from(world.getDimension(`overworld`).getEntities(eQuery2));
			if (bpCentral2.length > 0) {
				eventData.sender.runCommandAsync(`tellraw @s {"rawtext":[{"text":"[Backpack+] §eBackpack New Central Location: ${Math.floor(nl.x)},${Math.floor(nl.y)},${Math.floor(nl.z)}"}]}`);
			}
			break;

		case "bp update":
			eventData.cancel = true;
			oldBPUpdate(eventData).then(function (value) { });
			break;

		case "bp drop":
			eventData.cancel = true;
			if (!eventData.sender.dimension.id.includes('overworld')) {
				eventData.sender.runCommandAsync(`tellraw @s {"rawtext":[{"text":"[Backpack+] §cThis command can only be used in the overworld."}]}`);
				return;
			}
			if (eventData.sender.getTags().filter(tag => tag == 'op').length > 0) {
				let bpID = eventData.message.trim().split(` `)[2];
				if (!bpID) {
					eventData.sender.runCommandAsync(`tellraw @s {"rawtext":[{"text":"[Backpack+] §cPut a backpack id."}]}`);
					return;
				}
				let eQuery = { tags: [`bps_id:${bpID}`], type: `bps:container_entity_new`, excludeFamilies: [`player`] }
				let bp = Array.from(eventData.sender.dimension.getEntities(eQuery));
				if (bp.length > 0) {
					bp[0].runCommand(`tp @s "${eventData.sender.name}"`);
					bp[0].runCommand(`event entity @s drop`);
					eventData.sender.runCommandAsync(`tellraw @s {"rawtext":[{"text":"[Backpack+] §eSuccesfully dropped backpack contents."}]}`);
				} else {
					eventData.sender.runCommandAsync(`tellraw @s {"rawtext":[{"text":"[Backpack+] §cNo backpacks with that ID found."}]}`);
				}
			} else {
				eventData.sender.runCommandAsync(`tellraw @s {"rawtext":[{"text":"[Backpack+] §cMust be an OP to use this command."}]}`);
			}
			break;

		case "bp view":
			eventData.cancel = true;
			if (eventData.sender.getTags().filter(tag => tag == 'op').length > 0) {
				if (!commandArr[2]) {
					eventData.sender.runCommandAsync(`tellraw @s {"rawtext":[{"text":"[Backpack+] §cPut a backpack id."}]}`);
					return;
				}
				let eQuery = { type: 'bps:container_entity_new', tags: [`bps_id:${commandArr[2]}`] }
				let bp = Array.from(eventData.sender.dimension.getEntities(eQuery));
				if (bp.length > 0) {
					let itemList = "§eBackpack Items: ";
					let bpInv = bp[0].getComponent('inventory').container;
					for (let slot = 0; bpInv.size > slot; slot++) {
						let item = bpInv.getItem(slot);
						if (!item) continue;

						let itemName = item.typeId;
						let newName = '';
						let charArr;
						let itemNameArray;
						try {
							itemName = itemName.split(':')[1];
							itemNameArray = itemName.split('_');
						} catch (e) {
							continue;
						}
						for (let word of itemNameArray) {
							charArr = Array.from(word);
							charArr[0] = charArr[0].toUpperCase();
							newName += charArr.join("") + " ";
						}
						itemList = itemList + `${newName}` + " x" + `${item.amount}` + ",";
					}
					eventData.sender.runCommandAsync(`tellraw @s {"rawtext":[{"text":"[Backpack+] ${itemList}"}]}`);
				} else {
					eventData.sender.runCommandAsync(`tellraw @s {"rawtext":[{"text":"[Backpack+] §cNo backpacks with that ID found."}]}`);
				}
			} else {
				eventData.sender.runCommandAsync(`tellraw @s {"rawtext":[{"text":"[Backpack+] §cMust be an OP to use this command."}]}`);
			}
			break;

		case "bp list":
			eventData.cancel = true;
			if (eventData.sender.getTags().filter(tag => tag == 'op').length > 0) {
				let eQuery = { type: 'bps:container_entity_new' }
				let bp = Array.from(eventData.sender.dimension.getEntities(eQuery));
				let bpList = "Backpack IDs: §e";
				for (let bag of bp) {
					let id = bag.getTags()[0].split(':')[1];
					bpList = bpList + `${id}` + ',';
				}
				eventData.sender.runCommandAsync(`tellraw @s {"rawtext":[{"text":"[Backpack+] ${bpList}"}]}`);
			} else {
				eventData.sender.runCommandAsync(`tellraw @s {"rawtext":[{"text":"[Backpack+] §cMust be an OP to use this command."}]}`);
			}
			break;
	}
});

async function oldBPUpdate(eventData) {
	let resetBp = true;
	let player = eventData.sender;
	let playerInv = player.getComponent(`inventory`).container;
	let getBP = playerInv.getItem(player.selectedSlot);
	let newItem;
	if (!getBP) return;
	if (getBP.typeId.includes(`bps`)) {
		let loreItems = getBP.getLore();
		for (let lore of loreItems) {
			if (lore.includes(`bp`)) continue;
			let item = lore.replace(/§0/g, '').replace(/§5/g, '').split(';');
			try {
				newItem = new ItemStack(ItemTypes.get(item[1]), parseInt(item[3]), parseInt(item[2]));
			} catch (e) {

				continue;
			}
			if (item[4] != '0') newItem.nameTag = item[4];
			if (newItem.hasComponent('durability')) {
				for (let c = 5; c < item.length - 1; c++) {
					let enchantData = item[c].split(':');
					let enchantType = getEnchantNick(enchantData[0]);
					newItem = Enchantments.setEnchant(newItem, enchantType.id, parseInt(enchantData[1]));
				}
				try {
					newItem.getComponent('durability').damage = parseInt(item[item.length - 1]);
				} catch (e) {
					newItem.getComponent('durability').damage = 0;
				}
			} else {
				for (let c = 5; c < item.length; c++) {
					let enchantData = item[c].split(':');
					let enchantType = getEnchantNick(enchantData[0]);
					newItem = Enchantments.setEnchant(newItem, enchantType.id, parseInt(enchantData[1]));
				}
			}
			player.dimension.spawnItem(newItem, new Location(player.location.x, player.location.y, player.location.z));
		}
		if (true) {
			playerInv.setItem(player.selectedSlot, new ItemStack(ItemTypes.get(`minecraft:barrier`), 0, 0));
			try {
				player.runCommandAsync(`give @s ${getBP.typeId}`);
			} catch (e) { }
		} else {
			player.runCommandAsync(`tellraw @s {"rawtext":[{"text":"[Backpack+] §cCan't reset backpacks created in V3.1 and above."}]}`);
		}
	}
	return 0;
}