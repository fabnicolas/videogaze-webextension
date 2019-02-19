(function() {
  console.log("VideoGaze Detector (video_detector.js) injected into webpage!");

  var port_detector = null;
  var open_port = function(callback) {
    if(port_detector == null) {
      port_detector = chrome.runtime.connect({name: 'port-detector'});
      port_detector.onMessage.addListener(function(message) {
        if(message.background_ready) callback();
      });
      port_detector.postMessage({video_detected: true});
    } else {
      callback();
    }
  }

  var on_video_player_ready = function(callback) {
    videoplayer = null;
    if((videoplayer = document.getElementsByTagName('video')[0]) === undefined) {
      setTimeout(on_video_player_ready.bind(callback), 500);
    } else {
      console.log("Ho trovato il video!");
      callback(videoplayer);
    }
  }

  var start_video_detection = function() {
    on_video_player_ready(function(videoplayer) {
      console.log(videoplayer);

      var do_stuff = function() {
        open_port(function() {
          port_detector.sendMessage({video_detected: true, videoplayer: videoplayer});
        });
      }

      if(videoplayer.readyState == 4) {
        do_stuff();
      } else {
        videoplayer.addEventListener('canplay', function onCanplay_done(e) {
          do_stuff();
          videoplayer.removeEventListener('canplay', onCanplay_done);
        });
      }
    });
  }

  if(document.readyState == "ready" || document.readyState == "complete") {
    start_video_detection();
  } else {
    window.onload = start_video_detection();
  }
})();