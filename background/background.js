(function() {
  console.log("background.js injected automatically.");

  var data = {code: null};
  var port_popup = null, port_cs = null;
  
  var video_tabs = [];

  chrome.tabs.onUpdated.addListener(function(tab_id, change_info, tab) {
    if(change_info.status == "loading" && change_info.url) {
      console.log("URL cambiato in: " + change_info.url + " nella tab: " + tab_id);
    }
  });


  chrome.runtime.onConnect.addListener(function(connecting_port) {
    if(connecting_port.name == "popup-port") {
      port_popup = connecting_port;
      /* Handle popup script connection */
      port_popup.onMessage.addListener(function(message) {
        if(message.init) port_popup.postMessage(message);

        // Tell CS to perform room initialization
        if(message.action == "room" && port_cs != null)
          port_cs.postMessage(message);
        if(message.action == "getdata")
          port_popup.postMessage({
            code: data.code,
            video_tabs: video_tabs
          });
      });
    } else if(connecting_port.name == "cs-port") {
      port_cs = connecting_port;
      /* Handle content script connection */
      port_cs.onMessage.addListener(function(message) {
        if(message.init && port_popup != null) port_popup.postMessage(message);

        // Store roomcode and tell popup script to show the roomcode
        if(message.code) {
          data.code = message.code;
          chrome_get_active_tab(actual_tab => video_tabs.push(actual_tab));
          port_popup.postMessage(message);
        }
      });
    }
  });
})();