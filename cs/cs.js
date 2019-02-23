(function() {
	console.log("VideoGaze Content Script (cs.js) injected into webpage!");

	var videoplayer = document.getElementsByTagName('video')[0];
	
	Communicator.listen_to('port-popup', function(message){
		if(message.video_tabs) {
			_video_tabs = message.video_tabs;
			chrome_get_active_tab(actual_tab => {
				if(_video_tabs[actual_tab.id]) {
					document.getElementById('room_details').innerText = 'Room code = ' +
						_video_tabs[actual_tab.id].roomcode;
				}
			});
		}
	});
	/* port-cs connects with background script, which is indirectly connected to popup script */
	var port_cs = chrome.runtime.connect({name: "port-cs"});
	port_cs.onMessage.addListener(function(message) {
		// If background script sends action "room"
		if(message.action == "room") {
			make_room(message.roomcode, videoplayer, function(roomcode) {
				// When room is made, send code back to background script (which communicates it to the popup).
				port_cs.postMessage({message: {code: roomcode}});
			});
		}
	});


})();