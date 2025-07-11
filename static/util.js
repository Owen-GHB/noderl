async function postData(data = {}) {
	const url = '/api';
	const response = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: new URLSearchParams({ json: JSON.stringify(data) }).toString()
	});
	if (!response.ok) {
		console.error(`HTTP error! status: ${response.status}`);
		return null;
	}
	return response.text();
}
function runCommand(command,modifier){
	return postData({ command: command, modifier: modifier, filename: 'Player' });
}
function getmousesquare(mousex,mousey,tilesize){
	squarex=(mousex-(mousex%tilesize))/tilesize;
	squarey=(mousey-(mousey%tilesize))/tilesize;
}
function getsquarecontents(terrain,decals,items,creatures,square,radius){
	var playerx=creatures[0].position.x;
	var playery=creatures[0].position.y;
	var localterrain;
	localterrain = terrain[square.x][square.y];
	switch (localterrain){
		case "u":
			localterrain="none";
			break;
		case "0":
			localterrain="floor";
			break;
		case "1":
			localterrain="wall";
			break;
		case "2":
			localterrain="stairup";
			break;
		case "3":
			localterrain="stairdown";
			break;
	}
	var localdecal;
	localdecal = parseInt(decals[square.x][square.y]);
	if (localdecal!=0){
		localdecal ="decal"+localdecal;
	}
	var localitem = false;
	for (item in items){
		if (items[item].position.x-playerx+radius==square.x&&items[item].position.y-playery+radius==square.y) {
			localitem=items[item].type;
		}
	}
	var localcreature = false;
	for (creature in creatures){
		if (creatures[creature].position.x-playerx+radius==square.x&&creatures[creature].position.y-playery+radius==square.y) {
			localcreature=creatures[creature];
		}
	}
	var contentstack = [];
	contentstack.push(localterrain);
	contentstack.push(localdecal);
	contentstack.push(localitem);
	contentstack.push(localcreature);
	return contentstack;
}
function getcreatureatsquare(creatures,square,radius){
	var playerx=false;
	var playery=false;
	for (creature in creatures){
		if (creatures[creature].type=="player"){
			playerx=creatures[creature].position.x;
			playery=creatures[creature].position.y;
		}
	}
	var localcreature = false;
	for (creature in creatures){
		if (creatures[creature].position.x-playerx+radius==square.x&&creatures[creature].position.y-playery+radius==square.y) {
			localcreature=creatures[creature];
		}
	}
	return localcreature;
}
function getlocalimagestack(terrain,decals,items,creatures,square,radius){
	var squarecontents=getsquarecontents(terrain,decals,items,creatures,square,radius);
	var imgstack = [];
	for (i=0;i<3;i++){
		imgstack.push(squarecontents[i]);
	}
	if (squarecontents[3]!=false){
		imgstack.push(squarecontents[3].type);
		for (piece in squarecontents[3].equipment){
			imgstack.push(squarecontents[3].equipment[piece]);
		}
	} else {
		imgstack.push(squarecontents[3]);
	}
	return imgstack;
}
function getnexttarget(creatures,radius) {
	var target=false;
	var dist=2*radius;
	for (creature in creatures){
		var dist2=Math.abs(creatures[creature].position.x-creatures[0].position.x)
			+Math.abs(creatures[creature].position.y-creatures[0].position.y);
		if (dist2<=dist&&dist2>0){
			dist=dist2;
			target=creatures[creature].position;
		}
	}
	return target;
}
function parsedata(thisdata){
	//document.getElementById("outtakes").innerHTML=thisdata;
	var outputs=JSON.parse(thisdata);
	//parse terrain/decals output
	outputs.terrain=outputs.terrain.split("L");
	for (i in outputs.terrain){
		outputs.terrain[i]=outputs.terrain[i].split("");
	}
	outputs.explored=outputs.explored.split("L");
	for (i in outputs.explored){
		outputs.explored[i]=outputs.explored[i].split("");
	}
	outputs.decals=outputs.decals.split("L");
	for (i in outputs.decals){
		outputs.decals[i]=outputs.decals[i].split("");
	}
	return outputs;
}
function drawUIskin(opentab){ 
	var ctx = document.getElementById("controls").getContext("2d");
	var img;
	
	img = document.getElementById("uibars");
	ctx.drawImage(img,180,0,208,64);
	
	img = document.getElementById("uicast");
	ctx.drawImage(img,336,148,52,32);
	
	img = document.getElementById("uiexplore");
	ctx.drawImage(img,180,148,52,32);
	
	img = document.getElementById("uifight");
	ctx.drawImage(img,232,148,52,32);
	
	img = document.getElementById("uiinfobox");
	ctx.drawImage(img,0,180,388,144);
	
	img = document.getElementById("ui"+opentab);
	ctx.drawImage(img,62,324,326,196);
	
	img = document.getElementById("uiitembutton");
	ctx.drawImage(img,0,324,62,38);
	
	img = document.getElementById("uimagicbutton");
	ctx.drawImage(img,0,362,62,38);
	
	img = document.getElementById("uioptionsbuttons");
	ctx.drawImage(img,0,438,62,38);
	
	img = document.getElementById("uirest");
	ctx.drawImage(img,284,148,52,32);
	
	img = document.getElementById("uiskillbutton");
	ctx.drawImage(img,0,400,62,38);
	
	img = document.getElementById("uistats");
	ctx.drawImage(img,180,64,208,84);	
}