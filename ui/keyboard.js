function keypress(keycode){
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
		move={command:"moveto",modifier:JSON.stringify("explore")};
		break;
	case 70:
		var target=getnexttarget(lastoutputs.creatures,radius);
		if (target!=false) {
			move={command:"moveto",modifier:JSON.stringify(target)};
		} else {
			lastoutputs.movelog=[];
			updategame(lastoutputs,mapsize,radius,opentab);
		}
		break;
	case 71:
			move={command:"pickup",modifier:0};
	case 67:
		var target=getnexttarget(lastoutputs.creatures,radius);
		if (target!=false) {
			input={"spell":casting,"x":target.x,"y":target.y};
			move={command:"cast",modifier:JSON.stringify(input)};
		} else {
			lastoutputs.movelog=[];
			updategame(lastoutputs,mapsize,radius,opentab);
		}
		break;
	default:
		break;
	}
	return move;
}