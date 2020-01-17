clearMergePaths();

function clearMergePaths() {
	var duplicatedLayers;
	try {
		var selectedLayers;
		if (app.project.activeItem != null 
		&& app.project.activeItem.selectedLayers != null 
		&& app.project.activeItem.selectedLayers.length > 0) {
			selectedLayers = app.project.activeItem.selectedLayers;
			duplicatedLayers = duplicateLayers(selectedLayers);
	 		for (var i = 0; i < selectedLayers.length; i++) {
				removeMerhePaths( selectedLayers[i].property("Contents") );
			}
			renameAndDisableayers(duplicatedLayers);
			alert("Well done!");
		} else {
			alert("At least 1 layer must be sellected.");
		}
	} catch(err) {
		rollback(selectedLayers);
		alert("Something went wrong. Try to follow the script's instruction. Error: " + err.message);
	}
}

function renameAndDisableayers(layers) {
	for (var i = 0; i < layers.length; i++) {
		layers[i].name += " original";
		layers[i].enabled = false;
	}
}

function duplicateLayers(layers) {
	var duplicatedLayers = [];
	for (var i = 0; i < layers.length; i++) {
		var el = layers[i].duplicate();
		el.name = layers[i].name;
		duplicatedLayers.push(el);
	}
	return duplicatedLayers;
}

function rollback(selectedLayers) {
	if (selectedLayers != null) {
		for (var i = selectedLayers.length - 1; i >= 0; i--) {
			for (var k = 1; k <= selectedLayers[i].containingComp.numLayers; k++) {
				var el = selectedLayers[i].containingComp.layer(k);
				if ( el.parent == selectedLayers[i] ) {
					el.parent = selectedLayers[i].containingComp.layer(selectedLayers[i].index - 1);
				}
			}
			selectedLayers[i].remove();
		}
	}
}

function removeMerhePaths(group) {
	var childsNum = group.numProperties;
	for (var i = 1; i <= childsNum; i++) {
		if (group.property(i).matchName == "ADBE Vector Group") {
			removeMerhePaths( group.property(i).property("Contents") );
		} else if (group.property(i).matchName == "ADBE Vector Filter - Merge") {
			group.property(i).remove();
			i--;
			childsNum--;
		}
	}
}