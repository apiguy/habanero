var when = require("when");

var blueprint = require("../services/blueprint");

var topicRegEx = /xi\/blue\/v1\/([0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12})\/d\/([0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12})\/([0-9a-zA-Z_-]*)/i;

var tSDataToJSON = function(tsData){
	// takes timeseries data and converts to object form
    var lines = tsData.split("\n");
	var data = {};
	for(var i=0;i<lines.length;i++){
	    var parts = lines[i].split(",");
	    if(parts.length > 3){
		    var v, t;
		    if(!isNaN(parseFloat(parts[2]))){
		    	v = parseFloat(parts[2]);
		    	t = "num";
		    }else{
		    	v = parts[3].trim();
		    	t = "str";
		    }
		    data[parts[1].trim()] = {
		      "timestamp":parts[0],
		      "value":v,
		      "type":t
		    };
		}
	}
	return data;
}

var topicToObject = function(topicStr){
	// take a xively mqtt topic and extracts info to obejct form
	var matches = topicStr.match(topicRegEx);
	if(matches === null){
		return null
	}
	return {
		account:{id:matches[1]},
		device:{id:matches[2]},
		channel:{channelTemplateName:matches[3]}
	}
}


module.exports = {
	regex: {
		topicToObject: topicToObject
	},
    format: {
    	tSDataToJSON: tSDataToJSON
    }
}