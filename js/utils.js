/* JS utilities */
var JSUtils = (function() {
  var attach_events = function(target, events) {
    var _keys_events = Object.keys(events);
    for(var i = 0;i < _keys_events.length;i++) {
      var event_name = _keys_events[i];
      target.addEventListener(event_name, events[event_name]);
    }
  }

  var array_contains = function(obj) {
    var i = this.length;
    while(i--) {
      if(this[i] === obj) {
        return true;
      }
    }
    return false;
  }

  var is_empty = function(object) {for(var i in object) {return true;} return false;}

  return {
    attach_events: attach_events,
    array_contains: array_contains,
    is_empty: is_empty
  }
})();

