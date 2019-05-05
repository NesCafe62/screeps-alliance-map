window.createModule = function(name) {

var module = {
	name: name,
	exports: {}
};
module._init = function() {
	/* document.addEventListener(this.name, this._listener.bind(this)); */
	/* console.log(`init "${this.name}" module`); */
	this.exports.init.bind(this.exports)();
}

/* module._listener = function (e){
	var data = JSON.parse(e.detail);

	switch(data.event) {
		case 'update':
			module.exports.update();
			break;
		case 'dispose':
			module._dispose();
			break;
		case 'xhttp':
			break;
		default:
			break;
	}

	if (data._cb){
		if (module._cbEvents[data._cb]){
			var cb = module._cbEvents[data._cb].cb;

			if (cb){
				cb(data);
			}

			delete module._cbEvents[data._cb];
		}else{
			console.error("Failed to fetch callback event: " + data._cb);
		}
	}
}

module._dispose = function(){
	document.removeEventListener(this.name, this._listener);
}

module._guid = function(){
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
		return v.toString(16);
	});
}

module._cbEvents = {}

module.dispatchEvent = function(data, cb){
	data.module = this.name;

	if (cb){
		var guid = module._guid();
		
		module._cbEvents[guid] = {
			time: new Date().getTime(),
			id: guid,
			cb: cb
		}

		data._cb = guid;
	}

	var evt = new CustomEvent("_" + this.name, {
		detail: JSON.stringify(data),
		bubbles: true,
		cancelable: true
	});
	document.dispatchEvent(evt);
} */

module.getDeepValue = function(obj, path){
	for (var i=0, path=path.split('.'), len=path.length; i<len; i++){
		if (obj === undefined || obj[path[i]] === undefined){
			return undefined;
		}

		obj = obj[path[i]];
	};
	return obj;
}

module.getScopeData = function(scopeName, objectPath, mustExistPathArr, cb){
	var self = this;
	this.wait.bind(this)(this.isScopeReady.bind(this, scopeName, objectPath, mustExistPathArr), 50, function(error){
		if (error){
			console.error(`condition failed for scope: ${scopeName}, path: ${objectPath}, mustExistArr: ${mustExistPathArr}`)
		}else{
			var scope = angular.element(document.getElementsByClassName(`${scopeName} ng-scope`)).scope();
			cb(self.getDeepValue(scope, objectPath));
		}
	});
}

module.setScopeData = function(scope, objectPath, value, cb){
	var script = document.createElement('script');
	script.textContent = `angular.element(document.getElementsByClassName('${scope} ng-scope')).scope().${objectPath}=${value};`;

	(document.body || document.head || document.documentElement).appendChild(script);
	script.remove();

	if(cb){
	   cb(); 
	}
}

module.wait = function(condition, tries, cb){
	var self = this;
	if (condition()){
		cb.bind(self)();
	}else{
		if (tries > 0){
			setTimeout(function() { self.wait.bind(self)(condition, tries - 1, cb); }, 100);
		}else{
			cb.bind(self)("failed condition");
		}
	}
}

module.isScopeReady = function(scopeName, objectPath, mustExistPathArr){
	var self = this;
	var scope = angular.element(document.getElementsByClassName(`${scopeName} ng-scope`)).scope();
	var object = self.getDeepValue(scope, objectPath);
	var rootValid = (scope && object && Object.keys(object).length);

	if (mustExistPathArr.length){

		if (rootValid){
			let ready = true;
			mustExistPathArr.forEach(function(path){
				var obj = self.getDeepValue(scope, path);
				if (obj === undefined){
					return ready = false;
				} else if (obj instanceof Array && !obj.length){
					return ready = false;
				} else if (typeof obj === 'object' && !Object.keys(obj).length){
					return ready = false;
				}
			});

			return ready;
		}
	}

	return rootValid;
}

/* module.ajaxCall = function(data, cb){

	// Set tokens if it's a request to @screeps
	if (data.url && data.url.startsWith("https://screeps.com/")){
		var auth = JSON.parse(localStorage.getItem('auth'));
		
		data.headers = {
			'X-Token' : auth,
			'X-Username' : auth
		}
	}

	var request = $.ajax(data);

	request.done(function(msg) {
		if (cb){ 
			cb(msg); 
		}
	});

	request.fail(function(jqXHR, msg) {
		if (cb){ 
			cb(undefined, jqXHR.status);
		}
	});
} */

/* module.ajaxGet = function(url, cb){
	module.ajaxCall({
		url: url,
		method: 'GET'
	}, cb);
} */

module.getCurrentShard = function(){
	var url = window.location.href;

	if (url.indexOf("shard") > -1){
		var pathArray = window.location.href.split('/');

		for (var i = 0; i < pathArray.length; i++) {
			if (pathArray[i].startsWith("shard")) {
				return pathArray[i].split('?')[0];
			}
		}
	}

	return ""; 
}

/* module.sendConsoleCommand = function(command, cb, shard) {

	if (!shard){
		shard = "shard0";
	}

	module.ajaxCall({
		url: "https://screeps.com/api/user/console",
		method: "POST",
		data: {
			   expression: command,
			   shard: shard
		   }
	}, cb);
} */
module.ajaxRequest = function(url, callback) {
	var req = new XMLHttpRequest();
	req.open('GET', url, true);
	req.onreadystatechange = function() {
		if (req.readyState === XMLHttpRequest.DONE && req.status === 200) {
			callback({
				data: req.responseText
			});
			/* console.log('response', req.responseText); */
		}
	};
	req.send();
}

return module;	
}


