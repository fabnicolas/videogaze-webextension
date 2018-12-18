(function(){
  console.log("background-general.js injected automatically.");
  
  var data = {code: null};
  var port_popup = null, port_cs = null;

  chrome.runtime.onConnect.addListener(function(connecting_port) {
    console.log("Detected port name: "+connecting_port.name);

    if(connecting_port.name == "popup-port") {
      port_popup = connecting_port;
      port_popup.onMessage.addListener(function(message) {
        if(message.init) port_popup.postMessage(message);
        if(message.action == "room" && port_cs!=null) port_cs.postMessage(message);
      });
    } else if(connecting_port.name == "cs-port") {
      port_cs = connecting_port;
      port_cs.onMessage.addListener(function(message) {
        if(message.init && port_popup!=null) port_popup.postMessage(message);
        if(message.code){
          data.code=message.code;
          port_popup.postMessage(message);
        }
      });
    }
  });
})();