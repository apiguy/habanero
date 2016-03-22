/**
 * Copyright 2014 IBM Corp.
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

// If you use this as a template, update the copyright with your own name.

// Sample Node-RED node file

var devices = [
   {
    "deviceId": "8256f755-53cb-4c7e-8424-b0fa31c2b4fc",
    "city": "Norfolk",
    "state": "Nebraska",
    "registered": "2015-08-15T06:16:08 +04:00",
    "latitude": 20.704194,
    "longitude": -127.695636
  },
  {
    "deviceId": "ec4952a6-d4fe-4555-99e4-83462feb4e60",
    "city": "Westboro",
    "state": "Oklahoma",
    "registered": "2015-04-12T03:46:13 +04:00",
    "latitude": 34.716197,
    "longitude": 99.379037
  },
  {
    "deviceId": "19b457ec-850b-43e1-8f15-4a16316d11d4",
    "city": "Century",
    "state": "Mississippi",
    "registered": "2015-11-23T04:27:00 +05:00",
    "latitude": 13.063999,
    "longitude": 64.245773
  },
  {
    "deviceId": "a1d31c52-d055-4f44-b45c-4cec1525369a",
    "city": "Delshire",
    "state": "Utah",
    "registered": "2014-09-25T04:40:56 +04:00",
    "latitude": -79.025947,
    "longitude": 54.991226
  },
  {
    "deviceId": "973ad7aa-e5ba-4c7e-9a26-5470957f4b00",
    "city": "Cashtown",
    "state": "Virginia",
    "registered": "2015-06-01T03:32:10 +04:00",
    "latitude": -75.668709,
    "longitude": -52.236586
  },
  {
    "deviceId": "723d60f3-f27c-4832-9da9-8de703733d5f",
    "city": "Walker",
    "state": "California",
    "registered": "2015-09-28T10:42:50 +04:00",
    "latitude": -14.820821,
    "longitude": -101.565187
  },
  {
    "deviceId": "8bcb4044-482f-442a-81f4-53a0a00dc288",
    "city": "Independence",
    "state": "California",
    "registered": "2015-03-30T09:35:52 +04:00",
    "latitude": -67.302379,
    "longitude": -29.65256
  },
  {
    "deviceId": "4f144104-bddd-4374-8f08-cbbc09a666cb",
    "city": "Farmers",
    "state": "New Hampshire",
    "registered": "2015-08-10T08:50:40 +04:00",
    "latitude": 64.326376,
    "longitude": 122.003041
  },
  {
    "deviceId": "12c89ff2-52ee-40d4-9ec2-32f119190632",
    "city": "Fairacres",
    "state": "Delaware",
    "registered": "2014-01-10T10:09:31 +05:00",
    "latitude": -62.213447,
    "longitude": 122.898035
  },
  {
    "deviceId": "12a3832d-52e2-4103-8f2c-f3eec6564054",
    "city": "Faxon",
    "state": "Rhode Island",
    "registered": "2015-11-28T02:18:54 +05:00",
    "latitude": -78.35487,
    "longitude": -1.111082
  },
  {
    "deviceId": "0994f646-5fd0-4339-a37f-348c32f05da4",
    "city": "Blanco",
    "state": "Nebraska",
    "registered": "2015-02-10T10:08:25 +05:00",
    "latitude": 64.195425,
    "longitude": 119.879701
  }
];


module.exports = function(RED) {
    "use strict";
    
    function XivelyNode(n) {
        RED.nodes.createNode(this,n);
        var node = this;
        
        
        for (var i =0; i < devices.length; i++) {
            var dev = devices[i];
            console.log("Starting device: " + dev.deviceId);
            (function loop(device) {
                var rand = Math.round(Math.random() * (5000 - 1000)) + 1000;
                setTimeout(function() {
                        node.emit("input",{
                            device: device,
                            payload: {
                                temp: Math.floor(Math.random() * (76 - 28) + 28),
                                humidity: Math.floor(Math.random() * (100 - 20) + 20),
                                co: Math.floor(Math.random() * (70 - 1) + 1),
                            }
                        });
                        loop(device);  
                }, rand);
            }(dev));
        }
        
        this.on("input",function(msg) {
            msg.topic = this.topic;
            this.send(msg);
            msg = null;
        });
    }

    XivelyNode.prototype.close = function() {
        if (this.interval_id != null) {
            clearInterval(this.interval_id);
            if (RED.settings.verbose) { this.log(RED._("xively.stopped")); }
        }
    }
    
    RED.nodes.registerType("xively",XivelyNode);

}