var module = createModule('alliance-map');

module.exports.colors = [ 
	"#000000", "#FEFFE6", "#FFFF00", "#006FA6", "#FF34FF", "#008941", "#FF4A46", "#A30059",
	"#FFDBE5", "#7A4900", "#0000A6", "#63FFAC", "#B79762", "#004D43", "#8FB0FF", "#997D87",
	"#5A0007", "#809693", "#1CE6FF", "#1B4400", "#4FC601", "#3B5DFF", "#4A3B53", "#FF2F80",
	"#61615A", "#BA0900", "#6B7900", "#00C2A0", "#FFAA92", "#FF90C9", "#B903AA", "#D16100",
	"#DDEFFF", "#000035", "#7B4F4B", "#A1C299", "#300018", "#0AA6D8", "#013349", "#00846F",
	"#372101", "#FFB500", "#C2FFED", "#A079BF", "#CC0744", "#C0B9B2", "#C2FF99", "#001E09",
	"#00489C", "#6F0062", "#0CBD66", "#EEC3FF", "#456D75", "#B77B68", "#7A87A1", "#788D66"
];

module.exports.init = function() {
	/* module.dispatchEvent({event: 'xhttp', url:'http://www.leagueofautomatednations.com/alliances.js'}, function(response) { */
	module.ajaxRequest('https://www.leagueofautomatednations.com/alliances.js', function(response) {
		module.exports.alliances = JSON.parse(response.data);
		/* console.log('alliances', module.exports.alliances); */

		module.exports.userToAlliance = {}

		for(var alliance in module.exports.alliances){
			var members = module.exports.alliances[alliance].members;
			for(var member in members){
				var memberName = members[member];

				module.exports.userToAlliance[memberName] = alliance;
			}

			module.exports.alliances[alliance].color = module.exports.colors[module.exports.alliances[alliance].alliance_gcl_rank % module.exports.colors.length];
		}

		module.exports.update();
	});
}

