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

  var detect_video = function(callback) {
    videoplayer = null;
    if((videoplayer = document.getElementsByTagName('video')[0]) === undefined) {
      setTimeout(detect_video.bind(callback), 500);
    } else {
      // Video is found!
      callback(videoplayer);
    }
  }

  var start_video_detection = function() {
    detect_video(function(videoplayer) {
      var videoplayer_detected = function(_videoplayer) {
        open_port(function() {
          port_detector.sendMessage({video_detected: true, videoplayer: _videoplayer});
        });
      }

      if(videoplayer.readyState == 4) {
        videoplayer_detected(videoplayer);
      } else {
        videoplayer.addEventListener('canplay', function onCanplay_done(e) {
          videoplayer_detected(videoplayer);
          videoplayer.removeEventListener('canplay', onCanplay_done);
        });
      }
    });
  }

  var clearAllIntervals = function(callback) {
    if(callback === undefined) callback = null;
    chrome_storage_get_attribute("clear_all_intervals", can_clear => {
      if(can_clear) for(var i = 1;i < 999999;i++) window.clearInterval(i);
      if(callback != null) callback();
    })
  }


  if(document.readyState == "ready" || document.readyState == "complete") {
    clearAllIntervals(function(){
      start_video_detection();
    });
  } else {
    window.onload = function() {
      clearAllIntervals(function(){
        start_video_detection();
      });
    }
  }
})();