var chrome_storage_get_attribute = function(variable, callback) {
	return chrome.storage.sync.get([variable], function(items) {
		if(callback) return callback((items[variable] || false));
		else return (items[variable] || false);
	});
}

var chrome_storage_set_attribute = function(variable, value, callback) {
	chrome.storage.sync.set({[variable]: value}, function(){
		if(callback) callback(true);
		else return true;
	});
}