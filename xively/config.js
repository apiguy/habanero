var dot = require('dot-object');

var ENV = process.env.NODE_ENV || "development"
var configFilePath = './conf/'+ENV+'.json';
var config;
try{
	var config = require(configFilePath);
}catch(err){
	console.log("Unable to locate node-red-contrib-xivley config file: " + configFilePath);
	throw err;
}

function getApiRoot(configPath){
	var bpConfig =  dot.pick(configPath, config);
	var apiBaseUrl = bpConfig.scheme + bpConfig.host;
	if(bpConfig.port && bpConfig.port !== 80){
		apiBaseUrl += ":"+bpConfig.port;
	}
	apiBaseUrl += bpConfig.apiRoot;
	return apiBaseUrl;
}

function get(configPath){
	return dot.pick(configPath, config);
}

module.exports = {
	get: get,
	getApiRoot: getApiRoot
}