(function() {
	console.log('Lo script è stato iniettato nella pagina web.');

	// Ottieni l'oggetto del video player
	var _videoplayer = document.getElementsByTagName('video')[0];
	GLOBAL_roomcode=null;
	make_room(GLOBAL_roomcode, 'extension', window.location.toString(), function(){
		Room.attach_html5_video_handler(_videoplayer, function(){
			
		});
	});
})();