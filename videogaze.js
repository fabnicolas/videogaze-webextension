(function() {
	console.log('Lo script è stato iniettato nella pagina web.');

	chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if(message.action == "room") {
			make_room(message.roomcode, function(roomcode){
				sendResponse({code: roomcode});
			});
    }
  });

	// Ottieni l'oggetto del video player
	var _videoplayer = document.getElementsByTagName('video')[0];

	function make_room(roomcode, callback){
		if(roomcode === undefined) roomcode=null;

		Room.init(GLOBAL.backend_url, roomcode, {'stream_type': 'extension', 'stream_key': window.location.toString()}, function(response) {
			if(response.status == 1) {
				GLOBAL.actual_roomcode=response.message.roomcode;
				Room.attach_html5_video_handler(_videoplayer, function() {callback(GLOBAL.actual_roomcode)});
			}
		});
	}
})();