var chrome_tabs_executeScripts = function(tab_id, actions, final_callback) {
	var inject = function(tid, script, cb = null) {chrome.tabs.executeScript(tid, script, cb);}
	var callback = null;
	for(var i = 0;i < actions.length;i++) callback = inject(tab_id, actions[i], callback);
	final_callback();
}

var chrome_get_active_tab = function(callback) {
	chrome.tabs.query({currentWindow: true, active: true}, function(tabs) {
		callback(tabs[0].id);
	});
}

var inject_videogaze_once_done = false;
var inject_videogaze_once = function(callback) {
	if(!inject_videogaze_once_done) {
		inject_videogaze(callback);
		inject_videogaze_once_done = true;
	} else {
		console.log("Script already injected.");
	}
}
var inject_videogaze = function(callback) {
	chrome_get_active_tab(function(active_tab_id) {
		chrome_tabs_executeScripts(active_tab_id, [
			{file: 'general_functions.js'},
			{file: 'global.js'},
			{file: 'room.js'}
		], callback);
	});
}

var popup_port = null;

var on_port_open = function(callback) {
	if(popup_port == null) {
		popup_port = chrome.runtime.connect({name: "popup-port"});
		popup_port.onMessage.addListener(function(message) {
			if(message.init) callback();
			if(message.code) document.getElementById('room_details').innerText = 'Room code = ' + message.code;
		});
		popup_port.postMessage({init: true});
	} else {
		callback();
	}
}


var message_room = function(param_roomcode) {
	if(param_roomcode === undefined) param_roomcode = null;
	on_port_open(function() {
		if(popup_port != null) popup_port.postMessage({action: "room", roomcode: param_roomcode});
		else console.log("Error: port is null in popup.js");
	});
}

var onclick_make_room = function() {
	inject_videogaze_once(function() {
		message_room();
	});
}

var onclick_join_room = function() {
	inject_videogaze_once(function() {
		message_room(document.getElementById('text_roomcode').value);
	});
}





document.getElementById('button_make_room').addEventListener('click', onclick_make_room);
document.getElementById('button_join_room').addEventListener('click', onclick_join_room);
