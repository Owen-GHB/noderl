import { runCommand, getcreatureatsquare, drawUIskin } from './util.js';
import {
    drawtominimap,
    drawvisthings,
    drawviscreatures,
    drawplayer,
    drawcreature,
    drawvisterrain,
    shadeoutside,
    drawanimationbox
} from './draw.js';
import { gameState } from './gwarl.js';

export function updategame(output,mapsize,radius,opentab){
	var offset = {x:0, y:0};
	var tilesize=Math.floor(mapsize/(2*radius+1));
	drawvisterrain(output.explored,output.decals,offset,mapsize,radius);
	drawvisthings(output.items,output.stats.position,offset,mapsize,radius);
	shadeoutside(output.terrain,offset,mapsize,radius);
	drawviscreatures(output.creatures,output.stats.position,offset,mapsize,radius);
	drawplayer(radius*tilesize,radius*tilesize,output.stats.equipment,mapsize,radius);
	if (output.mapRefresh) {
		runCommand("info", "minimap").then(data => {
			if (data === null) return;
			var mapctx = document.getElementById("controls").getContext("2d");
			mapctx.fillStyle = "#000000";
			mapctx.fillRect(0,0,180,180);
			let mapinfo=data.split("L");
			for (let i in mapinfo) {
				mapinfo[i]=mapinfo[i].split("");
			}
			for (let i=0;i<60;i++){
				for (let j=0;j<60;j++){
					var tile=mapinfo[i][j];
					switch (tile){
					case "0":
						mapctx.fillStyle = "rgb(160,160,160)";
						mapctx.fillRect(j*3,i*3,3,3);
						break;
					case "1":
						mapctx.fillStyle = "rgb(80,80,80)";
						mapctx.fillRect(j*3,i*3,3,3);
						break;
					}
				}
			}
		}).catch(error => console.error('Fetch error:', error));
	}
	var ctx = document.getElementById("controls").getContext("2d");
	ctx.fillStyle = "#000000";
	ctx.fillRect(264,23,130,18);
	ctx.fillStyle = "#F00000";
	ctx.fillRect(264,23,130*output.creatures[0].condition,18);
	var tonext = (output.stats.level+1)*(output.stats.level+1)*(output.stats.level+1)-(output.stats.level)*(output.stats.level)*(output.stats.level);
	var sincelast = output.stats.experience-(output.stats.level)*(output.stats.level)*(output.stats.level);
	ctx.fillStyle = "#000000";
	ctx.fillRect(264,3,130,18);
	ctx.fillStyle = "#F0F000";
	ctx.fillRect(264,3,Math.max(130*sincelast/tonext,0),18);
	ctx.fillStyle = "#000000";
	ctx.fillRect(264,43,130,18);
	ctx.fillStyle = "#0000F0";
	var manacondition = output.stats.mana/output.stats.maxmana;
	ctx.fillRect(264,43,130*manacondition,18);
	drawUIskin(opentab);
	drawtominimap(output.terrain,output.stats.position);
	ctx.fillStyle = "rgb(255,255,255)";
	ctx.font="16px monospace";
	ctx.fillText(JSON.stringify(output.stats.level),214,17);
	ctx.fillText(JSON.stringify(output.stats.hp),214,38);
	ctx.fillText(JSON.stringify(output.stats.maxhp),240,38);
	ctx.fillText(JSON.stringify(output.stats.mana),214,59);
	ctx.fillText(JSON.stringify(output.stats.maxmana),240,59);
	ctx.fillText(JSON.stringify(output.stats.strength),230,81);
	ctx.fillText(JSON.stringify(output.stats.dexterity),230,101);
	
	
	if (opentab=="items"){
		var newimg;
		for (let item=0;item<14;item++){
			if (typeof output.stats.inventory[item]!='undefined'){
				var itemtype=output.stats.inventory[item].type;
				newimg = document.getElementById(itemtype);
				if (newimg) {
					ctx.drawImage(newimg,136+(item%7)*36,378+Math.floor(item/7)*50,36,36);
				}
			}
		}
		for (let item=0;item<7;item++){
			if (output.stats.equipment[item]){
				var itemtype=output.stats.equipment[item].type;
				newimg = document.getElementById(itemtype);
				if (newimg) {
					ctx.drawImage(newimg,136+item*36,326,36,36);
				}
			}
		}
		if (typeof output.stats.onground!='undefined') for (let item=0;item<7;item++){
			if (typeof output.stats.onground[item]!='undefined'){
				var itemtype=output.stats.onground[item].itemclass;
				if (itemtype=="corpse") {
					itemtype=output.stats.onground[item].name+"corpse";
				} else if (itemtype=="weapon"||itemtype=="armour"||itemtype=="shield"||itemtype=="helmet") {
					itemtype=output.stats.onground[item].name;
				}
				newimg = document.getElementById(itemtype);
				if (newimg) {
					ctx.drawImage(newimg,136+item*36,472,36,36);
				}
			}
		}
	}
	
	// function for later implementation of spellcasting ui tab 
	for (let spell=0;spell<7;spell++){
		if (typeof output.stats.repetoire[spell]!='undefined'){
			var spelltype=output.stats.repetoire[spell].school;
		}
	}
	
	for (const move in output.movelog){
		document.getElementById("movelog").insertAdjacentHTML("afterbegin", output.movelog[move]+"<br/>");
		document.getElementById("movelog").scrollTop = 0;
	}
	return output;
}

