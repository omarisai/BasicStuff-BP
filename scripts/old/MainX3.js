import { world } from 'mojang-minecraft';

world.events.tick.subscribe((tick) => {
    world.getDimension('overworld').runCommand(`say test`);

});