module.exports.update = function() {
	module.getScopeData("page-content", "WorldMap", ['WorldMap.displayOptions.layer', 'WorldMap.roomUsers', 'WorldMap.sectors', 'WorldMap.roomStats'], function(worldMap) {

		$('.room-name.ng-binding').unbind("DOMSubtreeModified").bind("DOMSubtreeModified", function(){
			var roomElement = document.getElementsByClassName('room-name ng-binding')[0];
			var roomName = roomElement.innerText.replace("Room", "").trim();
			$("div[id^=display-]").remove();

			if (worldMap.roomStats[roomName] && worldMap.roomStats[roomName].own){
				var username = worldMap.roomUsers[worldMap.roomStats[roomName].own.user].username;
				var allianceName = module.exports.userToAlliance[username];

				if (allianceName){
					var div = document.createElement("div");
					div.id = "display-" + roomName;

					var label = document.createElement("label");
					label.innerText = "Alliance: ";

					var span = document.createElement("span");
					span.innerText = allianceName;
					span.setAttribute("style", 'color:#bbb');

					div.appendChild(label);
					label.appendChild(span);

					roomElement.parentNode.appendChild(div);
				}
			}
		});

		if (worldMap.displayOptions.layer == "owner0" && worldMap.zoom == 3){
			var visibleRoomElements = $('canvas.room-objects.ng-scope');

			for(var eleName in visibleRoomElements){
				var element = visibleRoomElements[eleName];

				if (element.parentNode){
					var roomName = element.attributes["app:game-map-room-objects"].value;



					var id = "alliance-" + roomName;

					var allianceNodes = $(element.parentNode).children('[id^=alliance-]');
					var hasRoomNode = false;

					if (allianceNodes.length > 0){
						for(var i = 0; i < allianceNodes.length; i++){
							var roomId = allianceNodes[i].id;

							if (roomId == id){
								hasRoomNode = true;
							}else{
								// need to remove because the map reuse old elements
								$("#" + roomId).remove();
							}
						}
					}

					if (hasRoomNode == false){

						if (worldMap.roomStats[roomName] && worldMap.roomStats[roomName].own){

							var username = worldMap.roomUsers[worldMap.roomStats[roomName].own.user].username;
							var allianceName = module.exports.userToAlliance[username];

							if (module.exports.userToAlliance[username] && module.exports.alliances[allianceName]){
								
								var c = module.exports.hexToRgb(module.exports.alliances[allianceName].color);
								c.a = 0.2;

								var rgba = "rgba(" + c.r + "," + c.g + "," + c.b + "," + c.a + ")";

								var newEle = document.createElement("div");
								newEle.id = id;
								newEle.className = 'room-prohibited';

								if (module.config && module.config.background === "Image"){
									var url = "http://www.leagueofautomatednations.com/obj/" + module.exports.alliances[allianceName].logo;

									newEle.setAttribute("style", `background-image: url("${url}");
										background-size: 150px 150px;
										opacity : 0.2;`);

								}else{
									var c = module.exports.hexToRgb(module.exports.alliances[allianceName].color);
									c.a = 0.2;
									newEle.setAttribute("style", `background: rgba(${c.r},${c.g},${c.b},${c.a});`);
								}

								element.parentNode.appendChild(newEle);
								
							}
						}
					}
					
				}
			}
		}
		else if (worldMap.zoom == 2){

			var sectors = worldMap.sectors;

			for(var sectorId in worldMap.sectors){
				var sector = worldMap.sectors[sectorId];

				if (!sector.rooms){
					continue;
				}

				var canvaElement = $(`#${sector.id}`);

				if (!canvaElement){
					continue;
				}

				canvaElement.siblings(`div:not([id^=alliance-${sector.firstRoomName}])`).remove();

				var correctRooms = canvaElement.siblings(`div[id^=alliance-${sector.firstRoomName}]`);

				if (correctRooms.length == 0){
					var x = 0;
					var y = 0;
					var rooms = sector.rooms.split(',');

					for(var i = 0; i < rooms.length; i++){
						
						var roomName = rooms[i];

						if (i % 4 == 0 && i != 0){
							y = 1;
							x += 1;
						}else{
							y += 1;
						}

						if (!worldMap.roomStats[roomName] || !worldMap.roomStats[roomName].own){
							continue;
						}

						var username = worldMap.roomUsers[worldMap.roomStats[roomName].own.user].username;
						var allianceName = module.exports.userToAlliance[username];

						if (module.exports.userToAlliance[username] && module.exports.alliances[allianceName]){
							var id = "alliance-" + sector.firstRoomName + "-" + roomName;

							if (!document.getElementById(id)){
								
								var left = (x + 1) * 50 - 50;
								var top = (y - 1) * 50;
								var newEle = document.createElement("div");
								var css = `z-index: 1;
									height: 50px;
									width: 50px;
									position: absolute;
									left: ${left}px;
									top: ${top}px;`;

								if (module.config && module.config.background === "Image"){
									var url = "http://www.leagueofautomatednations.com/obj/" + module.exports.alliances[allianceName].logo;

									css += `background-image: url("${url}");
										background-size: 50px 50px;
										opacity : 0.2;`;
								}else{
									var c = module.exports.hexToRgb(module.exports.alliances[allianceName].color);
									c.a = 0.3;

									css += `background: rgba(${c.r},${c.g},${c.b},${c.a});`;
								}

								newEle.id = id;
								newEle.className = 'room-prohibited';
								newEle.setAttribute("style", css);
								canvaElement.after(newEle);
							}
						}
					}
				}
			}
		} else if (worldMap.zoom == 1){

			var sectorMapping = {};

			for(var sectorName in worldMap.sectors){
				var sector = worldMap.sectors[sectorName];

				sectorMapping[sector.firstRoomName] = sector;
			}

			var sectorElements = $(".map-sector.map-sector--zoom1.ng-scope");

			for(var sectorId in sectorElements){
				var sectorEle = sectorElements[sectorId];

				if (!sectorEle.style || !sectorEle.style.backgroundImage){
					continue;
				}

				var firstRoomName = sectorEle.style.backgroundImage.match(/zoom1\/(.*)\.png/).pop();

				var $sectorEle = $(sectorEle);
				var sector = sectorMapping[firstRoomName];
				if (sector){
					$sectorEle.find(`div:not([id^=alliance-1-${firstRoomName}])`).remove();

					var correctRooms = $sectorEle.find(`div[id^=alliance-1-${firstRoomName}]`);

					if (correctRooms.length == 0 && sector.rooms){
						var x = 0;
						var y = 0;
						var rooms = sector.rooms.split(',');

						for(var i = 0; i < rooms.length; i++){
							
							var roomName = rooms[i];

							if (i % 10 == 0 && i != 0){
								y = 1;
								x += 1;
							}else{
								y += 1;
							}

							if (!worldMap.roomStats[roomName] || !worldMap.roomStats[roomName].own){
								continue;
							}

							var username = worldMap.roomUsers[worldMap.roomStats[roomName].own.user].username;
							var allianceName = module.exports.userToAlliance[username];

							if (module.exports.userToAlliance[username] && module.exports.alliances[allianceName]){
								var id = "alliance-1-" + sector.firstRoomName + "-" + roomName;

								if (!document.getElementById(id)){
									var left = (x + 1) * 20 - 20;
									var top = (y - 1) * 20;
									var newEle = document.createElement("div");
									var css = `z-index: 1;
										height: 20px;
										width: 20px;
										position: absolute;
										left: ${left}px;
										top: ${top}px;`;

									if (module.config && module.config.background === "Image"){
										var url = "http://www.leagueofautomatednations.com/obj/" + module.exports.alliances[allianceName].logo;

										css += `background-image: url("${url}");
											background-size: 20px 20px;
											opacity : 0.2;`;
									}else{
										var c = module.exports.hexToRgb(module.exports.alliances[allianceName].color);
										c.a = 0.3;

										css += `background: rgba(${c.r},${c.g},${c.b},${c.a});`;
									}

									newEle.id = id;
									newEle.className = 'room-prohibited';
									newEle.setAttribute("style", css);
									$sectorEle.append(newEle);
								}
							}
						}
					}

				}
			}
		}
		else{
			$("div[id^=alliance-]").remove();
		}

	});
}

module.exports.hexToRgb = function (hex) {
	if (!hex){
		return {
			r: 255,
			g: 255,
			b: 255,
		}
	}

	var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
	hex = hex.replace(shorthandRegex, function(m, r, g, b) {
		return r + r + g + g + b + b;
	});

	var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result ? {
		r: parseInt(result[1], 16),
		g: parseInt(result[2], 16),
		b: parseInt(result[3], 16)
	} : null;
}

module._init();
