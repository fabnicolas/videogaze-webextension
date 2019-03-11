(function() {
  console.log("background.js injected automatically.");

  var port_popup = {}, port_cs = {}, port_detector = {};
  var tabs = {}
  var video_tabs = {};
  var overlay_tabs = {};

  var define_object = function(param_object) {
    if(param_object === undefined) param_object = {};
    return param_object;
  }

  /**
   * Inject VideoGaze in current tab only once.
   * 
   * @param {function} callback 
   */
  var inject_videogaze_once = function(callback, tab_id) {
    if(!video_tabs[tab_id]) inject_videogaze(callback, tab_id);
  }

  /**
   * Inject VideoGaze in any tab you like.
   * 
   * Notice that this function injects /content-scripts/video_detector inside all frames.
   * That script is needed to check in which frame the other scripts should be injected.
   * 
   * If a video has been found, /content-scripts/video_detector will communicate it to /background so that
   * /background can perform injection in that specific frame.
   * 
   * @param {function} callback 
   * @param {int} tab_id The tab ID where VideoGaze should be injected.
   */
  var inject_videogaze = function(callback, tab_id) {
    if(callback === undefined) callback = null;
    if(tab_id === undefined) tab_id = null;

    // Inject VideoGaze Detector
    var inject_videogaze_func = function(tab_id) {
      chrome_tabs_executeScripts(
        tab_id,
        [
          {file: '/js/chrome/storage.js', allFrames: true},
          {file: '/js/chrome/communicator.js', allFrames: true},
          {file: '/content-scripts/video_detector.js', allFrames: true}
        ],
        function() {inject_videogaze_func_next1(tab_id);}
      );
    }

    // When VideoGaze Detector is injected, show frames details & store video tab callback
    var inject_videogaze_func_next1 = function(tab_id) {
      chrome.webNavigation.getAllFrames({tabId: tab_id}, function(frames) {
        video_tabs[tab_id] = define_object(video_tabs[tab_id]);
        video_tabs[tab_id].frameIds = [];
        for(var i = 0;i < frames.length;i++) {
          video_tabs[tab_id].frameIds.push(frames[i].frameId);
        }
      });

      video_tabs[tab_id] = define_object(video_tabs[tab_id]);

      (function(callback) {
        video_tabs[tab_id].on_frame_id_with_video_ready = function() {
          if(callback != null) callback();
          delete video_tabs[tab_id].on_frame_id_with_video_ready;
        }
      })(callback);
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
   * This function is automatically called when /content-scripts/video_detector has communicated to /background
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
        {file: '/js/room.js', frameId: frame_id},
        {file: '/js/room-middleware.js', frameId: frame_id},
        {file: '/content-scripts/cs.js', frameId: frame_id},
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

  var new_url_detected = {}, reload = {};

  // Listen for tabs changes (URL changed, refresh, etc.)
  chrome.tabs.onUpdated.addListener(function(tab_id, change_info, tab) {
    console.log("TAB_ID=" + tab_id + ", status=" + change_info.status + ", URL changed: " + change_info.url)

    // When page reloads, set reload flag on that tab and determine if URL has changed
    if(change_info.status == "loading") {
      reload[tab_id] = true;
      if(change_info.url) {
        new_url_detected[tab_id] = change_info.url;
        tabs[tab_id] = change_info.url;
      }
    }

    // When the page has finished loading, re-inject VideoGaze again in case of a video tab
    if(change_info.status == "complete" && change_info.url === undefined) {
      if(reload[tab_id]) {
        var previous_roomcode;
        console.log(video_tabs);
        if(video_tabs[tab_id]) previous_roomcode = video_tabs[tab_id].roomcode;
        else previous_roomcode = null;

        delete reload[tab_id];
        delete video_tabs[tab_id];
        delete port_cs[tab_id];
        delete port_popup[tab_id];
        delete overlay_tabs[tab_id];
      }

      var message_popup = null;

      if(previous_roomcode != null){
        message_popup = {action: 'change_room', roomcode: previous_roomcode};
      }else if(new_url_detected[tab_id]){
        var hash_roomcode = HashRouting(new_url_detected[tab_id]).get_parameter("roomcode");
        if(hash_roomcode){
          message_popup = {action: 'room', roomcode: hash_roomcode};
        }
      }

      // If the room is a video room or should be it, inject VideoGaze
      if(message_popup != null){
        inject_videogaze(function() {
          handler_port_popup({
            tab_id: tab_id,
            message: message_popup
          });
        }, tab_id);
      }

      // URL analyzed; discard it after processing
      if(new_url_detected[tab_id]) {
        new_url_detected[tab_id] = false;
      }
    }
  });

  // Utility function to check if port_popup is open
  var is_popup_port_open = function(tab_id) {
    return port_popup[tab_id] != null && (chrome.extension.getViews({type: "popup"}).length > 0);
  }

  /* [PORT HANDLERS] */

  var handler_port_popup = function(packet) {
    // Tell CS to perform room initialization
    if(packet.message.action == "room" || packet.message.action == "change_room") {
      var action = function() {
        port_cs[packet.tab_id].postMessage(packet.message);
      }
      if(port_cs[packet.tab_id] == null) inject_videogaze_once(action, packet.tab_id);
      else action();
    }

    if(packet.message.action == "get_data")
      port_popup[packet.tab_id].postMessage({video_tabs: video_tabs, tab_id: packet.tab_id});

    if(packet.message.action == "overlay")
      if(packet.message.data == "overlay_close")
        overlay_tabs[packet.tab_id] = 'closed';
  };

  var handler_port_cs = function(packet) {
    // If message has INIT, Forward INIT message from CS script to POPUP
    if(packet.message.init && is_popup_port_open(packet.tab_id)) {
      port_popup[packet.tab_id].postMessage({background_ready: true});
    }
    // If message has CODE, store roomcode and tell popup script to show the roomcode
    if(packet.message.code) {
      video_tabs[packet.tab_id].roomcode = packet.message.code;
      if(port_popup[packet.tab_id])
        port_popup[packet.tab_id].postMessage({video_tabs: video_tabs, tab_id: packet.tab_id});
    }
  };

  var handler_port_detector = function(packet) {
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
            {file: '/content-scripts/video_detector.js', frameId: new_frame_id}
          ]
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
      // There can be multiple popups since we are using content script overlays at the end
      var target_tab = connecting_port.sender.tab.id;
      port_popup[target_tab] = connecting_port;
      port_popup[target_tab].onMessage.addListener(handler_port_popup);
      port_popup[target_tab].postMessage({
        background_ready: true,
        tab_id: target_tab,
        frame_id: 0
      });
    } else if(connecting_port.name == "port-cs") {
      // There can be multiple tabs with VideoGaze content scripts injected

      var target_tab = connecting_port.sender.tab.id;
      port_cs[target_tab] = connecting_port;
      port_cs[target_tab].onMessage.addListener(handler_port_cs);
      port_cs[target_tab].postMessage({
        background_ready: true,
        tab_id: target_tab,
        frame_id: 0
      });
    } else if(connecting_port.name == "port-detector") {
      // There can be multiple tabs with multiple frame IDs with VideoGaze detector injected
      var target_tab = connecting_port.sender.tab.id;
      var target_frame = connecting_port.sender.frameId;
      if(port_detector[target_tab] === undefined)
        port_detector[target_tab] = {};
      port_detector[target_tab][target_frame] = connecting_port;
      port_detector[target_tab][target_frame].onMessage.addListener(handler_port_detector);
      port_detector[target_tab][target_frame].postMessage({
        background_ready: true,
        tab_id: target_tab,
        frame_id: target_frame
      });
    }
  });

  chrome.browserAction.onClicked.addListener(function(tab) {
    var inject_popup_ui = function() {
      chrome_get_active_tab(actual_tab => {
        if(overlay_tabs[actual_tab.id] === undefined) {
          inject_popup_ui_next1(actual_tab.id, function() {
            overlay_tabs[actual_tab.id] = 'opened';
          });
        } else if(overlay_tabs[actual_tab.id] == 'closed') {
          port_popup[actual_tab.id].postMessage({overlay_open: true});
          overlay_tabs[actual_tab.id] = 'opened';
        }
      });
    }

    var inject_popup_ui_next1 = function(tab_id, callback) {
      chrome_tabs_executeScripts(
        tab_id,
        [
          {file: '/js/chrome/base.js'},
          {file: '/js/chrome/internationalization.js'},
          {file: '/js/chrome/communicator.js'},
          {file: '/popup-overlay/popup-controls.js'},
          {file: '/popup-overlay/popup-overlay.js'}
        ],
        callback
      );
    }

    inject_popup_ui();
  });
})();