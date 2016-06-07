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
    var devices = require("../../xively/services/blueprint").devices;

    function XivelySetCustomField (config) {
        RED.nodes.createNode(this,config);

        this.xively_creds = config.xively_creds;
        this.device_template = config.device_template;
        this.device_field = config.device_field;
        this.set_to = config.set_to;
        this.set_to_type = config.set_to_type;

        var node = this;

        function setCustomField(msg){
            var setValue = RED.util.evaluateNodeProperty(node.set_to, node.set_to_type, node, msg);
            if(typeof setValue == "object"){
                setValue = JSON.stringify(setValue);
            }
            var putBody = {};
            putBody[node.device_field] = setValue;
            getJwt(node.xively_creds).then(function(jwtResp){
                nodeUtil.ensureMsgHasDeviceInfo(node.xively_creds, msg).then(function(updatedMsg){
                    msg = updatedMsg;
                    devices.putDevice(jwtResp.jwt, msg.device.id, msg.device.version, putBody).then((putResp) => {
                        if(putResp.hasOwnProperty('error')){
                            RED.log.info("Error setting custom field for device id: "+msg.device.id);
                            RED.log.info(JSON.stringify(putResp));
                        }
                    });
                }).catch(function(err){
                    if(err == "not a device message"){
                        RED.log.error("Can not attach device info. This msg was not triggered by a device");
                    }else{
                        RED.log.error("Unable to capture device info for setCustomField: "+err);
                    }
                });
            });
        }

        this.on ('input', function(msg) {
            if(!msg.hasOwnProperty('device')){
                RED.log.error('Missing device infomation, unable to set custom field');
                return;
            }

            setCustomField(msg);
        });
    }

    RED.nodes.registerType("xively-set-custom-field", XivelySetCustomField);
}