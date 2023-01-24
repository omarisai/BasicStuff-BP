scoreboard objectives add hello_world2 dummy
scoreboard players set @a[tag=!hello_world2] hello_world2 165
scoreboard players set @a[tag=!hello_world2] hello_world2 165
scoreboard players set @a[tag=!hello_world2] hello_world2 165
tag @a add hello_world2
scoreboard players add @a[scores={hello_world2=!0}] hello_world2 -1
execute if score @s hello_world2 matches 1.. run tellraw @s {"rawtext":[{"text":"<§eiKorbon§r> Thanks for downloading the §gMore Simple Structures§f addon by §eiKorbon!§f This add-on was originally uploaded to §2MCPEDL.com, and mcaddons.org.§f Join my §eDiscord§f found on the add-on page. Checkout my §4YouTube§f channel §g@iKorbon!§f §l§cPlease do not redistribute/make your own download links.§r"}]}
gamerule commandblockoutput false
