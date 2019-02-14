var chrome_get_active_tab = function(callback) {
	chrome.tabs.query({currentWindow: true, active: true}, function(tabs) {
		callback(tabs[0]);
	});
}