(function() {
	console.log("VideoGaze Content Script (cs.js) injected into webpage!");

	var videoplayer = document.getElementsByTagName('video')[0];
	
	/* port-cs connects with background script, which is indirectly connected to popup script */
	Communicator.listen_to('port-cs', function(message) {
		// If background script sends action "room"
		if(message.action == "room") {
			Room_Maker.make_room(message.roomcode, function(roomcode){
				finalize_room(roomcode);
			})
		}

		if(message.action == "change_room"){
			Room_Maker.make_room(message.roomcode, function(roomcode){
				Room.set_stream('extension', Room_Maker.current_video_url(), function(){
					finalize_room(roomcode);
				});
			})
		}
	});

	var finalize_room = function(roomcode){
		window.history.replaceState({}, document.title, Room_Maker.current_video_url()+"#roomcode="+roomcode);
		Room_Maker.install_content_room(videoplayer, function(){
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