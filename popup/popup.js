var _video_tabs = [];
var popup_port = null;

// Checks for videogaze injection
var inject_videogaze_once = function(callback) {
	chrome_get_active_tab(actual_tab => {
		if(!_video_tabs[actual_tab.id]) inject_videogaze(callback);
	});
}

var inject_videogaze = function(callback) {
	chrome_get_active_tab(actual_tab => {
		chrome_tabs_executeScripts(
			actual_tab.id,
			['/js/chrome/base.js', '/cs/cs.js', '/js/utils.js', '/global.js', '/room.js'],
			function(){callback();}
		);
	});
}

var on_port_open = function(callback) {
	if(popup_port == null) {
		popup_port = chrome.runtime.connect({name: "popup-port"});
		popup_port.onMessage.addListener(function(message) {
			if(message.init) callback();
			if(message.video_tabs){
				_video_tabs = message.video_tabs;
				chrome_get_active_tab(actual_tab => {
					if(_video_tabs[actual_tab.id]){
						document.getElementById('room_details').innerText = 'Room code = ' + 
							_video_tabs[actual_tab.id].roomcode;
					}
				});
			}
		});
		popup_port.postMessage({init: true});
	} else {
		callback();
	}
}


var message_room = function(message_to_send) {
	if(message_to_send === undefined) message_to_send = null;
	on_port_open(function() {
		if(popup_port != null) popup_port.postMessage(message_to_send);
		else console.log("Error: port is null in popup.js");
	});
}

var onclick_make_room = function() {
	inject_videogaze_once(function() {
		message_room({action: "room", roomcode: null});
	});
}

var onclick_join_room = function() {
	inject_videogaze_once(function() {
		message_room({action: "room", roomcode: document.getElementById('text_roomcode').value});
	});
}

window.onload = function() {
	message_room({action: 'getdata'});
}



document.getElementById('button_make_room').addEventListener('click', onclick_make_room);
document.getElementById('button_join_room').addEventListener('click', onclick_join_room);
