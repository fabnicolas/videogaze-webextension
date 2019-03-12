var Room_Maker = (function() {
  var current_video_url = function() {
    return window.location.toString().split("#")[0];
  }

  var make_room = function(roomcode, callback) {
    if(roomcode === undefined) roomcode = null;

    Room.on_url_change_listener(function(new_url) {
      if(current_video_url() !== new_url)
        window.location = new_url;
    });

    Room.init(GLOBAL.backend_url, roomcode, {'stream_type': 'extension', 'stream_key': current_video_url()}, function(response) {
      if(response.status == 1) callback(response.message.roomcode);
    });
  }

  var install_content_room = function(videoplayer, callback) {
    Room.attach_html5_video_handler(videoplayer, callback);
  }

  return {
    make_room: make_room,
    install_content_room: install_content_room,
    current_video_url: current_video_url    
  }
})();