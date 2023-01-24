# Setup
scoreboard objectives add welcome_pack dummy

scoreboard players set @a[tag=!welcome_pack] welcome_pack 2
tag @a add welcome_pack
scoreboard players add @a[scores={welcome_pack=!0}] welcome_pack -1
execute as @a at @s if score @s welcome_pack matches 1.. run loot give @s loot welcome_loot