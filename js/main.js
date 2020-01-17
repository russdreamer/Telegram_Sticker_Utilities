(function () {
 'use strict';



 document.getElementById('clear_merge_paths').addEventListener('click', function() {
	var newInterface = new CSInterface();     
    newInterface.evalScript('clearMergePaths()'); 
});

document.getElementById('fix_merge_paths').addEventListener('click', function() {
	var newInterface = new CSInterface();     
    newInterface.evalScript('fixMergePaths()'); 
});

document.getElementById('outline').addEventListener('click', function() {
	var newInterface = new CSInterface();     
    newInterface.evalScript('outline()'); 
});

document.getElementById('optimize').addEventListener('click', function() {
	var newInterface = new CSInterface();     
    newInterface.evalScript('deepStroke()'); 
});

 }());
