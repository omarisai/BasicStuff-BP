execute at @e[type=bps:container_entity_temp] as @p[r=2,c=1] run tag @e[c=1,type=bps:container_entity_temp] add active
event entity @e[type=bps:container_entity_temp,tag=!active] despawn2
tag @e[type=bps:container_entity_temp] remove active