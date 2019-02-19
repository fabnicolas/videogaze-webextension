/* Chrome Extension utility functions */

var ScriptExecution = (function(tab_id) {
	var _tab_id;

	var executeScripts = function(actions) {
		var __tab_id=_tab_id;
		return Promise.all(actions.map(function(action) {
			action.runAt = 'document_end';
			return executeScript(__tab_id, action);
		})).then(function(){
			return new Promise(resolve => resolve());
		});
	}

	function executeScript(tab_id, action) {
		return promiseTo(chrome.tabs.executeScript, tab_id, action);
	}

	function promiseTo(fn, tab_id, info) {
		return new Promise(resolve => {fn.call(chrome.tabs, tab_id, info, x => resolve())});
	}

	function init(tab_id){
		_tab_id=tab_id;
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