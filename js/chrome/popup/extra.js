/* Chrome Extension utility functions */

var ScriptExecution = (function(tab_id) {
	var tab_id;

	var executeScripts = function(scripts) {
		_this=this;
		return Promise.all(scripts.map(function(script) {
			return executeScript(_this.tab_id, script);
		})).then(function(){
			return new Promise(resolve => resolve());
		});
	}

	function executeScript(tab_id, path) {
		return promiseTo(chrome.tabs.executeScript, tab_id, {file: path, runAt: 'document_end'});
	}

	function promiseTo(fn, tab_id, info) {
		return new Promise(resolve => {fn.call(chrome.tabs, tab_id, info, x => resolve())});
	}

	function init(tab_id){
		this.tab_id=tab_id;
	}

	init(tab_id);

	return {
		executeScripts: executeScripts
	}
});

var chrome_tabs_executeScripts = function(tab_id, actions, final_callback) {
	new ScriptExecution(tab_id)
		.executeScripts(actions)
		.then(final_callback);
}