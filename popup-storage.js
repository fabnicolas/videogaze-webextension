var chrome_storage_get_attribute = function(variable) {
	return chrome.storage.sync.get([variable], function(items) {
		return items.variable || false;
	});
}

var chrome_storage_set_attribute = function(variable, value) {
	chrome.storage.sync.set({[variable]: value}, function() {return true;});
}