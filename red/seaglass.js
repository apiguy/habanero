var mqtt = require('mqtt');
var habaneroSettings = require('node-red-contrib-xively').habanero.settings;

var server;
var RED;
var mqttClient;

function setupComms(){

}

function listenForActivation(){
	var firstboot = require('/var/log/seaglass/first-boot-resp.json');
	mqttClient = mqtt.connect("mqtts://",{
	      host: "broker.xively.com",
	      port: Number(8883),
	      username: firstboot.id,
	      password: firstboot.mqtt
	});

	mqttClient.subscribe(firstboot.activation_channel, function(err, granted){
	    if(!err){
	        RED.log.debug("subscribed to: "+channelType.channel);
	    }else{
	        RED.log.error("error subscribing: "+err);
	    }
	});

	mqttClient.on('message', function(topic, message){
		RED.log.debug("recieved message: "+message);
	});
}

function init(_server, _runtime) {
	server = _server;
	RED = _runtime;
}

function start() {
	return when.promise(function(resolve,reject) {
		habaneroSettings.get().then(function(hSettings) {
	        var habaneroIsSetup = hSettings !== null;
	        if (habaneroIsSetup) {
	            setupComms();
	        }else{
	        	listenForActivation();
	        }
	        return resolve();
	   	});
	});
}

function stop() {
	return when.promise(function(resolve,reject) {
		mqttClient.end();
	    return resolve();
	});
}

module.exports = {
	init: init,
 	start: start,
 	stop: stop
 }
