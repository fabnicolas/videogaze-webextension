(function() {
  console.log("background.js injected automatically.");

  var port_popup = null, port_cs = null;
  var tabs = {}
  var video_tabs = {};

  // When extension loads, map inside tabs all URLs of all opened tabs
  chrome.tabs.getAllInWindow(null, function(all_tabs){
    for(var i=0; i<all_tabs.length; i++){
      tabs[all_tabs[i].id]=all_tabs[i].url;             
    }
  });

  // When an URL changes, reflect the change into tabs object
  chrome.tabs.onUpdated.addListener(function(tab_id, change_info, tab) {
    if(change_info.status == "loading" && change_info.url) {
      tabs[tab_id]=change_info.url;
    }
  });

  var handler_popup_port = function(message) {
    // Forward INIT message to POPUP
    if(message.init) port_popup.postMessage(message);

    // Tell CS to perform room initialization
    if(message.action == "room" && port_cs != null)
      port_cs.postMessage(message);
    if(message.action == "getdata")
      port_popup.postMessage({video_tabs: video_tabs});
  };

  var handler_cs_port = function(message) {
    // If message has INIT, Forward INIT message from CS script to POPUP
    if(message.init && port_popup != null) port_popup.postMessage(message);

    // If message has CODE, store roomcode and tell popup script to show the roomcode
    if(message.code) {
      chrome_get_active_tab(actual_tab => {
        video_tabs[actual_tab.id] = {roomcode: message.code};
        port_popup.postMessage({video_tabs: video_tabs});
      });
    }
  };


  // Initialize ports
  chrome.runtime.onConnect.addListener(function(connecting_port) {
    if(connecting_port.name == "popup-port") {
      port_popup = connecting_port;
      /* Handle popup script connection */
      port_popup.onMessage.addListener(handler_popup_port);
    } else if(connecting_port.name == "cs-port") {
      port_cs = connecting_port;
      /* Handle content script connection */
      port_cs.onMessage.addListener(handler_cs_port);
    }
  });
})();