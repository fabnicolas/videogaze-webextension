var make_room = function(roomcode, stream_type, stream_key, callback) {
  if(callback==undefined) callback=null;

  Room.init(roomcode,
    {'stream_type': stream_type, 'stream_key': stream_key},
    function(response) {
      if(response.status == 1){
        GLOBAL_roomcode=response.message.roomcode;
        if(callback!==null) callback();
      }
    }
  );
}