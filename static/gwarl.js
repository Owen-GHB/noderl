import { runCommand, getsquarecontents, getnexttarget, parsedata, drawUIskin } from './util.js';
import { updategame, animationcycle } from './animation.js';
import { drawportrait } from './draw.js';

export const globalState = {
	waiting: false
};
var showanimations=true; // Assuming these are still module-level globals for now, not shared.
var interrupt=false;   // Or if they need sharing, they'd also go into globalState.

document.addEventListener('DOMContentLoaded', function(){
	var mapsize=612;
	var radius=8;
	var tilesize=Math.floor(mapsize/(2*radius+1));
	var input;
	var lastoutputs;
	var casting=false;
	var opentab="items";

	function refreshgame(outputs,lastoutput,lastinput){
		//main update sequence called from animate
		var ctx = document.getElementById("map").getContext("2d");
		outputs=animationcycle(outputs,lastoutput,ctx,mapsize,radius,opentab);
		if (outputs.clear&&interrupt==false&&typeof(lastinput)!='undefined'){
			ctx.font = "12px";
			ctx.fillStyle = "#C0C0C0";
			ctx.fillText("Waiting for server",0,10);
			runCommand(lastinput.command, lastinput.modifier).then(data => {
				if (data === null) return; // Error handled in postData
				var output=parsedata(data);
				lastoutputs=refreshgame(output,outputs,lastinput);
			}).catch(error => console.error('Fetch error:', error));
		}
		return outputs;
	}
	document.addEventListener('keydown',function(e){
		e.preventDefault();
		if (!gameState.waiting){
			var keycode = e.which;        
			var move=false;
			switch (keycode) {
				case 97:
					move={command:"move",modifier:1};
					break;
				case 98:
				case 40:
					move={command:"move",modifier:2};
					break;
				case 99:
					move={command:"move",modifier:3};
					break;
				case 100:
				case 37:
					move={command:"move",modifier:4};
					break;
				case 101:
					move={command:"move",modifier:5};
					break;
				case 102:
				case 39:
					move={command:"move",modifier:6};
					break;
				case 103:
					move={command:"move",modifier:7};
					break;
				case 104:
				case 38:
					move={command:"move",modifier:8};
					break;
				case 105:
					move={command:"move",modifier:9};
					break;
				case 82:
					move={command:"wait",modifier:100};
					break;
				case 69:
					move={command:"moveto",modifier:"explore"};
					break;
				case 70:
					if (!lastoutputs || !lastoutputs.creatures) return; // Guard clause
					let target=getnexttarget(lastoutputs.creatures,radius);
					if (target!=false) {
						move={command:"moveto",modifier:target};
					} else {
						lastoutputs.movelog=["No creature in view"];
						updategame(lastoutputs,mapsize,radius,opentab);
					}
					break;
				case 71:
						move={command:"pickup",modifier:0};
				case 67: // Cast spell
					if (!lastoutputs || !lastoutputs.creatures) return; // Guard clause
					let target_cast=getnexttarget(lastoutputs.creatures,radius); // Renamed to avoid conflict if G key isn't pressed
					if (target_cast!=false) {
						input={"spell":casting,"x":target_cast.x,"y":target_cast.y};
						move={command:"cast",modifier:input};
					} else {
						lastoutputs.movelog=[];
						updategame(lastoutputs,mapsize,radius,opentab);
					}
					break;
				default:
					break;
			}
			if (move!=false) {
				gameState.waiting=true;
				var ctx = document.getElementById("map").getContext("2d");
				ctx.font = "12px";
				ctx.fillStyle = "#C0C0C0";
				ctx.fillText("Waiting for server",0,10);
				runCommand(move.command, move.modifier).then(data => {
					if (data === null) return;
					var output=parsedata(data);
					lastoutputs=refreshgame(output,lastoutputs,move);
				}).catch(error => console.error('Fetch error:', error));
			}
		}
	});
	document.getElementById("map").addEventListener('click', function(event){
		event.preventDefault();
		if (!lastoutputs || !lastoutputs.stats || !lastoutputs.stats.position) return; // Guard clause
		var mousex=event.clientX-this.offsetLeft;
		var mousey=event.clientY-this.offsetTop;
		let inputx=(mousex-(mousex%tilesize))/tilesize;
		let inputy=(mousey-(mousey%tilesize))/tilesize;
		inputx+=lastoutputs.stats.position.x-radius;
		inputy+=lastoutputs.stats.position.y-radius;
		if (event.shiftKey){
			input={"spell":casting,"x":inputx,"y":inputy};
		} else {
			input={"x":inputx,"y":inputy};
		}
		if (!gameState.waiting) {
			gameState.waiting=true;
			var ctx = document.getElementById("map").getContext("2d");
			ctx.font = "12px";
			ctx.fillStyle = "#C0C0C0";
			ctx.fillText("Waiting for server",0,10);
			if (event.shiftKey){
				runCommand("cast", input).then(data => {
					if (data === null) return;
					var outputs=parsedata(data);
					lastoutputs=refreshgame(outputs,lastoutputs);
				}).catch(error => console.error('Fetch error:', error));
			} else {
				runCommand("moveto", input).then(data => {
					if (data === null) return;
					var outputs=parsedata(data);
					lastoutputs=refreshgame(outputs,lastoutputs,{command:"moveto",modifier:input});
				}).catch(error => console.error('Fetch error:', error));
			}
		}
	});
	document.getElementById("map").addEventListener('mousemove', function(event){
		if (!lastoutputs || !lastoutputs.terrain || !lastoutputs.decals || !lastoutputs.items || !lastoutputs.creatures) {
            return; // Guard clause if lastoutputs or its properties aren't ready
        }
		var mousex=event.clientX-this.offsetLeft;
		var mousey=event.clientY-this.offsetTop;
		var focus=getsquarecontents(
				lastoutputs.terrain,
				lastoutputs.decals,
				lastoutputs.items,
				lastoutputs.creatures,
				{
					"x":(mousex-(mousex%tilesize))/tilesize,
					"y":(mousey-(mousey%tilesize))/tilesize
				},
				radius
				);
		var thingtype="";
		var ctx=document.getElementById("controls").getContext("2d");
		var infimg=document.getElementById("none144");
		ctx.drawImage(infimg,0,180);
		for (const thing in focus){
			if (thing==2&&focus[thing]!=false) thingtype=focus[thing];
			if (thing==3&&focus[thing]!=false) thingtype="creature";
		}
		if (thingtype=="creature"){
			drawportrait(focus[3].type,focus[3].equipment);
			thingtype=focus[3].type;
		}
		ctx.fillStyle="#000000";
		ctx.fillRect(144,180,244,144);
		ctx.fillStyle="#FFFFFF";
		ctx.font = "24px";
		ctx.fillText(thingtype,144,208);
	});
	document.getElementById("newlevel").addEventListener('click', function(){
		document.getElementById("menu").style.display = "none";
		document.getElementById("map").style.display = "block";
		if (!gameState.waiting) {
			gameState.waiting=true;
			var ctx = document.getElementById("map").getContext("2d");
			ctx.font = "12px";
			ctx.fillStyle = "#C0C0C0";
			ctx.fillText("Waiting for server",0,10);
			runCommand("start", "Player").then(data => {
				if (data === null) return;
				var outputs=parsedata(data);
				lastoutputs=refreshgame(outputs,lastoutputs);
				document.getElementById("movelog").innerHTML = "Player has entered the dungeon</br>";
			}).catch(error => console.error('Fetch error:', error));
		}
	});
	document.getElementById("controls").addEventListener('mousemove', function(event){
		event.preventDefault();
		var mousex=event.clientX-this.offsetLeft;
		var mousey=event.clientY-this.offsetTop;
		var ctx=document.getElementById("controls").getContext("2d");
		var tilename="none";
		var strrep="";
		if (typeof(lastoutputs)!='undefined'){
			if (mousex>62&&mousey>324){
				if (opentab=="items"){
					if (mousex>136){
						let itemchoice;
						if (mousey<372){
							itemchoice=Math.floor((mousex-136)/36);
							if (lastoutputs.stats.equipment[itemchoice]){
								tilename=lastoutputs.stats.equipment[itemchoice].type;
								strrep=lastoutputs.stats.equipment[itemchoice].strrep;
							}
						} else if (mousey<466){
							itemchoice=Math.floor((mousex-136)/36)
									+7*Math.floor((mousey-372)/50);
							if (typeof(lastoutputs.stats.inventory[itemchoice])!='undefined'){
								tilename=lastoutputs.stats.inventory[itemchoice].type;
								strrep=lastoutputs.stats.inventory[itemchoice].strrep;
							}
						} else {
							itemchoice=Math.floor((mousex-136)/36);
							if (typeof(lastoutputs.stats.onground[itemchoice])!='undefined'){
								if (lastoutputs.stats.onground[itemchoice].itemclass!="ring"&&lastoutputs.stats.onground[itemchoice].itemclass!="potion"){
									tilename=lastoutputs.stats.onground[itemchoice].name;
								} else if (lastoutputs.stats.onground[itemchoice].category=="corpse"){
									tilename=lastoutputs.stats.onground[itemchoice].name+"corpse";
								} else {
									tilename=lastoutputs.stats.onground[itemchoice].itemclass;
								}
								strrep=lastoutputs.stats.onground[itemchoice].strrep;
							}
						}
					}
				}
			}
		}
		var infimg=document.getElementById("none144");
		ctx.drawImage(infimg,0,180);
		infimg=document.getElementById(tilename+"144");
		ctx.drawImage(infimg,0,180);
		ctx.fillStyle="#000000";
		ctx.fillRect(144,180,244,144);
		ctx.fillStyle="#FFFFFF";
		ctx.font = "24px";
		ctx.fillText(strrep,144,208);
	});
	document.getElementById("controls").addEventListener('click', function(event){
		event.preventDefault();
		document.getElementById("debug").innerHTML = "clicked ";
		var mousex=event.clientX-this.offsetLeft;
		var mousey=event.clientY-this.offsetTop;
		var fback;
		if (mousey<180) {
			if (mousex<180){
				let inputx=(mousex-(mousex%3))/3;
				let inputy=(mousey-(mousey%3))/3;
				input={"x":inputx,"y":inputy};
				if (!gameState.waiting) {
					gameState.waiting=true;
					var ctx = document.getElementById("map").getContext("2d");
					ctx.font = "12px";
					ctx.fillStyle = "#C0C0C0";
					ctx.fillText("Waiting for server",0,10);
					var move = {command:"moveto",modifier:input};
					runCommand(move.command, move.modifier).then(data => {
						if (data === null) return;
						var outputs=parsedata(data);
						lastoutputs=refreshgame(outputs,lastoutputs,move);
					}).catch(error => console.error('Fetch error:', error));
				}
				fback="minimap";
			} else {
				if (mousey<64){
					fback="bars";
				} else if (mousey<148){
					fback="stats";
				} else {
					if (mousex<232){
						fback="explore";
						if (!gameState.waiting) {
							input="explore";
							gameState.waiting=true;
							var ctx = document.getElementById("map").getContext("2d");
							ctx.font = "12px";
							ctx.fillStyle = "#C0C0C0";
							ctx.fillText("Waiting for server",0,10);
							var move = {command:"moveto",modifier:input};
							runCommand(move.command, move.modifier).then(data => {
								if (data === null) return;
								var outputs=parsedata(data);
								lastoutputs=refreshgame(outputs,lastoutputs,move);
							}).catch(error => console.error('Fetch error:', error));
						}
					} else if (mousex<284){
						fback="fight";
						let target=getnexttarget(lastoutputs.creatures,radius);
						if (!gameState.waiting&&target!=false) {
							input=target;
							gameState.waiting=true;
							var ctx = document.getElementById("map").getContext("2d");
							ctx.font = "12px";
							ctx.fillStyle = "#C0C0C0";
							ctx.fillText("Waiting for server",0,10);
							runCommand("moveto", input).then(data => {
								if (data === null) return;
								var outputs=parsedata(data);
								lastoutputs=refreshgame(outputs,lastoutputs);
							}).catch(error => console.error('Fetch error:', error));
						} else {
							lastoutputs.movelog=["No creature in view"];
							updategame(lastoutputs,mapsize,radius,opentab);
						}
					} else if (mousex<336){
						fback="rest";
						input = "wait";
						if (!gameState.waiting) {
							gameState.waiting=true;
							var ctx = document.getElementById("map").getContext("2d");
							ctx.font = "12px";
							ctx.fillStyle = "#C0C0C0";
							ctx.fillText("Waiting for server",0,10);
							runCommand(input, 100).then(data => {
								if (data === null) return;
								var outputs=parsedata(data);
								lastoutputs=refreshgame(outputs,lastoutputs);
							}).catch(error => console.error('Fetch error:', error));
						}
					} else {
						fback="cast";
						let target=getnexttarget(lastoutputs.creatures,radius);
						if (!gameState.waiting&&target!=false) {
							input={"spell":casting,"x":target.x,"y":target.y};
							gameState.waiting=true;
							var ctx = document.getElementById("map").getContext("2d");
							ctx.font = "12px";
							ctx.fillStyle = "#C0C0C0";
							ctx.fillText("Waiting for server",0,10);
							runCommand("cast", input).then(data => {
								if (data === null) return;
								var outputs=parsedata(data);
								lastoutputs=refreshgame(outputs,lastoutputs);
							}).catch(error => console.error('Fetch error:', error));
						} else {
							lastoutputs.movelog=[];
							updategame(lastoutputs,mapsize,radius);
						}
					}
				}
			}
		} else if (mousey<324) {
			fback="infobox";
		} else {
			if (mousex<62){
				var ctx = document.getElementById("controls").getContext("2d");
				if (mousey<362){
					fback="items";
					opentab="items";
				} else if (mousey<400){
					fback="magic";
					opentab="magic";
				} else if (mousey<438){
					fback="skills";
					opentab="skills";
				} else if (mousey<476){
					fback="options";
					opentab="options";
				} else {
					fback="blank";
				}
				var tabimg = document.getElementById("ui"+opentab);
				ctx.drawImage(tabimg,62,324,326,196);
			} else {
				fback="menuarea";
				if (opentab=="items"){
					if (mousex>136){
						var input;
						var itemchoice;
						if (mousey<370){
							input = "remove";
							var eqlist = ["weapon","ring","cloak","armour","helmet","shield"];
							itemchoice=Math.floor((mousex-136)/36);
							itemchoice = JSON.stringify(eqlist[itemchoice]);
							fback="equip "+itemchoice;
						} else if (mousey<464){
							if (event.shiftKey) {
								input = "drop";
							} else {
								input = "use";
							}
							itemchoice=Math.floor((mousex-136)/36)
									+7*Math.floor((mousey-370)/50);
							fback="inventory "+itemchoice;
						} else {
							input = "pickup";
							itemchoice=Math.floor((mousex-136)/36);
							fback="ground "+itemchoice;
						}
						if (!gameState.waiting) {
							gameState.waiting=true;
							var ctx = document.getElementById("map").getContext("2d");
							ctx.font = "12px";
							ctx.fillStyle = "#C0C0C0";
							ctx.fillText("Waiting for server",0,10);
							runCommand(input, itemchoice).then(data => {
								if (data === null) return;
								var outputs=parsedata(data);
								lastoutputs=refreshgame(outputs,lastoutputs);
							}).catch(error => console.error('Fetch error:', error));
						}
					}
				} else if (opentab=="options"){
					if (mousex<190&&mousey<386){
						var input = "suicide";
						if (!gameState.waiting) {
							gameState.waiting=true;
							var ctx = document.getElementById("map").getContext("2d");
							ctx.font = "12px";
							ctx.fillStyle = "#C0C0C0";
							ctx.fillText("Waiting for server",0,10);
							runCommand(input, false).then(data => {
								if (data === null) return;
								var outputs=parsedata(data);
								lastoutputs=refreshgame(outputs,lastoutputs);
							}).catch(error => console.error('Fetch error:', error));
						}
					}
				};
			}
		}
		document.getElementById("debug").innerHTML = fback;
	});
	
	//actual code to be executed upon page loading
	document.getElementById("loadingscreen").style.display = "none";
	document.getElementById("menu").style.display = "block";
	drawUIskin(opentab);
});