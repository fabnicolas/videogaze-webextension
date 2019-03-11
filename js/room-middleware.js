var Room_Maker = (function(){
  var getCurrentURL = function(){

  }

  var make_room = function(roomcode, videoplayer, callback) {
    if(roomcode === undefined) roomcode = null;
  
    Room.on_url_change_listener(function(new_url) {
      if(window.location.toString() !== new_url)
        window.location = new_url;
    });
  
    Room.init(GLOBAL.backend_url, roomcode, {'stream_type': 'extension', 'stream_key': window.location.toString()}, function(response) {
      if(response.status == 1) {
        Room.attach_html5_video_handler(videoplayer, function() {callback(response.message.roomcode)});
      }
    });
  }

  return {
    make_room: make_room
  }
})();