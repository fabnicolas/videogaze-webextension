function chrome_tabs_executeScripts(tab_id, actions){
	var inject=function(tid, script, cb=null){chrome.tabs.executeScript(tid, script, cb);}
	var callback=null;
	for(var i=0; i<actions.length; i++) callback=inject(tab_id, actions[i], callback);
}

chrome.browserAction.onClicked.addListener(function(tab){
	chrome_tabs_executeScripts(tab.ib, [
		{file: 'general_functions.js'},
		{file: 'global.js'},
		{file: 'room.js'},
		{file: 'room_maker.js'},
		{file: 'videogaze.js'}
	]);
});