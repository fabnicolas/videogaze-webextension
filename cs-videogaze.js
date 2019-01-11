(function() {
	console.log("cs-videogaze.js injected...");

	/* cs-port connects with background script, which is indirectly connected to popup script */
	var port_cs = chrome.runtime.connect({name: "cs-port"});
	port_cs.onMessage.addListener(function(message) {
		// If background script sends action "room"
		if(message.action == "room")
			make_room(message.roomcode, function(roomcode) {
				// When room is made, send code back to background script (which communicates it to the popup).
				port_cs.postMessage({code: roomcode});
			});
	});
	port_cs.postMessage({init:true});
	
	// Detect video player [Works for most websites]
	var _videoplayer = document.getElementsByTagName('video')[0];

	function make_room(roomcode, callback) {
		if(roomcode === undefined) roomcode = null;

		Room.init(GLOBAL.backend_url, roomcode, {'stream_type': 'extension', 'stream_key': window.location.toString()}, function(response) {
			if(response.status == 1) {
				GLOBAL.actual_roomcode = response.message.roomcode;
				Room.attach_html5_video_handler(_videoplayer, function() {callback(GLOBAL.actual_roomcode)});
			}
		});
	}
})();