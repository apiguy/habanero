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

module.exports = function (RED) {
  'use strict';
  var jsforce = require('jsforce');
  var request = require('request');

  function SFIotInputConnectionNode(n) {
    RED.nodes.createNode(this, n);
    this.connectionUrl = n.connectionUrl;
    this.token = n.token;

    var node = this;

    node.on('input', function (msg) {
      request.post({
        url: node.connectionUrl, 
        headers: {
          Authorization: "Bearer "+ node.token
        },
        json:true,
        body:msg.payload
      },
      function(err,httpResponse,body){ 
        if(!body.count || body.count < 1 ){
          RED.log.warn("No Data Injected to SF IoT Endopint: "+JSON.stringify(body));
        }
      });
    });
  }

  RED.nodes.registerType('salesforce-iot out', SFIotInputConnectionNode);
}
