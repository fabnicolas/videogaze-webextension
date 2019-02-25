(function() {
  // Custom popup UI
  var element = document.createElement("link");
  element.setAttribute("rel", "stylesheet");
  element.setAttribute("type", "text/css");
  element.setAttribute("href", chrome.extension.getURL("popup-overlay/style.css"));
  document.getElementsByTagName("head")[0].appendChild(element);

  var div_overlay = document.createElement("div");
  div_overlay.className = "reset-element videogaze_overlay";
  div_overlay.id = "videogaze_overlay";

  var div_overlay_controls = document.createElement("div");
  div_overlay_controls.id = "overlay_controls";

  var a_overlay_controls_close = document.createElement("a");
  a_overlay_controls_close.id = "overlay_controls_close";
  a_overlay_controls_close.innerHTML = "[X]";

  var h1 = document.createElement("h1");
  h1.id = "popup_title";

  var div_room_details = document.createElement("div");
  div_room_details.id = "room_details";

  var span_pts = document.createElement("div");
  span_pts.id = "popup_to_start";

  var button_make_room = document.createElement("button");
  button_make_room.id = "button_make_room";

  var span_irh = document.createElement("span");
  span_irh.id = "insert_room_code_here";

  var input_roomcode = document.createElement("input");
  input_roomcode.id = "text_roomcode";
  input_roomcode.type = "text";
  input_roomcode.size = "30";

  var button_join_room = document.createElement("button");
  button_join_room.id = "button_join_room";

  div_overlay_controls.appendChild(a_overlay_controls_close);
  div_overlay.appendChild(div_overlay_controls);
  div_overlay.appendChild(h1);
  div_overlay.appendChild(div_room_details);
  div_overlay.appendChild(span_pts);
  div_overlay.appendChild(button_make_room);
  div_overlay.appendChild(document.createElement("br"));
  div_overlay.appendChild(span_irh);
  div_overlay.appendChild(document.createElement("br"));
  div_overlay.appendChild(input_roomcode);
  div_overlay.appendChild(button_join_room);

  document.body.insertBefore(div_overlay, document.body.firstChild);

  bind_controls();

  a_overlay_controls_close.addEventListener('click', function(e) {
    var to_remove = div_overlay;
    to_remove.parentNode.removeChild(to_remove);
    onclick_overlay_close();
  });
})();