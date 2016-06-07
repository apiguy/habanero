/**
 * Copyright 2016 LogMeIn Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

// Xively Node-RED node file


module.exports = function(RED) {
    "use strict";

    var nodeUtil = require("../../xively/habanero/nodeUtil");
    var getJwt = require("../../xively/habanero/auth").getJwtForCredentialsId;

    function XivelyChannelNode (config) {
        RED.nodes.createNode(this,config);

        this.xively_creds = config.xively_creds;
        this.device_template = config.device_template;
        this.device_channel = config.device_channel;
        this.payload_format = config.payload_format || "raw";

        var credentials = RED.nodes.getCredentials(this.xively_creds);

        var node = this;

        function onMqttMessage(msg){
            node.send(msg);
        }

        function deviceSubscribe(device){
            device.channels.forEach(function(channelType){
                if(channelType.channelTemplateId == node.device_channel){
                    node.mqttClient.subscribe(channelType.channel, function(err, granted){
                        if(!err){
                            RED.log.debug("subscribed to: "+channelType.channel);
                        }else{
                            RED.log.error("error subscribing: "+err);
                        }
                    });
                }
            });
        }

        //setup mqttClient
        node.mqttClient = nodeUtil.setupMqttClient(credentials,{
            onMessage: onMqttMessage
        });

        try{
            // go get devices and subscribe
            nodeUtil.getDevicesForTemplateId(
                node.xively_creds,
                node.device_template,
                deviceSubscribe
            );
        }catch(err){
            RED.log.error("Error setting up XivelyChannelNode: " + err);
        };

        node.on("close", function() {
            // Called when the node is shutdown 
            if(node.mqttClient){
                node.mqttClient.end(true);
            }
        });
    }

    RED.nodes.registerType("xively-channel", XivelyChannelNode);
}