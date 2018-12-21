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