import { getlocalimagestack } from './util.js';

export function drawtominimap(layer,centre) {
	var mapsize=180;
	var radius=8;
	var xlow=centre.x-radius;
	var xhigh=centre.x+radius;
	var ylow=centre.y-radius;
	var yhigh=centre.y+radius;
	var tilesize=3;
	var ctx = document.getElementById("controls").getContext("2d");
	for (let i=0;i<19;i++){
		if (typeof layer[i]!='undefined'){
			for (let j=0;j<19;j++){
				if (typeof layer[i][j]!='undefined'){
					var tile=layer[i][j];
					switch (tile){
					case "0":
						ctx.fillStyle = "rgb(160,160,160)";
						ctx.fillRect((i+xlow)*tilesize,(j+ylow)*tilesize,tilesize,tilesize);
						break;
					case "1":
						ctx.fillStyle = "rgb(80,80,80)";
						ctx.fillRect((i+xlow)*tilesize,(j+ylow)*tilesize,tilesize,tilesize);
						break;
					case "2":
						ctx.fillStyle = "rgb(255,255,255)";
						ctx.fillRect((i+xlow)*tilesize,(j+ylow)*tilesize,tilesize,tilesize);
						break;
					case "3":
						ctx.fillStyle = "rgb(255,255,255)";
						ctx.fillRect((i+xlow)*tilesize,(j+ylow)*tilesize,tilesize,tilesize);
						break;
					default:
						break;
					}
				}
			}
		} 
	}
	ctx.fillStyle = "rgb(0,200,0)";
	ctx.fillRect(centre.x*tilesize,centre.y*tilesize,tilesize,tilesize);
}
export function drawvisthings(things,centre,offset,mapsize,radius){
	var xlow=centre.x-radius;
	var xhigh=centre.x+radius;
	var ylow=centre.y-radius;
	var yhigh=centre.y+radius;
	var tilesize=Math.floor(mapsize/(2*radius+1));
	var ctx = document.getElementById("map").getContext("2d");
	if (typeof offset!='undefined'){
		ctx.translate(offset.x,offset.y);
	}
	for (const i in things){
		const thing=things[i];
		var thingimg = document.getElementById(thing.type);
		ctx.drawImage(thingimg,(thing.position.x-xlow)*tilesize,(thing.position.y-ylow)*tilesize,tilesize,tilesize);
	}
	if (typeof offset!='undefined'){
		ctx.translate(-offset.x,-offset.y);
	}
}
export function drawviscreatures(things,centre,offset,mapsize,radius){
	var xlow=centre.x-radius;
	var xhigh=centre.x+radius;
	var ylow=centre.y-radius;
	var yhigh=centre.y+radius;
	var tilesize=Math.floor(mapsize/(2*radius+1));
	var ctx = document.getElementById("map").getContext("2d");
	if (typeof offset!='undefined'){
		ctx.translate(offset.x,offset.y);
	}
	for (const i in things){
		const thing=things[i];
		if (thing.type!="player") {
			drawcreature(thing.type,(thing.position.x-xlow)*tilesize,(thing.position.y-ylow)*tilesize,thing.equipment,mapsize,radius);
		}
		if (typeof thing.condition!='undefined'&&thing.condition<1&&thing.condition>0){
			if (thing.condition>0.5){
				ctx.fillStyle = "rgb("+(255-Math.floor((thing.condition-0.5)*510))+",255,0)";
			} else {
				ctx.fillStyle = "rgb(255,"+Math.floor(thing.condition*510)+",0)";
			}
			ctx.fillRect((thing.position.x-xlow+1)*tilesize-Math.floor(tilesize/12),Math.floor((thing.position.y-ylow+1-thing.condition)*tilesize),Math.floor(tilesize/12),Math.floor(thing.condition*tilesize));
		}
	}
	if (typeof offset!='undefined'){
		ctx.translate(-offset.x,-offset.y);
	}
}
export function drawplayer(positionx,positiony,equipment,mapsize,radius) {
	var tilesize=Math.floor(mapsize/(2*radius+1));
	var ctx = document.getElementById("map").getContext("2d");
	var playerimg = document.getElementById("player");
	ctx.drawImage(playerimg,positionx,positiony,tilesize,tilesize);
	for (const item in equipment) {
		if (equipment[item]!=false&&equipment[item].type!="ring"){
			var itemimg = document.getElementById(equipment[item].type);
			ctx.drawImage(itemimg,positionx,positiony,tilesize,tilesize);
		}
	}
}
export function drawcreature(creaturetype,positionx,positiony,equipment,mapsize,radius) {
	var tilesize=Math.floor(mapsize/(2*radius+1));
	var ctx = document.getElementById("map").getContext("2d");
	var creatureimg = document.getElementById(creaturetype);
	ctx.drawImage(creatureimg,positionx,positiony,tilesize,tilesize);
	for (const item in equipment) {
		if (equipment[item]!=false&&equipment[item].type!="ring"){
			var itemimg = document.getElementById(equipment[item]);
			ctx.drawImage(itemimg,positionx,positiony,tilesize,tilesize);
		}
	}
}
export function drawportrait(creaturetype,equipment) {
	var ctx = document.getElementById("controls").getContext("2d");
	var creatureimg = document.getElementById(creaturetype+"144");
	ctx.drawImage(creatureimg,0,180);
	for (const item in equipment) {
		if (equipment[item]!=false&&equipment[item].type!="ring"){
			var itemimg = document.getElementById(equipment[item]+"144");
			ctx.drawImage(itemimg,0,180);
		}
	}
}
export function drawvisterrain(layer,decals,offset,mapsize,radius) {
	var tilesize=Math.floor(mapsize/(2*radius+1));
	var ctx = document.getElementById("map").getContext("2d");
	//grid shading
	if (typeof offset!='undefined'){
		ctx.translate(offset.x,offset.y);
	}
	for (let i=0;i<19;i++){
		if (typeof layer[i]!='undefined'){
			for (let j=0;j<19;j++){
				if (typeof layer[i][j]!='undefined'){
					var tile=layer[i][j];
				} else {
					var tile="u";
				}
				switch (tile){
				case "u":
					ctx.fillStyle = "rgb(0,0,0)";
					ctx.fillRect(i*tilesize,j*tilesize,tilesize,tilesize);
					break;
				case "0":
					var tileimg = document.getElementById("floor");
					ctx.drawImage(tileimg,i*tilesize,j*tilesize,tilesize,tilesize);
					break;
				case "1":
					var tileimg = document.getElementById("wall");
					ctx.drawImage(tileimg,i*tilesize,j*tilesize,tilesize,tilesize);
					break;
				case "2":
					var tileimg = document.getElementById("stairup");
					ctx.drawImage(tileimg,i*tilesize,j*tilesize,tilesize,tilesize);
					break;
				case "3":
					var tileimg = document.getElementById("stairdown");
					ctx.drawImage(tileimg,i*tilesize,j*tilesize,tilesize,tilesize);
					break;
				default:
					ctx.fillStyle = "rgb(0,0,0)";
					ctx.fillRect(i*tilesize,j*tilesize,tilesize,tilesize);
					break;
				}
				
				if (typeof decals[i][j]!='undefined'){
					var decal=decals[i][j];
				} else {
					var decal="0";
				}
				if (decal!=0){
					var tileimg = document.getElementById("decal"+decal);
					ctx.drawImage(tileimg,i*tilesize,j*tilesize,tilesize,tilesize);
				}
			}
		} else {
			for (let j=0;j<19;j++){
				ctx.fillStyle = "rgb(0,0,0)";
				ctx.fillRect(i*tilesize,j*tilesize,tilesize,tilesize);
			}
		}
	}
	if (typeof offset!='undefined'){
		ctx.translate(-offset.x,-offset.y);
	}
}
export function shadeoutside(layer,offset,mapsize,radius) {
	var tilesize=Math.floor(mapsize/(2*radius+1));
	var ctx = document.getElementById("map").getContext("2d");
	if (typeof offset!='undefined'){
		ctx.translate(offset.x,offset.y);
	}
	for (let i=0;i<19;i++){
		if (typeof layer[i]!='undefined'){
			for (let j=0;j<19;j++){
				if (typeof layer[i][j]!='undefined'){
					var tile=layer[i][j];
				} else {
					var tile="u";
				}
				switch (tile){
				case "u":
					ctx.fillStyle = "rgba(0,0,0,0.7)";
					ctx.fillRect(i*tilesize,j*tilesize,tilesize,tilesize);
					break;
				default:
					break;
				}
			}
		} else {
			for (let j=0;j<21;j++){
				ctx.fillStyle = "rgb(0,0,0)";
				ctx.fillRect(i*tilesize,j*tilesize,tilesize,tilesize);
			}
		}
	}
	
	if (typeof offset!='undefined'){
		ctx.translate(-offset.x,-offset.y);
	}
}
export function drawanimationbox(terrain,decals,items,creatures,square,offset,boxsize,mapsize,radius,projecting){
	var tilesize=Math.floor(mapsize/(2*radius+1));
	var imgsize=36;
	var sizeadjust=(tilesize-boxsize)/2;
	var directionx=Math.sign(offset.x);
	var directiony=Math.sign(offset.y);
	var positionx=square.x*tilesize;
	var positiony=square.y*tilesize;
	var originalcornerx=positionx;
	var originalcornery=positiony;
	var furthestcornerx=positionx+directionx*tilesize;
	var furthestcornery=positiony+directiony*tilesize;
	var firstauxcornerx=positionx;
	var firstauxcornery=positiony+directiony*tilesize;
	var secondauxcornerx=positionx+directionx*tilesize;
	var secondauxcornery=positiony;
	
	var stackoriginal;
	stackoriginal=getlocalimagestack(terrain,decals,items,creatures,square,radius);
	
	var squarefurthest={"x":square.x+directionx,"y":square.y+directiony};
	var stackfurthest;
	stackfurthest=getlocalimagestack(terrain,decals,items,creatures,squarefurthest,radius);
	
	var squarefirstaux={"x":square.x,"y":square.y+directiony};
	var stackfirstaux;
	stackfirstaux=getlocalimagestack(terrain,decals,items,creatures,squarefirstaux,radius);
	
	var squaresecondaux={"x":square.x+directionx,"y":square.y};
	var stacksecondaux;
	stacksecondaux=getlocalimagestack(terrain,decals,items,creatures,squaresecondaux,radius);
	
	var ctx = document.getElementById("map").getContext("2d");
	if (tilesize+Math.min(offset.x,0)>0&&tilesize+Math.min(offset.y,0)>0) {
		for (const layer in stackoriginal){
			if (stackoriginal[layer]!=false&&(layer<3||projecting)){
				var imgoriginal=document.getElementById(stackoriginal[layer]);
				ctx.drawImage(imgoriginal,
					Math.max(offset.x,0)*(imgsize/tilesize),
					Math.max(offset.y,0)*(imgsize/tilesize),
					imgsize+Math.min(offset.x,0)*(imgsize/tilesize),
					imgsize+Math.min(offset.y,0)*(imgsize/tilesize),
					originalcornerx+Math.max(offset.x,0),
					originalcornery+Math.max(offset.y,0),
					tilesize+Math.min(offset.x,0),
					tilesize+Math.min(offset.y,0)
				);
			}
		}
	} if (Math.abs(offset.x)>0&&Math.abs(offset.y)>0) {
		for (const layer in stackfurthest){
			if (stackfurthest[layer]!=false){
				var imgfurthest=document.getElementById(stackfurthest[layer]);
				ctx.drawImage(imgfurthest,
					(imgsize+Math.min(offset.x,0)*(imgsize/tilesize))%imgsize,
					(imgsize+Math.min(offset.y,0)*(imgsize/tilesize))%imgsize,
					Math.abs(offset.x)*(imgsize/tilesize),
					Math.abs(offset.y)*(imgsize/tilesize),
					furthestcornerx+(tilesize+Math.min(offset.x,0))%tilesize,
					furthestcornery+(tilesize+Math.min(offset.y,0))%tilesize,
					Math.abs(offset.x),Math.abs(offset.y)
				);
			}
		}
	} if (tilesize+Math.min(offset.x,0)>0&&Math.abs(offset.y)>0) {
		for (const layer in stackfirstaux){
			if (stackfirstaux[layer]!=false){
				var imgfirstaux=document.getElementById(stackfirstaux[layer]);
				ctx.drawImage(imgfirstaux,
					Math.max(offset.x,0)*(imgsize/tilesize),
					(imgsize+Math.min(offset.y,0)*(imgsize/tilesize))%imgsize,
					imgsize+Math.min(offset.x,0)*(imgsize/tilesize),
					Math.abs(offset.y)*(imgsize/tilesize),
					firstauxcornerx+Math.max(offset.x,0),
					firstauxcornery+(tilesize+Math.min(offset.y,0))%tilesize,
					tilesize+Math.min(offset.x,0),
					Math.abs(offset.y)
				);
			}
		}
	} if (Math.abs(offset.x)>0&&tilesize+Math.min(offset.y,0)>0) {
		for (const layer in stacksecondaux){
			if (stacksecondaux[layer]!=false){
				var imgsecondaux=document.getElementById(stacksecondaux[layer]);
				ctx.drawImage(imgsecondaux,
					(imgsize+Math.min(offset.x,0)*(imgsize/tilesize))%imgsize,
					Math.max(offset.y,0)*(imgsize/tilesize),
					Math.abs(offset.x)*(imgsize/tilesize),
					imgsize+Math.min(offset.y,0)*(imgsize/tilesize),
					secondauxcornerx+(tilesize+Math.min(offset.x,0))%tilesize,
					secondauxcornery+Math.max(offset.y,0),
					Math.abs(offset.x),
					tilesize+Math.min(offset.y,0)
				);
			}
		}
	}
}