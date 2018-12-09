var chrome_tabs_executeScripts = function(tab_id, actions, final_callback) {
	var inject = function(tid, script, cb = null) {chrome.tabs.executeScript(tid, script, cb);}
	var callback = null;
	for(var i = 0;i < actions.length;i++) callback = inject(tab_id, actions[i], callback);
	final_callback();
}

var chrome_get_active_tab = function(callback) {
	chrome.tabs.query({currentWindow: true, active: true}, function(tabs) {
		callback(tabs[0].id);
	});
}

var inject_videogaze = function(callback) {
	chrome_get_active_tab(function(active_tab_id) {
		chrome_tabs_executeScripts(active_tab_id, [
			{file: 'general_functions.js'},
			{file: 'global.js'},
			{file: 'room.js'},
			{file: 'videogaze.js'}
		], callback);
	});
}

var message_room=function(param_roomcode){
	if(param_roomcode === undefined) param_roomcode=null;

	chrome_get_active_tab(function(active_tab_id) {
		chrome.tabs.sendMessage(active_tab_id, {action: "room", roomcode: param_roomcode}, {}, function(response){
			console.log(response);
			document.getElementById('room_details').innerText = 'Room code = '+response.code;
		});
	});
}

var onclick_make_room = function() {
	inject_videogaze(function() {
		message_room();
	});
}

var onclick_join_room = function() {
	inject_videogaze(function() {
		message_room(document.getElementById('text_roomcode').value);
	});
}

document.getElementById('button_make_room').addEventListener('click', onclick_make_room);
document.getElementById('button_join_room').addEventListener('click', onclick_join_room);
