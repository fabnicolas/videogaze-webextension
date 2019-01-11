var is_videogaze_injected = chrome_storage_get_attribute('is_videogaze_injected') || false;
var inject_videogaze_once = function(callback) {
	if(!is_videogaze_injected) {
		inject_videogaze(callback);
		chrome_storage_set_attribute('is_videogaze_injected', true);
	} else {
		console.log("Script already injected.");
	}
}

var inject_videogaze = function(callback) {
	chrome_get_active_tab(function(active_tab_id) {
		chrome_tabs_executeScripts(active_tab_id, ['general_functions.js', 'global.js', 'room.js'], function(){
			callback();
		});
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
	inject_videogaze_once(function() {console.log("Invoked");message_room();});
}

var onclick_join_room = function() {
	inject_videogaze_once(function() {message_room(document.getElementById('text_roomcode').value);});
}

window.onload = function() {
	on_port_open(function() {popup_port.postMessage({action: 'getdata'});});
}



document.getElementById('button_make_room').addEventListener('click', onclick_make_room);
document.getElementById('button_join_room').addEventListener('click', onclick_join_room);
