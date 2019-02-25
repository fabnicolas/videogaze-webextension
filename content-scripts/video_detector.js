(function() {
  console.log("VideoGaze Detector (video_detector.js) injected into webpage!");
  
  var open_port = function(callback){
    Communicator.on_port_open('port-detector', callback);
  }

  var port_message = function(message){
    Communicator.message('port-detector', message);
  }

  if(window.self === window.top) {
    // If we are in frame 0 (The current page), let's observe body for new iframes.
    var mutationObserver = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if(mutation.addedNodes && mutation.addedNodes[0] && mutation.addedNodes[0].tagName=="IFRAME"){
          console.log(mutation.addedNodes[0]);
          mutation.addedNodes[0].addEventListener('load', report_iframe);
        }
      });
    });

    var report_iframe = function(){
      open_port(function(){
        port_message({new_iframe_found: true});
      })
    }

    mutationObserver.observe(document.body, {
      attributes: false,
      characterData: false,
      childList: true,
      subtree: true,
      attributeOldValue: false,
      characterDataOldValue: false
    });
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
    console.log("Starting video detection...");
    detect_video(function(videoplayer) {
      var videoplayer_detected = function(_videoplayer) {
        open_port(function() {
          port_message({video_detected: true});
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
    callback();
/*
    if(callback === undefined) callback = null;
    chrome_storage_get_attribute("clear_all_intervals", can_clear => {
      if(can_clear) for(var i = 1;i < 999999;i++) window.clearInterval(i);
      if(callback != null) callback();
    })*/
  }


  if(document.readyState == "ready" || document.readyState == "complete") {
    clearAllIntervals(function() {
      start_video_detection();
    });
  } else {
    window.onload = function() {
      clearAllIntervals(function() {
        start_video_detection();
      });
    }
  }
})();