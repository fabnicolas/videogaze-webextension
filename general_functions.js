var attach_events = function(target, events){
  var _keys_events=Object.keys(events);
  for(var i=0;i<_keys_events.length;i++){
    var event_name = _keys_events[i];
    target.addEventListener(event_name, events[event_name]);
  }
}
console.log("general_functions");