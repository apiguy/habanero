var when = require('when');
var mqtt = require("mqtt");
var merge = require("merge");

var config = require("../config");
var blueprint = require("../services/blueprint");
var getJwt = require('./auth').getJwtForCredentialsId;
var util = require('./util');

var getDevicesForTemplateId = function(xively_creds, deviceTemplateId, forEachDeviceCb, max_devices){
	// This function loops through paginated results of devices
	// and calls `forEachDeviceCb` with each device
	getJwt(xively_creds).then(function(jwtConfig){
	    var DEVICE_LIMIT = max_devices || config.get("xively.CONNECTION_DEVICE_LIMIT");
	    //go get devices
	    function getPage(page){
	        blueprint.devices.getByDeviceTemplateId(
	            jwtConfig.account_id, 
	            jwtConfig.jwt,
	            deviceTemplateId,
	            page
	        ).then(function(devicesResp){
	            devicesResp.devices.results.forEach(function(device, index){
	                forEachDeviceCb(device);
	            });
	            var meta = devicesResp.devices.meta;
	            var currentlyAt = meta.page * meta.pageSize;
	            if(currentlyAt < meta.count && currentlyAt <  DEVICE_LIMIT){
	                getPage(meta.page+1);
	            }
	        });
	    }
	    getPage(1);
	});
}

var ensureMsgHasDeviceInfo = function(xively_creds, msg, silent){
	return when.promise(function(resolve, reject) {
		// quick and dirty way to see if we've already have retrieved device info
		if(typeof msg.device !== "object"){
			if(silent){
				return resolve(msg);
			}else{
				return reject("not a device message");
			}
		}

		if(msg.device.hasOwnProperty('created')){
			return resolve(msg);
		}
			try{
	            var acctId = msg.account.id;
	            var devId = msg.device.id;
	            getJwt(xively_creds).then(function(jwtConfig){
		            blueprint.devices.getDevice(acctId, jwtConfig.jwt, devId).then(function(devResp){
		                msg.device = devResp.device;
		                resolve(msg);
		            }).catch(function(err){
		                throw err;
		            });
		        });
	        }catch(err){
	            return reject(err);
	        }
	});
}

var setupMqttClient = function(creds, options){
	//setup mqttClient
    var mqttClient = mqtt.connect("mqtts://",{
          host: "broker.xively.com",
          port: Number(8883),
          username: creds.account_user_id,
          password: creds.mqtt_secret
    });

    var onConnect = options.onConnect || function () {}
    mqttClient.on('connect', onConnect);

    var onError = options.onConnect || function (e) {}
    mqttClient.on('error', onError);

    var onMessage = function (t,m,p) {
    	var payload = m.toString();

    	if(typeof options.format == "undefined" || options.format == "json"){
    		if(payload.indexOf('{') === 0){
    			try {
			        payload = JSON.parse(payload);
			    } catch (e) {
			        //pass
			    }
    		}else{
    			payload = util.format.tSDataToJSON(payload);
    		}
        }
        
        var msg = merge(
            {topic: t, payload: payload},
            util.regex.topicToObject(t)
        );
        if(options.onMessage){
        	options.onMessage(msg);
        }else{
        	console.log("mqttClient message: "+msg);
        }
    }
    mqttClient.on('message', onMessage);

    return mqttClient;
}

module.exports = {
	getDevicesForTemplateId: getDevicesForTemplateId,
	ensureMsgHasDeviceInfo: ensureMsgHasDeviceInfo,
	setupMqttClient: setupMqttClient
}