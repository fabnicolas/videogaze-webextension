(function() {
	console.log("VideoGaze Content Script (cs.js) injected into webpage!");

	var videoplayer = document.getElementsByTagName('video')[0];
	
	/* port-cs connects with background script, which is indirectly connected to popup script */
	Communicator.listen_to('port-cs', function(message) {
		// If background script sends action "room"

		if(message.action == "room") {
			make_room_cs(message.roomcode);
		}

		if(message.action == "change_room"){
			Room.on_url_change_listener(function(new_url) {
				console.log(window.location.toString());
				if(window.location.toString() !== new_url)
					window.location = new_url;
			});

			Room.init(GLOBAL.backend_url, message.roomcode, {'stream_type': 'extension', 'stream_key': window.location.toString()}, function(response) {
				if(response.status == 1) {
					Room.set_stream('extension', message.url, function(){
						Room.attach_html5_video_handler(videoplayer);
						port_message({code: response.message.roomcode});
					});
				}
			});
		}
	});

	var make_room_cs = function(roomcode){
		Room_Maker.make_room(roomcode, videoplayer, function(roomcode) {
			// When room is made, send code back to background script (which communicates it to the popup).
			port_message({code: roomcode});
		});
	}

	var port_message = function(message) {
		Communicator.on_port_open('port-cs', function() {
			Communicator.message('port-cs', message);
		});
	}

	var on_page_load = function() {
		port_message({});
	}
	
	if(document.readyState == "ready" || document.readyState == "complete") {
		on_page_load();
	} else {
		window.onload = on_page_load;
	}
})();