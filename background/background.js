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

    // Inject VideoGaze Detector
    var inject_videogaze_func = function(tab_id) {
      chrome_tabs_executeScripts(
        tab_id,
        [
          {file: '/js/chrome/storage.js', allFrames: true},
          {file: '/js/chrome/communicator.js', allFrames: true},
          {file: '/cs/video_detector.js', allFrames: true}
        ],
        function() {inject_videogaze_func_next1(tab_id);}
      );
    }

    // When VideoGaze Detector is injected, show frames details & store video tab callback
    var inject_videogaze_func_next1 = function(tab_id) {
      chrome.webNavigation.getAllFrames({tabId: tab_id}, function(frames) {
        if(video_tabs[tab_id] === undefined) video_tabs[tab_id] = {};
        video_tabs[tab_id].frameIds = [];
        for(var i = 0;i < frames.length;i++) {
          video_tabs[tab_id].frameIds.push(frames[i].frameId);
        }
      });

      if(video_tabs[tab_id] === undefined) video_tabs[tab_id] = {};
      video_tabs[tab_id].on_frame_id_with_video_ready = callback;
    }

    // If tab_id argument is not provided, detect the actual tab ID, else use tab_id value
    if(tab_id == null) {
      chrome_get_active_tab(actual_tab => {
        inject_videogaze_func(actual_tab.id);
      });
    } else {
      inject_videogaze_func(tab_id);
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
  var inject_videogaze_finalize = function(callback, tab_id, frame_id) {
    chrome_tabs_executeScripts(
      tab_id,
      [
        {file: '/js/chrome/base.js', frameId: frame_id},
        {file: '/js/utils.js', frameId: frame_id},
        {file: '/global.js', frameId: frame_id},
        {file: '/room.js', frameId: frame_id},
        {file: '/cs/cs.js', frameId: frame_id},
      ],
      callback
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

  var handler_popup_port = function(packet) {
    // If popup script requests INIT, tell popup script that init is completed
    if(packet.message.init){
      port_popup.postMessage({background_ready: true});
    }

    // Tell CS to perform room initialization
    if(packet.message.action == "room") {
      chrome_get_active_tab(actual_tab => {
        var action = function() {port_cs[actual_tab.id].postMessage(packet.message);}
        if(port_cs[actual_tab.id] == null) inject_videogaze_once(action);
        else action();
      });
    }

    if(packet.message.action == "getdata")
      port_popup.postMessage({video_tabs: video_tabs});
  };

  var handler_cs_port = function(packet) {
    // If message has INIT, Forward INIT message from CS script to POPUP
    if(packet.message.init && is_popup_port_open()) port_popup.postMessage({background_ready: true});

    // If message has CODE, store roomcode and tell popup script to show the roomcode
    if(packet.message.code) {
      chrome_get_active_tab(actual_tab => {
        video_tabs[actual_tab.id].roomcode = packet.message.code;
        port_popup.postMessage({video_tabs: video_tabs});
      });
    }
  };

  var handler_detector_port = function(packet) {
    if(packet.message.new_iframe_found) {
      chrome.webNavigation.getAllFrames({tabId: packet.tab_id}, function(frames) {
        frames_vector = [];
        for(var i = 0;i < frames.length;i++) {
          frames_vector.push(frames[i].frameId);
        }
        var filteredArray = frames_vector.filter(function(x) {
          return video_tabs[packet.tab_id].frameIds.indexOf(x) < 0;
        });
        var new_frame_id = filteredArray[0];
        chrome_tabs_executeScripts(
          packet.tab_id,
          [
            {file: '/js/chrome/storage.js', frameId: new_frame_id},
            {file: '/js/chrome/communicator.js', frameId: new_frame_id},
            {file: '/cs/video_detector.js', frameId: new_frame_id}
          ],
          function() {}
        );
      });

    }
    if(packet.message.video_detected) {
      //if(video_tabs[packet.tab_id] === undefined) video_tabs[packet.tab_id] = {};
      video_tabs[packet.tab_id].frame_id = packet.frame_id;

      inject_videogaze_finalize(
        video_tabs[packet.tab_id].on_frame_id_with_video_ready,
        packet.tab_id,
        video_tabs[packet.tab_id].frame_id
      );
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
      if(port_detector[target_tab] === undefined)
        port_detector[target_tab] = {};
      port_detector[target_tab][target_frame] = connecting_port;
      port_detector[target_tab][target_frame].onMessage.addListener(handler_detector_port);
      port_detector[target_tab][target_frame].postMessage({
        background_ready: true,
        tab_id: target_tab,
        frame_id: target_frame
      });
    }
  });
})();