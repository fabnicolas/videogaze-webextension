var Communicator = (function() {
  var ports = {};
  var message_listeners = {};

  var message = function(port_name, message) {
    ports[port_name].postMessage({...ports[port_name].data, ...{message: message}});
  }

  var listen_to = function(port_name, callback) {
    message_listeners[port_name] = callback;
  }

  var open_port = function(port_name, callback) {
    ports[port_name] = chrome.runtime.connect({name: port_name});
    ports[port_name].data = {};
    ports[port_name].onMessage.addListener(function(message) {
      if(message.background_ready) {
        ports[port_name].data = {tab_id: message.tab_id, frame_id: message.frame_id};
        callback();
      }
      if(message_listeners[port_name]) message_listeners[port_name](message);
    });
    message(port_name, {init: true});
  }

  var on_port_open = function(port_name, callback) {
    if(ports[port_name] === undefined) open_port(port_name, callback);
    else callback();
  }

  return {
    message: message,
    on_port_open: on_port_open,
    listen_to: listen_to
  }
})();