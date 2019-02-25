var chrome_storage_get_attribute = function(variable, callback) {
	chrome.runtime.getPlatformInfo(function(info) {
		if(info.os != "android") {
			chrome.storage.sync.get([variable], function(items) {
				callback((items[variable] || false));
			});
		} else return false;
	});
}

var chrome_storage_set_attribute = function(variable, value, callback) {
	if(callback === undefined) callback = null;
	chrome.runtime.getPlatformInfo(function(info) {
		if(info.os != "android") {
			chrome.storage.sync.set({[variable]: value}, function() {
				if(callback != null) callback(true);
			});
		} else if(callback != null) callback(true);
	});
}