(function() {
  console.log("background.js injected automatically.");

  var port_popup = null, port_cs = null;
  var tabs = {}
  var video_tabs = {};

  var inject_videogaze_once = function(callback) {
    chrome_get_active_tab(actual_tab => {
      if(!video_tabs[actual_tab.id]) inject_videogaze(callback);
    });
  }

  var inject_videogaze = function(callback, tab_id) {
    if(tab_id === undefined) tab_id = null;

    var inject_videogaze_func = function(_callback, _tab_id) {
      chrome_tabs_executeScripts(
        _tab_id,
        ['/js/chrome/base.js', '/cs/cs.js', '/js/utils.js', '/global.js', '/room.js'],
        function() {_callback();}
      );
    }

    if(tab_id == null) {
      chrome_get_active_tab(actual_tab => {
        inject_videogaze_func(callback, actual_tab.id);
      });
    } else {
      inject_videogaze_func(callback, tab_id);
    }
  }

  // When extension loads, map inside tabs all URLs of all opened tabs
  chrome.tabs.getAllInWindow(null, function(all_tabs) {
    for(var i = 0;i < all_tabs.length;i++) {
      tabs[all_tabs[i].id] = all_tabs[i].url;
    }
  });

  // Listen for tabs changes (URL changed, refresh, etc.)
  chrome.tabs.onUpdated.addListener(function(tab_id, change_info, tab) {
    console.log("TAB_ID=" + tab_id + ", status=" + change_info.status + ", URL changed: " + change_info.url)
    // When an URL changes, reflect the change into tabs object
    if(change_info.status == "loading" && change_info.url)
      tabs[tab_id] = change_info.url;
    
    // When the page is reloaded: if the tab was a video tab, re-inject VideoGaze again
    if(change_info.status == "complete" && change_info.url === undefined) {
      if(video_tabs[tab_id]) {
        console.log("Trying to inject VideoGaze again");
        inject_videogaze(function() {
          port_cs.postMessage({
            action: "room",
            roomcode: video_tabs[tab_id].roomcode
          });
        }, tab_id);
      }
    }
  });

  var is_popup_port_open = function() {
    return port_popup != null && (chrome.extension.getViews({type: "popup"}).length > 0);
  }

  var handler_popup_port = function(message) {
    // If popup script requests INIT, tell popup script that init is completed
    if(message.init) port_popup.postMessage({is_init_completed: true});

    // Tell CS to perform room initialization
    if(message.action == "room") {
      var action = function() {port_cs.postMessage(message);}
      if(port_cs == null) inject_videogaze_once(action);
      else action();
    }

    if(message.action == "getdata")
      port_popup.postMessage({video_tabs: video_tabs});
  };

  var handler_cs_port = function(message) {
    // If message has INIT, Forward INIT message from CS script to POPUP
    if(message.init && is_popup_port_open()) port_popup.postMessage({is_init_completed: true});

    // If message has CODE, store roomcode and tell popup script to show the roomcode
    if(message.code) {
      chrome_get_active_tab(actual_tab => {
        video_tabs[actual_tab.id] = {roomcode: message.code};
        port_popup.postMessage({video_tabs: video_tabs});
      });
    }
  };


  // Initialize ports. Handle popup script and content script connections.
  chrome.runtime.onConnect.addListener(function(connecting_port) {
    if(connecting_port.name == "popup-port") {
      port_popup = connecting_port;
      port_popup.onMessage.addListener(handler_popup_port);
    } else if(connecting_port.name == "cs-port") {
      port_cs = connecting_port;
      port_cs.onMessage.addListener(handler_cs_port);
    }
  });
})();