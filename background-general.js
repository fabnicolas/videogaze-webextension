(function() {
  console.log("background-general.js injected automatically.");

  var data = {code: null};
  var port_popup = null, port_cs = null;

  chrome.tabs.onActivated.addListener(function(activeInfo) {
    console.log(activeInfo.tabId);
  });

  chrome.runtime.onConnect.addListener(function(connecting_port) {
    if(connecting_port.name == "popup-port") {
      port_popup = connecting_port;
      /* Handle popup script connection */
      port_popup.onMessage.addListener(function(message) {
        if(message.init) port_popup.postMessage(message);

        // Tell CS to perform room initialization
        if(message.action == "room" && port_cs != null) port_cs.postMessage(message);
        if(message.action == "getdata") port_popup.postMessage({code: data.code});
      });
    } else if(connecting_port.name == "cs-port") {
      port_cs = connecting_port;
      /* Handle content script connection */
      port_cs.onMessage.addListener(function(message) {
        if(message.init && port_popup != null) port_popup.postMessage(message);

        // Store roomcode and tell popup script to show the roomcode
        if(message.code) {
          data.code = message.code;
          port_popup.postMessage(message);
        }
      });
    }
  });
})();