export function animationcycle(output,lastoutput,ctx,mapsize,radius,opentab){
	var animations=output.animations;
	var tilesize=Math.floor(mapsize/(2*radius+1));
	var timer=0;
	var done=0;
	var moveadjust={x:0,y:0};
	var oldwobblex=[];
	var oldwobbley=[];
	function animate(animations,done){
		if (animations[done].type=="bleed"){
			var cornerx=(animations[done].location.x)*tilesize;
			var cornery=(animations[done].location.y)*tilesize;
			timer=0;
			output=bleed(cornerx,cornery);
		} else if (animations[done].type=="shock"){
			var origin=(animations[done].origin);
			var destination=(animations[done].location);
			timer=0;
			output=zap(origin,destination);
		} else if (animations[done].type=="burn"){
			var origin=(animations[done].origin);
			var destination=(animations[done].location);
			timer=0;
			output=projectile("fireball",origin,destination);
		} else if (animations[done].type=="chill"){
			var origin=(animations[done].origin);
			var destination=(animations[done].location);
			timer=0;
			output=projectile("snowball",origin,destination);
		} else if (animations[done].type=="playermove"){
			var direction = animations[done].direction;
			moveadjust.x+=(direction-1)%3-1;
			moveadjust.y+=2-Math.ceil(direction/3);
			timer=0;
			output=playermove(direction);
		} else if (animations[done].type=="melee"){
			var creaturetype = animations[done].creaturetype;
			var movefrom = animations[done].location;
			var direction = animations[done].direction;
			var victimtype = animations[done].victimtype;
			timer=0;
			output=meleeattack(movefrom,direction);
		} else if (animations[done].type=="creaturemove"){
			var creaturetype = animations[done].creaturetype;
			var movefrom = animations[done].from;
			var direction = animations[done].direction;
			timer=0;
			output=creaturemove(movefrom,direction);
		} else if (animations[done].type=="death"){
			output=updategame(output,mapsize,radius,opentab);
			timer=0;
			playerdeath();
		}
		done++;
		return done;
	}
	function playermove(direction){
		var shift = -(timer+1)*tilesize/4;
		var offset = {x:((direction-1)%3-1)*shift, y:(2-Math.ceil(direction/3))*shift};
		var playerthings = [];
		var notplayerthings = [];
		if (lastoutput.creatures.length>1){
			for (const i in lastoutput.creatures){
				if (i>0) notplayerthings[i-1]=lastoutput.creatures[i];
			}
		}
		playerthings[0]=lastoutput.creatures[0];
		ctx.fillStyle = "rgb(0,0,0)";
		ctx.fillRect(0,0,mapsize,mapsize);
		drawvisterrain(lastoutput.explored,lastoutput.decals,offset,mapsize,radius);
		drawvisthings(lastoutput.items,lastoutput.stats.position,offset,mapsize,radius);
		shadeoutside(lastoutput.terrain,offset,mapsize,radius);
		drawviscreatures(notplayerthings,lastoutput.stats.position,offset,mapsize,radius);
		drawplayer(radius*tilesize,radius*tilesize,lastoutput.stats.equipment,mapsize,radius);
		if (typeof lastoutput.creatures[0].condition!='undefined'&&lastoutput.creatures[0].condition<1&&lastoutput.creatures[0].condition>0){
			if (lastoutput.creatures[0].condition>0.5){
				ctx.fillStyle = "rgb("+(255-Math.floor((lastoutput.creatures[0].condition-0.5)*510))+",255,0)";
			} else {
				ctx.fillStyle = "rgb(255,"+Math.floor(lastoutput.creatures[0].condition*510)+",0)";
			}
			ctx.fillRect((radius+1)*tilesize-Math.floor(tilesize/12),Math.floor((radius+1-lastoutput.creatures[0].condition)*tilesize),Math.floor(tilesize/12),Math.floor(lastoutput.creatures[0].condition*tilesize));
		}
		timer++;
		if (timer<4){
			clearTimeout(playermove);
			setTimeout(function(){
					playermove(direction);
			},15);
		} else {
			timer=0;
			//rest of the refreshgame code including recursion
			if (done>=animations.length){
				output=updategame(output,mapsize,radius,opentab);
			} else done=animate(animations,done);
		}
		return output;
	}
	function creaturemove(movefrom,direction){
		var adjusted={x:(movefrom.x+(direction-1)%3-1),y:(movefrom.y+2-Math.ceil(direction/3))};
		var creature=getcreatureatsquare(output.creatures,adjusted,radius);
		if (creature==false) creature=getcreatureatsquare(lastoutput.creatures,movefrom,radius);
		var shift = (timer+1)*tilesize/4;
		var lastshift = (timer)*tilesize/4;
		var offset = {x:((direction-1)%3-1)*shift, y:(2-Math.ceil(direction/3))*shift};
		var lastoffset = {x:((direction-1)%3-1)*lastshift, y:(2-Math.ceil(direction/3))*lastshift};
		var boxsize = tilesize;
		drawanimationbox(output.terrain,output.decals,output.items,output.creatures,movefrom,lastoffset,boxsize,mapsize,radius,false);
		drawcreature(creature.type,(movefrom.x)*tilesize+offset.x,(movefrom.y)*tilesize+offset.y,creature.equipment,mapsize,radius);
		timer++;
		if (timer<4){
			clearTimeout(creaturemove);
			setTimeout(function(){
					creaturemove(movefrom,direction);
			},15);
		} else {
			timer=0;
			//rest of the refreshgame code including recursion
			if (done>=animations.length){
				output=updategame(output,mapsize,radius,opentab);
			} else done=animate(animations,done);
		}
		return output;
	}
	function meleeattack(movefrom,direction){
		var adjusted={x:(movefrom.x+moveadjust.x),y:(movefrom.y+moveadjust.y)};
		var creature=getcreatureatsquare(lastoutput.creatures,adjusted,radius);
		var movestep=Math.abs(4-Math.abs(3-timer));
		var movesteplast=Math.abs(4-Math.abs(4-timer));
		var shift = Math.ceil(movestep*tilesize/10);
		var lastshift = Math.ceil(movesteplast*tilesize/10);
		var offset = {x:((direction-1)%3-1)*shift, y:(2-Math.ceil(direction/3))*shift};
		var lastoffset = {x:((direction-1)%3-1)*lastshift, y:(2-Math.ceil(direction/3))*lastshift};
		var boxsize = tilesize;
		drawanimationbox(output.terrain,output.decals,output.items,output.creatures,movefrom,lastoffset,boxsize,mapsize,radius,false);
		if (creature.type=="player"){
			drawplayer((movefrom.x)*tilesize+offset.x,(movefrom.y)*tilesize+offset.y,output.stats.equipment,mapsize,radius);
		} else {
			drawcreature(creature.type,(movefrom.x)*tilesize+offset.x,(movefrom.y)*tilesize+offset.y,creature.equipment,mapsize,radius);
		}
		timer++;
		if (timer<8){
			clearTimeout(meleeattack);
			setTimeout(function(){
				meleeattack(movefrom,direction);
			},10);
		} else {
			timer=0;
			//rest of the refreshgame code including recursion
			if (done>=animations.length){
				output=updategame(output,mapsize,radius,opentab);
			} else done=animate(animations,done);
		}
		return output;
	}
	function projectile(projectiletype,origin,destination){
		var distancex=destination.x-origin.x;
		var distancey=destination.y-origin.y;
		var boxsize = tilesize;
		if (timer<11) {
			var offset={x:(timer+1)*tilesize*distancex/12,y:(timer+1)*tilesize*distancey/12};
			var lastoffset={x:(timer)*tilesize*distancex/12,y:(timer)*tilesize*distancey/12};
			var localoffset={x:Math.sign(lastoffset.x)*(Math.abs(lastoffset.x)%tilesize),y:Math.sign(lastoffset.y)*(Math.abs(lastoffset.y)%tilesize)};
			var localsquare={x:Math.sign(lastoffset.x)*Math.floor(Math.abs(lastoffset.x)*1/tilesize)+origin.x,y:Math.sign(lastoffset.y)*Math.floor(Math.abs(lastoffset.y)*1/tilesize)+origin.y};
			if (projectiletype=="snowball"){
				//custom "animation box"
				var grd=ctx.createRadialGradient(
					(origin.x)*tilesize+offset.x+tilesize/2-Math.sign(lastoffset.x)*tilesize/8,
					(origin.y)*tilesize+offset.y+tilesize/2-Math.sign(lastoffset.y)*tilesize/8,
					boxsize/4,
					(origin.x)*tilesize+offset.x+tilesize/2-Math.sign(lastoffset.x)*tilesize/4,
					(origin.y)*tilesize+offset.y+tilesize/2-Math.sign(lastoffset.y)*tilesize/4,
					boxsize/2
					);
				grd.addColorStop(0,"rgba(210,210,255,"+(timer*timer/324)+")");
				grd.addColorStop(0.4,"rgba(160,160,255,"+(timer*timer/648)+")");
				grd.addColorStop(1,"rgba(255,255,255,0)");
				ctx.fillStyle=grd;
				ctx.fillRect(origin.x*tilesize+offset.x,origin.y*tilesize+offset.y,tilesize,tilesize);
			} else {
				drawanimationbox(lastoutput.terrain,lastoutput.decals,lastoutput.items,lastoutput.creatures,localsquare,localoffset,boxsize,mapsize,radius,true);
			}
			if (origin.x==5&&origin.y==5) drawplayer(origin.x*tilesize,origin.y*tilesize,lastoutput.stats.equipment,mapsize,radius);
			if (projectiletype=="fireball"){
				var grd=ctx.createRadialGradient(
					(origin.x)*tilesize+offset.x+tilesize/2+Math.sign(lastoffset.x)*tilesize/9,
					(origin.y)*tilesize+offset.y+tilesize/2+Math.sign(lastoffset.y)*tilesize/9,
					boxsize/6,
					(origin.x)*tilesize+offset.x+tilesize/2,
					(origin.y)*tilesize+offset.y+tilesize/2,
					boxsize/3
					);
				grd.addColorStop(0,"rgba(255,255,0,0.7)");
				grd.addColorStop(0.5,"rgba(255,125,0,0.5)");
				grd.addColorStop(1,"rgba(255,0,0,0)");
				ctx.fillStyle=grd;
				ctx.fillRect((origin.x)*tilesize+offset.x,(origin.y)*tilesize+offset.y,tilesize,tilesize);
			} else {
				
			}
		} else if (timer<16) {
			//impact
			if (projectiletype=="fireball") {
				var grd=ctx.createRadialGradient(
					destination.x*tilesize+tilesize/2,
					destination.y*tilesize+tilesize/2,
					boxsize/6,
					destination.x*tilesize+tilesize/2,
					destination.y*tilesize+tilesize/2,
					boxsize/3
					);
				grd.addColorStop(0,"rgba(255,240,0,0.25)");
				grd.addColorStop(0.6,"rgba(255,120,0,0.3)");
				grd.addColorStop(1,"rgba(255,0,0,0)");
				ctx.fillStyle=grd;
				ctx.fillRect(destination.x*tilesize,destination.y*tilesize,tilesize,tilesize);
			}
		}
		
		timer++;
		if (timer<11){
			clearTimeout(projectile);
			setTimeout(function(){
					projectile(projectiletype,origin,destination);
			},10);
		} else if (timer<16&&projectiletype=="fireball"){
			//impact
			clearTimeout(projectile);
			setTimeout(function(){
					projectile(projectiletype,origin,destination);
			},10);
		} else {
			//rest of the refreshgame code including recursion
			if (done>=animations.length){
				output=updategame(output,mapsize,radius,opentab);
			} else done=animate(animations,done);
		}
		return output;
	}
	function bleed(screenx,screeny){
		ctx.strokeStyle = "rgba("+(timer*24+135)+",0,0,1)";
		ctx.lineWidth = Math.floor(timer/2)+1;
		ctx.beginPath();
		var fromx=-(timer-9)*tilesize/12+screenx;
		var tox=-(timer-8)*tilesize/12+screenx;
		var fromy=screeny+(timer+2)*tilesize/9;
		var toy=screeny+(timer+3)*tilesize/9;
		ctx.moveTo(fromx,fromy);
		ctx.lineTo(tox,toy);
		ctx.stroke();
		timer++;
		if (timer<6){
			clearTimeout(bleed);
			setTimeout(function(){
				bleed(screenx,screeny);
			},30);
		} else {
			timer=0;
			//rest of the refreshgame code including recursion
			if (done>=animations.length){
				output=updategame(output,mapsize,radius,opentab);
			} else done=animate(animations,done);
		}
		return output;
	}
	function zap(origin,destination){
		var screenx=(destination.x)*tilesize;
		var screeny=(destination.y)*tilesize;
		if (timer>0){
			ctx.beginPath();
			for (let kink=0;kink<15;kink++){
				var fromx=origin.x*tilesize+(2*tilesize/10)+kink*(screenx+tilesize/2-origin.x*tilesize-(2*tilesize/10))/15+oldwobblex[kink];
				var fromy=origin.y*tilesize+(2*tilesize/10)+kink*(screeny+tilesize/2-origin.y*tilesize-(2*tilesize/10))/15+oldwobbley[kink];
				var tox=origin.x*tilesize+(2*tilesize/10)+(kink+1)*(screenx+tilesize/2-origin.x*tilesize-(2*tilesize/10))/15+oldwobblex[kink+1];
				var toy=origin.y*tilesize+(2*tilesize/10)+(kink+1)*(screeny+tilesize/2-origin.y*tilesize-(2*tilesize/10))/15+oldwobbley[kink+1];
				ctx.moveTo(fromx,fromy);
				ctx.lineTo(tox,toy);
				ctx.strokeStyle = "rgb(0,0,175)";
				ctx.lineWidth = 1;
				ctx.stroke();
			}
		}
		var wobblex=[];
		var wobbley=[];
		wobblex.push(0);
		wobbley.push(0);
		for (let kink=0;kink<15;kink++){
			wobblex.push(Math.floor((Math.random()-0.5)*tilesize/4)+wobblex[kink]);
			wobbley.push(Math.floor((Math.random()-0.5)*tilesize/4)+wobbley[kink]);
		}
		var gradx=wobblex[15]/16;
		var grady=wobbley[15]/16;
		for (let kink=0;kink<16;kink++){
			wobblex[kink]-=kink*gradx;
			wobbley[kink]-=kink*grady;
		}
		ctx.beginPath();
		for (let kink=0;kink<15;kink++){
			var fromx=origin.x*tilesize+(2*tilesize/10)+kink*(screenx+tilesize/2-origin.x*tilesize-(2*tilesize/10))/15+wobblex[kink];
			var fromy=origin.y*tilesize+(2*tilesize/10)+kink*(screeny+tilesize/2-origin.y*tilesize-(2*tilesize/10))/15+wobbley[kink];
			var tox=origin.x*tilesize+(2*tilesize/10)+(kink+1)*(screenx+tilesize/2-origin.x*tilesize-(2*tilesize/10))/15+wobblex[kink+1];
			var toy=origin.y*tilesize+(2*tilesize/10)+(kink+1)*(screeny+tilesize/2-origin.y*tilesize-(2*tilesize/10))/15+wobbley[kink+1];
			ctx.moveTo(fromx,fromy);
			ctx.lineTo(tox,toy);
			ctx.strokeStyle = "rgba(0,0,200,0.6)";
			ctx.lineWidth = 3;
			ctx.stroke();
			ctx.strokeStyle = "rgb(255,255,255)";
			ctx.lineWidth = 1;
			ctx.stroke();
		}
		var grd=ctx.createRadialGradient(
			screenx+tilesize/2,
			screeny+tilesize/2,
			tilesize/12,
			screenx+tilesize/2,
			screeny+tilesize/2,
			tilesize/4
			);
		grd.addColorStop(0,"rgba(255,255,255,1)");
		grd.addColorStop(1,"rgba(0,0,255,0.1)");
		ctx.fillStyle=grd;
		ctx.fillRect(screenx+tilesize/4,screeny+tilesize/4,tilesize/2,tilesize/2);
		oldwobblex=wobblex;
		oldwobbley=wobbley;
		timer++;
		if (timer<8){
			clearTimeout(zap);
			setTimeout(function(){
					zap(origin,destination);
			},30);
		} else {
			timer=0;
			//rest of the refreshgame code including recursion
			if (done>=animations.length){
				output=updategame(output,mapsize,radius,opentab);
			} else {
				animate(animations,done);
			}
		}
		return output;
	}
	function playerdeath() {
		ctx.fillStyle = "rgba(0,0,0,0.12)";
		ctx.fillRect(0,0,mapsize,mapsize);
		ctx.font = "48px";
		ctx.fillStyle = "rgba(255,0,0,0.36)";
		ctx.fillText("GAME OVER",mapsize/4,mapsize/2);
		timer++;
		if (timer<18){
			clearTimeout(playerdeath);
			setTimeout(function(){
					playerdeath();
			},80);
		} else {
			timer=0;
			document.getElementById("menu").style.display = "block";
			document.getElementById("map").style.display = "none";
		}
		return output;
	}
	globalState.waiting=false;
	if (output.animations){
		done=animate(animations,done);
	} else {
		output=updategame(output,mapsize,radius,opentab);
	}
	return output;
}