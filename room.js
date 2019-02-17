/**
 * room.js is a script to create and manage rooms (along with videogaze backend).
 * 
 * This script has the following classes:
 * - DateTimeParser to generate timestamps using MySQL correct format;
 * - RoomHTTPEvents to communicate with backend (Supported modes: short polling, SSE as Server-Sent Events);
 * - SmartTimeout to manage events efficiently;
 * - Room to manage the room itself along with the HTML5 video player events (Video.js).
 * 
 * @author Fabio Crispino
*/

var DateTimeParser = (function() {
  /**
   * Get timestamp from a MySQL DateTime.
   * 
   * @param {string} date_str DateTime to parse.
   */
  var get_timestamp = function(date_str) {
    if(date_str === undefined) date_str = null;
    return new Date(date_str != null ? Date.parse(date_str) : Date.now()).getTime();
  }
  return {get_timestamp: get_timestamp}
})();

var RoomHTTPEvents = (function() {
  var _mode = 2; // 0=short polling, 1=long polling, 2=SSE
  var _backend_url;

  /**
   * Utility method to determine repetitivity of a function.
   * 
   * @param {string} repeat_data - Repeat data.
   * @param {string} repeat_typetocheck - Repeat type.
   */
  var repeat_checktype = function(repeat_data, repeat_typetocheck) {
    return repeat_data != null &&
      repeat_data.hasOwnProperty("repeat_type") &&
      repeat_data.repeat_type == repeat_typetocheck;
  }

  /**
   * Fetch data using XHR.
   * 
   * Parameters 'method' and 'url' are mandatory.
   * 
   * @param {string} method - Request method (Usually GET, POST).
   * @param {string} url - URL to target.
   * @param {FormData} form_data - Parameters as FormData object for request.
   * @param {int} xhr_timeout - Timeout for XHR request.
   * @param {object} repeat_data - Define when to repeat request. Example: {repeat_type: 'always', repeat_time: 250}. Supported values: ['onerror', 'always']
   * @param {function} callback - Callback invoked on success (data).
   */
  var xhr_fetch_data = function(method, url, form_data, xhr_timeout, repeat_data, callback) {
    if(form_data === undefined) form_data = null;
    if(xhr_timeout === undefined) xhr_timeout = 3000;
    if(repeat_data === undefined) repeat_data = null;
    if(callback === undefined) callback = null;

    var xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.timeout = xhr_timeout;

    xhr.onreadystatechange = function() {
      if(xhr.readyState == 4) {
        if(xhr.status == 200) {
          try {
            console.log('xhr_response', method, url, JSON.parse(xhr.response).message);
            if(callback != null) callback(JSON.parse(xhr.response));
            if(repeat_checktype(repeat_data, 'always')) {
              setTimeout(xhr_fetch_data(method, url, form_data, xhr_timeout, callback), repeat_data.repeat_time);
            }
          } catch(err) {
            alert("Error, data: " + xhr.response + "\n\n" + err.stack);
          }
        } else {
          if(repeat_checktype(repeat_data, 'onerror') || repeat_checktype(repeat_data, 'always')) {
            var rtime = null;
            if(xhr.status == 508) rtime = 5000;
            else rtime = repeat_data.repeat_time;
            setTimeout(xhr_fetch_data(method, url, form_data, xhr_timeout, callback), rtime);
          }
        }
      }
    };

    xhr.ontimeout = function() {
      console.log("XHR: onTimeout[" + method + ",URL=" + url + ",form_data=" + form_data + "]");
      if(repeat_checktype(repeat_data, 'onerror') || repeat_checktype(repeat_data, 'always')) {
        setTimeout(xhr_fetch_data(method, url, form_data, xhr_timeout, callback), repeat_data.repeat_time);
      }
    }

    xhr.onerror = function() {
      console.log("XHR: onError[" + method + ",URL=" + url + ",form_data=" + form_data + "]");
      if(repeat_checktype(repeat_data, 'onerror') || repeat_checktype(repeat_data, 'always')) {
        setTimeout(xhr_fetch_data(method, url, form_data, xhr_timeout, callback), repeat_data.repeat_time);
      }
    };

    if(form_data != null) xhr.send(form_data);
    else xhr.send();
  }

  /**
   * Fetch data using SSE (Server Sent Events).
   * 
   * Parameters 'method' and 'url' are mandatory.
   * 
   * @param {string} method - Request method (Usually GET, POST).
   * @param {string} url - URL to target.
   * @param {FormData} form_data - Parameters as FormData object for request.
   * @param {int} xhr_timeout - Timeout for XHR request.
   * @param {object} repeat_data - Define when to repeat request. Example: {repeat_type: 'always', repeat_time: 250}. Supported values: ['onerror', 'always']
   * @param {function} callback - Callback invoked on success (data).
   */
  var sse_fetch_data = function(method, url, form_data, xhr_timeout, repeat_data, callback) {
    if(form_data === undefined) form_data = null;
    if(xhr_timeout === undefined) xhr_timeout = 3000;
    if(repeat_data === undefined) repeat_data = null;
    if(callback === undefined) callback = null;

    if(typeof (EventSource) !== 'undefined') {
      var _loaded_url = url +
      "?mode=" + form_data.get('mode') + "&roomcode=" + form_data.get('roomcode');

      var source = new EventSource(_loaded_url);
      source.onerror = function(event) {
        console.log('SSE error:' + _loaded_url + " | "+JSON.stringify(event));
        source.close();
        if(repeat_checktype(repeat_data, 'onerror') || repeat_checktype(repeat_data, 'always')) {
          setTimeout(
            sse_fetch_data(method, url, form_data, xhr_timeout, repeat_data, callback),
            repeat_data.repeat_time);
        }
      };
      source.onmessage = function(event) {
        var server_message = JSON.parse(event.data);
        if(!(server_message.status == 0 && server_message.message == "SSE_CLOSE_CONNECTION")) {
          //console.log("SSE is actually working. 30 seconds timer.");
          callback(server_message);
        } else {
          source.close();
          if(repeat_checktype(repeat_data, 'always')) {
            setTimeout(
              sse_fetch_data(method, url, form_data, xhr_timeout, repeat_data, callback),
              repeat_data.repeat_time);
          }
        }
      }
    } else {
      xhr_fetch_data(method, url, form_data, xhr_timeout, repeat_data, callback);
    }
  }

  /**
   * Init endpoint caller.
   * This endpoint is used to initialize the room by providing roomcode and eventually additional data.
   * 
   * @param {string} roomcode - Roomcode of the room.
   * @param {array} extra_data - Additional parameters, like {var1: value1}.
   * @param {function} callback - Callback invoked on success (data).
   */
  var init = function(backend_url, roomcode, extra_data, callback) {
    if(roomcode === undefined) roomcode = null;
    if(extra_data === undefined) extra_data = null;
    if(callback === undefined) callback = null;

    _backend_url = backend_url;

    var fd = new FormData();

    fd.append("mode", "init_stream");
    fd.append("roomcode", roomcode);
    if(extra_data != null) for(var extra_data_param_name in extra_data) {
      fd.append(extra_data_param_name, extra_data[extra_data_param_name]);
    }

    xhr_fetch_data(
      'POST',
      _backend_url + 'room.php',
      fd, undefined, {repeat_type: 'onerror', repeat_time: 250}, callback
    );
  }

  /**
   * Requests endpoint caller.
   * Those endpoints are used to synchronize other video players.
   * 
   * @param {string} roomcode - Roomcode of the room.
   * @param {string} request_type - Request type (Like play, pause, change time).
   * @param {string} request_value - Request value (Like play value, pause value, current time).
   * @param {array} extra_data - Additional parameters, like {var1: value1}.
   * @param {function} callback - Callback invoked on success (data).
   */
  var request = function(roomcode, request_type, request_value, extra_data, callback) {
    if(extra_data === undefined) extra_data = null;
    if(callback === undefined) callback = null;

    var fd = new FormData();
    fd.append("mode", "request");
    fd.append("roomcode", roomcode);
    fd.append("request_type", request_type);
    fd.append("request_value", request_value);
    if(extra_data != null) for(var extra_data_param_name in extra_data) {
      fd.append(extra_data_param_name, extra_data[extra_data_param_name]);
    }

    xhr_fetch_data(
      'POST',
      _backend_url + 'room.php',
      fd, undefined, {repeat_type: 'onerror', repeat_time: 250}, callback
    );
  }

  /**
   * Sync endpoint caller.
   * This endpoint is used to synchronize video player executing this script.
   * 
   * @param {string} roomcode - Roomcode of the room.
   * @param {function} callback - Callback invoked on success (data).
   */
  var sync = function(roomcode, callback) {
    if(callback === undefined) callback = null;

    var fd = new FormData();
    fd.append("mode", "sync");
    fd.append("roomcode", roomcode);

    if(_mode == 0) {
      xhr_fetch_data(
        'POST',
        _backend_url + 'room.php',
        fd, undefined, {repeat_type: 'always', repeat_time: 250}, callback
      );
    } else if(_mode == 2) {
      sse_fetch_data(
        'POST',
        _backend_url + 'room.php',
        fd, undefined, {repeat_type: 'always', repeat_time: 250}, callback
      );
    }
  }

  // Class visibility.
  return {
    init: init,
    request: request,
    sync: sync
  }
})();

