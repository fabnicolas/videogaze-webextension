(function() {
  console.log("background.js injected automatically.");

  var port_popup = null, port_cs = {}, port_detector = {};
  var tabs = {}
  var video_tabs = {};

  /**
   * Inject VideoGaze in current tab only once.
   * 
   * @param {function} callback 
   */
  var inject_videogaze_once = function(callback) {
    chrome_get_active_tab(actual_tab => {
      if(!video_tabs[actual_tab.id]) inject_videogaze(callback);
    });
  }

  /**
   * Inject VideoGaze in any tab you like.
   * 
   * Notice that this function injects /cs/video_detector inside all frames.
   * That script is needed to check in which frame the other scripts should be injected.
   * 
   * If a video has been found, /cs/video_detector will communicate it to /background so that
   * /background can perform injection in that specific frame.
   * 
   * @param {function} callback 
   * @param {int} tab_id The tab ID where VideoGaze should be injected.
   */
  var inject_videogaze = function(callback, tab_id) {
    if(tab_id === undefined) tab_id = null;

    var inject_videogaze_func = function(_callback, _tab_id) {
      chrome_tabs_executeScripts(
        _tab_id,
        [{file: '/cs/video_detector.js', allFrames: true}],
        function() {
          video_tabs[_tab_id].on_frame_id_ready = _callback;
        }
      )
    }

    if(tab_id == null) {
      chrome_get_active_tab(actual_tab => {
        inject_videogaze_func(callback, actual_tab.id);
      });
    } else {
      inject_videogaze_func(callback, tab_id);
    }
  }

  /**
   * Inject VideoGaze in any tab and frame you like.
   * 
   * This function is automatically called when /cs/video_detector has communicated to /background
   * that a video has been found in a specific frame id.
   * 
   * VideoGaze at that moment is ready to be injected then in that specific frame by using this function.
   * 
   * @param {function} callback 
   * @param {int} tab_id The tab ID where VideoGaze should be injected.
   * @param {int} frame_id The frame ID, inside a tab, where VideoGaze should be injected.
   */
  var inject_videogaze_finalize = function(callback, tab_id, frame_id){
    chrome_tabs_executeScripts(
      tab_id,
      [
        {file: '/js/chrome/base.js', frameId: frame_id},
        {file: '/js/utils.js', frameId: frame_id},
        {file: '/global.js', frameId: frame_id},
        {file: '/room.js', frameId: frame_id},
        {file: '/cs/cs.js', frameId: frame_id},
      ],
      function() {callback();}
    );
  }

  // When extension loads, map inside tabs all URLs of all opened tabs
  chrome.tabs.query({currentWindow: true}, function(all_tabs) {
    for(var i = 0;i < all_tabs.length;i++) {
      tabs[all_tabs[i].id] = all_tabs[i].url;
    }
  });

  // Listen for tabs changes (URL changed, refresh, etc.)
  chrome.tabs.onUpdated.addListener(function(tab_id, change_info, tab) {
    //console.log("TAB_ID=" + tab_id + ", status=" + change_info.status + ", URL changed: " + change_info.url)
    
    // When an URL changes, reflect the change into tabs object
    if(change_info.status == "loading" && change_info.url)
      tabs[tab_id] = change_info.url;

    // When the page is reloaded: if the tab was a video tab, re-inject VideoGaze again
    if(change_info.status == "complete" && change_info.url === undefined) {
      // VideoGaze tab reloading is actually not supported due to framing-architecture (19/02/2019).
      delete video_tabs[tab_id];

      /*
      if(video_tabs[tab_id]) {
        inject_videogaze(function() {
          chrome_get_active_tab(actual_tab => {
            port_cs[actual_tab.id].postMessage({
              action: "room",
              roomcode: video_tabs[tab_id].roomcode
            });
          });
        }, tab_id);
      }*/
    }
  });

  // Utility function to check if port_popup is open
  var is_popup_port_open = function() {
    return port_popup != null && (chrome.extension.getViews({type: "popup"}).length > 0);
  }

  /* [PORT HANDLERS] */

  var handler_popup_port = function(message) {
    // If popup script requests INIT, tell popup script that init is completed
    if(message.init) port_popup.postMessage({is_init_completed: true});

    // Tell CS to perform room initialization
    if(message.action == "room") {
      chrome_get_active_tab(actual_tab => {
        var action = function() {port_cs[actual_tab.id].postMessage(message);}
        if(port_cs[actual_tab.id] == null) inject_videogaze_once(action);
        else action();
      });
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
        video_tabs[actual_tab.id].roomcode = message.code;
        port_popup.postMessage({video_tabs: video_tabs});
      });
    }
  };

  var handler_detector_port = function(message) {
    if(message.video_detected) {
      chrome_get_active_tab(actual_tab => {
        inject_videogaze_finalize(
          video_tabs[actual_tab.id].on_frame_id_ready,
          actual_tab.id,
          video_tabs[actual_tab.id].frame_id
        );
      });
    }
  }

  /* [/PORT HANDLERS] */

  // Initialize ports. Handle popup, content and detector scripts messages.
  chrome.runtime.onConnect.addListener(function(connecting_port) {
    if(connecting_port.name == "port-popup") {
      // There is only one popup
      port_popup = connecting_port;
      port_popup.onMessage.addListener(handler_popup_port);
    } else if(connecting_port.name == "port-cs") {
      // There can be multiple tabs with VideoGaze content scripts injected
      var target_tab = connecting_port.sender.tab.id;
      port_cs[target_tab] = connecting_port;
      port_cs[target_tab].onMessage.addListener(handler_cs_port);
    } else if(connecting_port.name == "port-detector") {
      // There can be multiple tabs with multiple frame IDs with VideoGaze detector injected
      var target_tab = connecting_port.sender.tab.id;
      var target_frame = connecting_port.sender.frameId;
      port_detector[target_tab] = connecting_port;
      if(video_tabs[target_tab] === undefined) video_tabs[target_tab] = {};
      video_tabs[target_tab].frame_id = target_frame;
      port_detector[target_tab].onMessage.addListener(handler_detector_port);
    }
  });
})();