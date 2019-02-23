var _video_tabs = [];

Communicator.listen_to('port-popup', function(message){
  if(message.video_tabs) {
    _video_tabs = message.video_tabs;
    chrome_get_active_tab(actual_tab => {
      if(_video_tabs[actual_tab.id]) {
        document.getElementById('room_details').innerText = 'Room code = ' +
          _video_tabs[actual_tab.id].roomcode;
      }
    });
  }
});

var port_message = function(message){
  Communicator.on_port_open('port-popup', function(){
    Communicator.message('port-popup', message);
  }); 
}

var onclick_make_room = function() {
  port_message({action: 'room', roomcode: null});
}

var onclick_join_room = function() {
  port_message({action: 'room', roomcode: document.getElementById('text_roomcode').value});
}

window.onload = function() {
  port_message({action: 'getdata'});
}

document.getElementById('button_make_room').addEventListener('click', onclick_make_room);
document.getElementById('button_join_room').addEventListener('click', onclick_join_room);

// Internationalization code bindings
document.getElementById('popup_title').innerText = _lang('popup_title');
document.getElementById('popup_to_start').innerText = _lang('popup_to_start');
document.getElementById('button_make_room').innerText = _lang('button_make_room');
document.getElementById('insert_room_code_here').innerText = _lang('insert_room_code_here');
document.getElementById('button_join_room').innerText = _lang('button_join_room');
