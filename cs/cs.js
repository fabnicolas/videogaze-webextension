(function() {
	console.log("cs.js injected...");

	/* cs-port connects with background script, which is indirectly connected to popup script */
	var port_cs = chrome.runtime.connect({name: "cs-port"});
	port_cs.onMessage.addListener(function(message) {
		// If background script sends action "room"
		if(message.action == "room")
			make_room(message.roomcode, _videoplayer, function(roomcode) {
				// When room is made, send code back to background script (which communicates it to the popup).
				port_cs.postMessage({code: roomcode});
			});
	});

	_videoplayer = null;

	var detect_video_player = function() {
		if((_videoplayer = document.getElementsByTagName('video')[0]) === undefined){
			setTimeout(tryhard, 500);
		} else {
			console.log("Video player detected. Attaching event loadedmetadata.")
			if(_videoplayer.readyState==4){
				port_cs.postMessage({init: true});
			}else{
				_videoplayer.addEventListener('canplay', function onCanplay_done(e) {
					port_cs.postMessage({init: true});
					_videoplayer.removeEventListener('canplay', onCanplay_done);
				});
			}
		};
	}
	
	if(document.readyState == "ready" || document.readyState == "complete"){
		console.log("test");
		detect_video_player();
	}else{
		window.onload=detect_video_player();
	}

})();