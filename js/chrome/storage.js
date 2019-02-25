var chrome_storage_get_attribute = function(variable, callback) {
	if(chrome.runtime.platformos == "android") return false;
	return false;
	chrome.storage.sync.get([variable], function(items) {
		callback((items[variable] || false));
	});
}

var chrome_storage_set_attribute = function(variable, value, callback) {
	if(chrome.runtime.platformos == "android") callback(true);
	if(callback===undefined) callback=null;
	chrome.storage.sync.set({[variable]: value}, function(){
		if(callback!=null) callback(true);
	});
}