var SmartTimeout = (function() {
  var func_timeout_list = [];

  /**
   * Set a smart timeout.
   * 
   * @param {int} id - Function name.
   * @param {function} callback - Callback invoked on success (data).
   * @param {int} time - Delay.
   */
  var setSmartTimeout = function(id, callback, time) {
    if(func_timeout_list[id] == null) {
      func_timeout_list[id] = setTimeout(callback, time);
    } else {
      clearTimeout(func_timeout_list[id]);
      func_timeout_list[id] = null;
      setSmartTimeout(id, callback, time);
    }
  }
  return {setSmartTimeout: setSmartTimeout}
})();

var Room = (function() {
  var _roomdata = null;
  var _videoplayer = null;
  var _sync_enabled = false;
  var _is_attempting_requests = false;
  var _sync_ignore_events = false;
  var _local_last_ctime = 0;
  var _event_handlers = [];
  var _player_ready = false;

  // Returns room data.
  var get_data = function() {return _roomdata;}

  /**
   * Init room.
   * Parameters are optional.
   * 
   * @param {string} roomcode - Roomcode of the room.
   * @param {array} extra_data - Additional parameters, like {var1: value1}.
   * @param {function} callback - Callback invoked on success (data).
   */
  var init = function(backend_url, roomcode, extra_data, callback) {
    if(backend_url === undefined) backend_url = 'http://localhost:8080/videogaze-BE';
    if(roomcode === undefined) roomcode = null;
    if(extra_data === undefined) extra_data = null;
    if(callback === undefined) callback = null;

    RoomHTTPEvents.init(backend_url, roomcode, extra_data, function(response) {
      if(response.status == 1) {
        _roomdata = response.message;
        if(!response.message.hasOwnProperty("roomcode")) _roomdata.roomcode = roomcode;
      }
      if(callback != null) callback(response);
    });
  }

  /**
   * HTTP room requests.
   * 
   * @param {string} request_type - Request type (Like play, pause, change time).
   * @param {string} request_value - Request value (Like play value, pause value, current time).
   * @param {array} extra_data - Additional parameters, like {var1: value1}.
   * @param {callback} callback - Function called when server responds (with data as parameter).
   */
  var http_room_request = function(request_type, request_value, extra_data, callback) {
    if(extra_data === undefined) extra_data = null;
    if(callback === undefined) callback = null;

    _is_attempting_requests = true;
    RoomHTTPEvents.request(_roomdata.roomcode, request_type, request_value, extra_data, function(data) {
      _is_attempting_requests = false;
      if(callback != null) callback(data);
    });
  }

  /**
   * Set stream.
   * 
   * @param {string} stream_type - Stream type (local, youtube, ...).
   * @param {string} stream_key - Stream key (url...).
   */
  var set_stream = function(stream_type, stream_key) {
    http_room_request('set_stream', stream_type + ";key=" + stream_key);
  }

  /**
   * Set play/pause.
   * 
   * @param {boolean} isplaying - Is playing 
   * @param {float} videotime - Time of the video.
   */
  var set_isplaying = function(isplaying, videotime) {
    http_room_request(
      'set_isplaying',
      (isplaying == true ? 1 : 0),
      {'request_videotime': round_time(videotime, 6)},
      function(data){
        _local_last_ctime = DateTimeParser.get_timestamp(data.message.last_ctime);
      }
    );
  }

  /**
   * Set current time.
   * 
   * @param {float} videotime - Time of the video.
   */
  var set_current_time = function(videotime) {
    http_room_request('set_current_time', round_time(videotime, 6));
  }

  /**
   * Utility function to round time.
   * 
   * @param {float} value The value to round.
   * @param {int} decimals The decimals to limit value on.
   */
  var round_time = function(value, decimals) {
    return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
  }

  /**
   * Skip events while executing a callback.
   * 
   * @param {string} event_name - The array of event names to disable.
   * @param {function} callback - The method to execute with skipped events.
   */
  var event_notrigger = function(event_name, callback) {
    for(var ient = 0;ient < event_name.length;ient++) {
      _videoplayer.removeEventListener(event_name[ient], _event_handlers[event_name[ient]]);
    }
    callback();
    for(var ient = 0;ient < event_name.length;ient++) {
      _videoplayer.addEventListener(event_name[ient], _event_handlers[event_name[ient]]);
    }
  }

  /**
   * Send sync request.
   * 
   * @param {function} callback - Callback invoked on success (data). 
   */
  var sync = function(callback) {
    RoomHTTPEvents.sync(_roomdata.roomcode, callback);
  }

  /**
   * Start synchronization.
   * 
   * @param {boolean} first_time - True if executed on first time.
   */
  var start_sync = function(first_time) {
    console.log("START_SYNC called (first_time=" + first_time + "),iAR=" + _is_attempting_requests);
    if(first_time) _sync_enabled = true;
    if(_sync_enabled) {
      if(!_is_attempting_requests) {
        sync(function(server_sync) {
          if(!_is_attempting_requests && server_sync.status == 1) {
            _sync_ignore_events = true;

            server_sync = server_sync.message;
            console.log(server_sync);
            if(_player_ready == true) {
              if(server_sync.hasOwnProperty("stream_ctime") &&
                server_sync.hasOwnProperty("last_ctime") &&
                server_sync.hasOwnProperty("last_isplaying")) {
                server_sync.last_ctime = DateTimeParser.get_timestamp(server_sync.last_ctime);
                server_sync.last_isplaying = DateTimeParser.get_timestamp(server_sync.last_isplaying);

                if(first_time == true) {
                  if(server_sync.stream_isplaying == 1) {
                    event_notrigger(['pause', 'playing', 'seeked'], function() {
                      _videoplayer.currentTime = (
                        (DateTimeParser.get_timestamp() -
                          server_sync.last_isplaying +
                          Math.round(server_sync.stream_ctime * 1000)
                        ) / 1000
                      );
                    });
                  } else {
                    event_notrigger(['pause', 'playing', 'seeked'], function() {
                      _videoplayer.currentTime = server_sync.stream_ctime;
                    });
                  }
                  _local_last_ctime = server_sync.last_ctime;
                } else {
                  if(Math.abs(server_sync.last_ctime - _local_last_ctime) > 1000) {
                    var video_wasplaying = _videoplayer.isplaying;
                    if(video_wasplaying) event_notrigger('pause', function() {
                      _videoplayer.pause();
                    });
                    event_notrigger(['pause', 'playing', 'seeking', 'waiting', 'playing', 'seeked'], function() {
                      _videoplayer.currentTime = (server_sync.stream_ctime);
                    });
                    if(video_wasplaying) event_notrigger('playing', function() {_videoplayer.pause();});

                    console.log(server_sync.last_ctime);
                    console.log(_local_last_ctime);
                    console.log("Difference: " + (server_sync.last_ctime - _local_last_ctime));
                    _local_last_ctime = server_sync.last_ctime;
                  }
                }
              }

              if(server_sync.hasOwnProperty("stream_isplaying")) {
                if(server_sync.stream_isplaying == 1) {
                  event_notrigger(['playing'], function() {_videoplayer.play();});
                } else {
                  event_notrigger(['pause'], function() {_videoplayer.pause();});
                }
              }
            }

            first_time = false;
            setTimeout(function() {_sync_ignore_events = false;}, 250);
          }
        });
      } else {SmartTimeout.setSmartTimeout('room_sync', function() {start_sync(false);}, 250);}
    }
  }

  /**
   * Stop synchronization.
   */
  var stop_sync = function() {
    _sync_enabled = false;
  }

  /**
   * Request synchronization.
   */
  var request_sync = function() {
    if(_sync_enabled == false) {
      _sync_enabled = true;
      start_sync(true);
    }
  }

  var attach_html5_video_handler = function(videoplayer, callback) {
    if(callback === undefined) callback = null;

    var actual_time = (new Date()).getTime();
    _videoplayer = videoplayer;

    _event_handlers['loadeddata'] = function(e) {
      var player_actual_time = (new Date()).getTime();
      console.log("[html5_video_event] Video took: " + (player_actual_time - actual_time) + " ms to buffer!");
    }

    _event_handlers['playing'] = function(e) {
      if(!_sync_ignore_events) {
        _is_attempting_requests = true;
        console.log("[html5_video_event]", "Video playing at time: " + e.target.currentTime);
        SmartTimeout.setSmartTimeout('playing', function() {
          set_isplaying(!e.target.paused, e.target.currentTime);
        }, 300);
      }
    }

    _event_handlers['waiting'] = function(e) {
      _buffering_time = (new Date()).getTime();
      console.log("[html5_video_event]", "Video is buffering...");
    }

    _event_handlers['pause'] = function(e) {
      if(!_sync_ignore_events) {
        _is_attempting_requests = true;
        console.log("[html5_video_event]", "Video paused.");
        SmartTimeout.setSmartTimeout('playing', function() {
          set_isplaying(!e.target.paused, e.target.currentTime);
        }, 300);
      }
    }

    _event_handlers['seeking'] = function(e) {
      console.log("[html5_video_event]", "Video seeking...");
    }

    _event_handlers['seeked'] = function(e) {
      console.log("[html5_video_event]", "Video seeked at time: " + e.target.currentTime);
      if(!_sync_ignore_events) {
        _is_attempting_requests = true;
        SmartTimeout.setSmartTimeout('seeking', function() {
          set_current_time(e.target.currentTime);
        }, 200);
      }
    }

    _event_handlers['loadedmetadata'] = function() {
      _videoplayer.play();
      _videoplayer.pause();
      console.log("[html5_video_event]", "Loaded metadata");
      _player_ready = true;
      setTimeout(function() {request_sync()}, 1000); // Temporary
    }

    _event_handlers['loadedmetadata'](); // Assuming the video is already loaded into the page

    JSUtils.attach_events(_videoplayer, _event_handlers);

    if(callback != null) callback();
  }

  /**
   * Get video player.
   */
  var get_video_player = function() {
    return _videoplayer;
  }

  // Class visibility.
  return {
    init: init,
    get_data: get_data,
    attach_html5_video_handler: attach_html5_video_handler,
    get_video_player: get_video_player,
    request_sync: request_sync,
  }
})();


function make_room(roomcode, videoplayer, callback) {
  if(roomcode === undefined) roomcode = null;

  Room.init(GLOBAL.backend_url, roomcode, {'stream_type': 'extension', 'stream_key': window.location.toString()}, function(response) {
    if(response.status == 1) {
      console.log(response.message.roomcode);
      Room.attach_html5_video_handler(videoplayer, function() {callback(response.message.roomcode)});
    }
  });
}