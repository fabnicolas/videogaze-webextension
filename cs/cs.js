(function() {
	console.log("VideoGaze Content Script (cs.js) injected into webpage!");

  

	/* cs-port connects with background script, which is indirectly connected to popup script */
	var port_cs = chrome.runtime.connect({name: "cs-port"});
	port_cs.onMessage.addListener(function(message) {
		// If background script sends action "room"
		if(message.action == "room"){
			on_video_player_ready(message.roomcode, function(__roomcode){
        make_room(__roomcode, _videoplayer, function(roomcode) {
          // When room is made, send code back to background script (which communicates it to the popup).
          port_cs.postMessage({code: roomcode});
        });
      });
    }
	});

	_videoplayer = null;

	var on_video_player_ready = function(roomcode, callback){
		if((_videoplayer = document.getElementsByTagName('video')[0]) === undefined){
      console.log("Non ho trovato il video.");
			setTimeout(on_video_player_ready, 500);
		}else{
      console.log("Ho trovato il video!");
			callback(roomcode);
		}
	}

	var detect_video_player = function() {
		if((_videoplayer = document.getElementsByTagName('video')[0]) === undefined){
			setTimeout(detect_video_player, 500);
		} else {
			console.log("Video player detected. Attaching event loadedmetadata.")
			console.log(_videoplayer)
			
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
		detect_video_player();
	}else{
		window.onload=detect_video_player();
	}

})();