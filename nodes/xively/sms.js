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

// Xively Node-RED SMS node file


module.exports = function(RED) {
    "use strict";
    // require any external libraries we may need....
    var request = require('request');
    var mustache = require('mustache');

    var xiRed = require('../../xively/');
    var getApiRoot = require('../../xively/config').getApiRoot;
    
    var SEND_SMS_POST_URL = getApiRoot('xively.habanero-proxy')+'sms';

    function XivelySmsOutNode (config) {
        RED.nodes.createNode(this,config);

        this.xively_creds = config.xively_creds;
        this.number_input_type = config.number_input_type;
        this.number = config.number;
        this.property = config.property;
        this.propertyType = config.propertyType || "msg";
        this.body = config.body;

        var node = this;

        function formatNumber(number){
            //strip all non-numeric chars
            number = number.replace(/\D/g,'');
            //must start with a 1
            if(!number.startsWith('1')){
                number = '1' + number;  
            }
            //must start with a plus sign
            number = '+' + number;
            return number;
        }

        function sendSms(toNumber, message){
            xiRed.habanero.auth.getJwtForCredentialsId(node.xively_creds).then(function(jwtResp){
                request.post({
                        url: SEND_SMS_POST_URL,
                        headers: {
                            Authorization: 'Bearer ' + jwtResp.jwt
                        },
                        form:{
                            toNumber: formatNumber(toNumber),
                            message: message
                        }
                    }, 
                    function(err,httpResponse,body){ 
                        if(!err){
                            RED.log.debug('send sms resp: ' + body);
                        }else{
                            RED.log.error('error sending sms: ' + err);
                        }
                    }
                );
            });
        }

        node.on('input', function (msg) {
            var renderedBody = mustache.render(node.body, msg);
            var toNumber = node.number;
            if(node.number_input_type === "property"){
                toNumber = RED.util.evaluateNodeProperty(node.property,node.propertyType,node,msg);
            }
            sendSms(toNumber, renderedBody);
        });
    }

    RED.nodes.registerType('xi-sms out', XivelySmsOutNode);
}