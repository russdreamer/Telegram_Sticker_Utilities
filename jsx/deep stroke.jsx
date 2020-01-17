deepStroke();

function deepStroke() {
	var selectedLayers = app.project.activeItem.selectedLayers;
	var duplicatedLayers;

	try {
		if (selectedLayers.length < 1) {
			alert("Select 1 or more layers to be optimized");
		} else {
			duplicatedLayers = duplicateLayers(selectedLayers);

			for (var i = 0; i < selectedLayers.length; i++) {
				optimizeStrokes(selectedLayers[i].property("Contents"));
			}

			renameAndDisableayers(duplicatedLayers);
			alert("Well done!");
		}
	} catch(err) {
		rollback(selectedLayers);
		alert("Something went wrong. Try to follow the script's instruction. Error: " + err.message);
	}
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

function optimizeStrokes(contents) {
	var strokeIndexList = [];
	var aboveStrokesNum = 0;
	var belowStrokesNum = 0;

	var propsNum = contents.numProperties;
	for (var i = 1; i <= propsNum; i++) {
		if (contents.property(i).matchName == "ADBE Vector Graphic - Stroke") {
			if ( i == 1 ) {
				contents.property(i).remove();
				propsNum--;
				i--;
			} else {
				var strokedGroup = duplicateAllExceptStrokesIntoGroup(contents, 1, i - 1, strokeIndexList);
				strokedGroup.name = contents.property(i).name;
				var stroke;

				if (contents.property(i).property("Composite").value == 1) {
					strokedGroup.moveTo(i + 1);
					strokedGroup = contents.property(i + 1);
					//aboveStrokesNum++;
					strokeIndexList.push(i + belowStrokesNum);
					stroke = contents.property(i);
				} else {
					strokedGroup.moveTo(1);
					strokedGroup = contents.property(1);
					belowStrokesNum++;
					strokeIndexList.push(belowStrokesNum);
					stroke = contents.property(i + 1);
				}
				
				proceedStrokedGroup(strokedGroup, stroke);
				stroke.remove();
			}
		}
	}

	for (var i = 1; i <= contents.numProperties; i++) {
		if (contents.property(i).matchName == "ADBE Vector Group" && !listIncludes(strokeIndexList, i)) {
			optimizeStrokes(contents.property(i).property("Contents"));
		}
	}
}

function duplicateAllExceptStrokesIntoGroup(contents, startIndex, endIndex, strokeIndexList) {
	var newGroup = contents.addProperty("ADBE Vector Group");
	
	for (var i = startIndex; i <= endIndex; i++) {
		if (!listIncludes(strokeIndexList, i)) {
			var dest = newGroup.property("Contents").addProperty(contents.property(i).matchName);
			copyAttrs(contents.property(i), dest);
		}
	}
	
	return newGroup;
}

function listIncludes(strokeIndexList, target) {
	for (var i = 0; i < strokeIndexList.length; i++) {
		if (strokeIndexList[i] == target) {
			return true;
		}
	}
	return false;
}

function copyAttrs(source, dest) {
	if (source.canSetEnabled) {
		dest.enabled = source.enabled;
	}
	if (source.propertyType == PropertyType.NAMED_GROUP && source.parentProperty.propertyType == PropertyType.INDEXED_GROUP) {
		dest.name = source.name;
	}

	for (var i = 1; i <= source.numProperties; i++) {
		if (source.property(i).propertyType == PropertyType.PROPERTY) {
			if (!(source.property(i).canSetExpression ^ source.property(i).canVaryOverTime)) {
				if (dest.property(i).canSetExpression ^ dest.property(i).canVaryOverTime) {
					dest.addProperty(source.property(i).matchName);
				}
				if (source.property(i).canVaryOverTime && source.property(i).isTimeVarying) {
					for (var k = 1; k <= source.property(i).numKeys; k++) {
						dest.property(i).setValueAtTime(source.property(i).keyTime(k), source.property(i).keyValue(k));
					}
				} else {
					dest.property(i).setValue(source.property(i).value);
				}
			}
		} else if (source.property(i).propertyType == PropertyType.NAMED_GROUP) {
			copyAttrs(source.property(i), dest.property(i));
		}
	}

	if (dest.matchName == "ADBE Vector Group") {
		for (var i = 1; i <= source.property("Contents").numProperties; i++) {
			var newDest = dest.property("Contents").addProperty(source.property("Contents").property(i).matchName);
			copyAttrs(source.property("Contents").property(i), newDest);
		}
	}
}

function proceedStrokedGroup(group, stroke) {
	var groupProps = group.property("Contents");
	removeAllFillsAndStrokes(groupProps);
	
	if (isAnyGroupContained(groupProps)) {
		if (isAnyRest(groupProps)) {
			var newGroup = putRestIntoGroup(groupProps, 1, groupProps.numProperties);
		}
		
		for (var i = 1; i <= groupProps.numProperties; i++) {
			proceedStrokedGroup(groupProps.property(i) , stroke);
		}
	} else {
		if (isAnyRest(groupProps)) {
			var dest = groupProps.addProperty(stroke.matchName);
			copyAttrs(stroke, dest);
		}
	}

}

function putRestIntoGroup(contents, startIndex, endIndex) {
	var newGroup = contents.addProperty("ADBE Vector Group");
	newGroup.name = "Grouped Properties";
	
	for (var i = startIndex; i <= endIndex; i++) {
		if (contents.property(i).matchName != "ADBE Vector Group") {
			var dest = newGroup.property("Contents").addProperty(contents.property(i).matchName);
			copyAttrs(contents.property(i), dest);
			contents.property(i).remove();
			i--;
			endIndex--;
		}
	}
	
	newGroup = contents.property(contents.numProperties);
	return newGroup;
}

function isAnyRest(contents) {
	var count = 0;
	for (var i = 1; i <= contents.numProperties; i++) {
		if (contents.property(i).matchName != "ADBE Vector Group" 
		&& contents.property(i).matchName != "ADBE Vector Graphic - Stroke") {
			return true;
		}
	}
	return false;
}

function removeAllFillsAndStrokes(contents) {
	var propsNum = contents.numProperties;

	for (var i = 1; i <= propsNum; i++) {
		if (contents.property(i).matchName == "ADBE Vector Graphic - Stroke"
		|| contents.property(i).matchName == "ADBE Vector Graphic - Fill"
		|| contents.property(i).matchName == "ADBE Vector Graphic - G-Fill"
		|| contents.property(i).matchName == "ADBE Vector Graphic - G-Stroke") {
			contents.property(i).remove();
			i--;
			propsNum--;	
		}
	}
}

function isAnyGroupContained(group) {
	return group.property("ADBE Vector Group") != null;
}

