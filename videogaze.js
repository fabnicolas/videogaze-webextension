(function() {
	console.log('Lo script è stato iniettato nella pagina web.');

	// Ottieni l'oggetto del video player
	var _videoplayer = document.getElementsByTagName('video')[0];
	var _event_handlers = [];

	_event_handlers['loadedmetadata']=function(e){
		console.log('Video started.');
	};

	_event_handlers['pause']=function(e){
		console.log('Video paused.');
	}

	_event_handlers['play']=function(e){
		console.log('Video play.');
	}

	_event_handlers['seeking']=function(e){
		console.log('Video is seeking...');
	}

	_event_handlers['seeked']=function(e){
		console.log('Video seeked.');
	}

	_event_handlers['playing']=function(e){
		console.log('Video is playing...');
	}

	_event_handlers['waiting']=function(e){
		console.log('Video in buffering...');
	}

	attach_events(_videoplayer, _event_handlers);
})();