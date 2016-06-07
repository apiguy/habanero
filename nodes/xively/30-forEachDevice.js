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

module.exports = function(RED) {
    "use strict";

    var nodeUtil = require("../../xively/habanero/nodeUtil");
    var getJwt = require("../../xively/habanero/auth").getJwtForCredentialsId;

    function XivelyForEachDeviceNode (config) {
        RED.nodes.createNode(this,config);

        this.xively_creds = config.xively_creds;
        this.device_template = config.device_template;

        var credentials = RED.nodes.getCredentials(this.xively_creds);

        var node = this;

        function forEachDevice(device){
            var msg = {device: device};
            msg.payload = device.id;
            node.send(msg);
        }

        this.on ('input', function(msg) {
            nodeUtil.getDevicesForTemplateId(
                node.xively_creds,
                node.device_template,
                forEachDevice
            );
        });
    }

    RED.nodes.registerType("xively-for-each-device", XivelyForEachDeviceNode);
}