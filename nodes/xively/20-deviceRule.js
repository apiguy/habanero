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

    var when = require("when");

    var nodeUtil = require("../../xively/habanero/nodeUtil");
    var getJwt = require("../../xively/habanero/auth").getJwtForCredentialsId;

    var timeseries = require("../../xively/services/timeseries");

    var operators = {
        'eq': function(a, b) { return a == b; },
        'neq': function(a, b) { return a != b; },
        'lt': function(a, b) { return a < b; },
        'lte': function(a, b) { return a <= b; },
        'gt': function(a, b) { return a > b; },
        'gte': function(a, b) { return a >= b; },
        'btwn': function(a, b, c) { return a >= b && a <= c; },
        'cont': function(a, b) { return (a + "").indexOf(b) != -1; },
        'regex': function(a, b, c, d) { return (a + "").match(new RegExp(b,d?'i':'')); },
        'true': function(a) { return a === true; },
        'false': function(a) { return a === false; },
        'null': function(a) { return (typeof a == "undefined" || a === null); },
        'nnull': function(a) { return (typeof a != "undefined" && a !== null); },
        'else': function(a) { return a === true; }
    };

    function XivelyDeviceRuleNode (config) {
        RED.nodes.createNode(this,config);

        this.xively_creds = config.xively_creds;
        this.rules = config.rules || [];
        this.device_template = config.device_template;
        this.repeat_count = config.repeat_count;
        this.repeat_units = config.repeat_units;
        this.matchall = config.matchall || true;
        this.matchall = (this.matchall === "false") ? false : true;

        var credentials = RED.nodes.getCredentials(this.xively_creds);

        var node = this;
        var context = node.context();
        node.previousValues = new Array(node.rules.length);

        // define node scoped functions

        function onMqttMessage(msg){
            if(!isWithinRepeatCycle(msg)){
                evaluateRules(msg);
            }
        }

        function onMqttConnect(){
            try{
                // go get devices and subscribe
                nodeUtil.getDevicesForTemplateId(
                    node.xively_creds,
                    node.device_template,
                    deviceSubscribe
                );
            }catch(err){
                RED.log.error("Error setting up XivelyDeviceRuleNode: " + err);
            };
        }

        function onEvaluationSuccess(msg){
            node.send(msg);
            var contextKey = 'last_sent_at_'+msg.device.id;
            var now = new Date();
            context.set(contextKey, now);
        }

        function isWithinRepeatCycle(msg){
            var now = new Date();
            var contextKey = 'last_sent_at_'+msg.device.id;
            var last_sent_at = context.get(contextKey);
            if(typeof last_sent_at != "undefined"){
                last_sent_at = new Date(last_sent_at);
            }

            if(last_sent_at instanceof Date){
                var nextCyleBegins = new Date(last_sent_at.getTime() + node.repeatCycleMillis);
                if(now < nextCyleBegins){
                    return true;
                }
            }
            return false;
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

        function findValueInTsData(tsData, category, categoryType, resolve, reject){
            for (var i=0; i<tsData.length; i+=1) {
                var dotIndex = category.indexOf('.');
                var grabFirst = false;
                if(dotIndex === -1){
                    if(category === "value"){
                        grabFirst = true;
                    }
                }else{
                    // assume category like 'temp.value';
                    category = category.substring(0, dotIndex);
                }

                if(grabFirst || tsData[i].category == category){
                    if(categoryType == "num"){
                        return resolve(tsData[i].numericValue);
                    }else{
                        return resolve(tsData[i].stringValue);
                    }
                }
            }
            return reject("Unable to find channel '"+rule.iv+"' value in ts data");
        }

        function getRuleInputValue(node, rule, iter, msg, tsCache){
            var prop;
            return when.promise(function(resolve, reject) {
                if(rule.it == 'channel'){
                    if(iter==0 || node.rules[0].iv === rule.iv){
                        if(rule.sv == "value"){
                            var cKeys = Object.keys(msg.payload);
                            if(cKeys.length > 1){
                                RED.log.warn("Input set to value, but channel has multiple values.");   
                            }
                            // grab first value
                            prop = msg.payload[cKeys[0]].value;
                            return resolve(prop);
                        }else{
                            try{
                                prop = RED.util.evaluateNodeProperty('payload.'+rule.sv,'msg',node,msg);
                                return resolve(prop);
                            }catch(err){
                                return reject("Unable to evaluate input value for rule: "+err);
                            }
                        }
                    }else{
                        var otherTopic = 'xi/blue/v1/'+msg.account.id+'/d/'+msg.device.id+'/'+rule.ivn;
                        if(!tsCache.hasOwnProperty(otherTopic)){
                            getJwt(node.xively_creds).then(function(jwtConfig){
                                timeseries.getLatestActivity(jwtConfig.jwt, otherTopic)
                                .then(function(tsResults){
                                    if(!tsResults.hasOwnProperty('result')){
                                        return reject("Timeseries request failure: "+JSON.stringify(tsResults));
                                    }
                                    // cache results
                                    tsCache[otherTopic] = tsResults.result;
                                    findValueInTsData(tsCache[otherTopic], rule.sv, rule.vt, resolve, reject);
                                });
                            });
                        }else{
                            findValueInTsData(tsCache[otherTopic], rule.sv, rule.vt, resolve, reject);
                        }
                    }
                }else{
                    prop = RED.util.evaluateNodeProperty(node.property,node.propertyType,node,msg);
                    return resolve(prop);
                }
            });
        }

        function evaluateRules(msg){
            var tsCache = {};
            var i = 0;
            var loopRules = function(){
                var rule = node.rules[i];
                getRuleInputValue(node, rule, i, msg, tsCache).then(function(prop){
                    var v1,v2;
                    if (rule.vt === 'prev') {
                        v1 = node.previousValues[i];
                    } else {
                        v1 = RED.util.evaluateNodeProperty(rule.v,rule.vt,node,msg);
                    }
                    v2 = rule.v2;
                    if (rule.v2t === 'prev') {
                        v2 = node.previousValues[i];
                    } else if (typeof v2 !== 'undefined') {
                        v2 = RED.util.evaluateNodeProperty(rule.v2,rule.v2t,node,msg);
                    }
                    node.previousValues[i] = prop;
                    if (rule.t == "else") { prop = elseflag; elseflag = true; }
                    if (operators[rule.t](prop,v1,v2,rule.case)) {
                        // Rule passed
                        i++;
                        if(node.matchall == true && i<node.rules.length){
                            // `ALL` query with additional rules, continue iteration
                            loopRules();
                        }else{
                            // passed rule(s) / we are complete
                            onEvaluationSuccess(msg);
                        }
                    } else {
                        // rule failed
                        if(!node.matchall){
                            // `OR` query, continue interation
                            i++;
                            if(i < node.rules.length) {
                                loopRules();
                            }
                        }else{
                            // `ALL` query, stop iteration
                        }
                    }
                }).catch(function(err){
                    node.warn(err);
                });
            }
            loopRules();
        }

        //calculate repeat cycle
        switch(this.repeat_units){
            case "s":
                node.repeatCycleMillis = node.repeat_count*1000;
                break;
            case "m":
                node.repeatCycleMillis = node.repeat_count*60*1000;
                break;
            case "h":
                node.repeatCycleMillis = node.repeat_count*60*60*1000;
                break;
            case "d":
                node.repeatCycleMillis = node.repeat_count*24*60*60*1000;
                break;
        }

        // parse proper types from rules 
        for (var i=0; i<this.rules.length; i+=1) {
            var rule = this.rules[i];

            if(i==0){
                if(rule.it !== 'channel'){
                    // without this we are not listening to anything
                    throw "First rule must have a channel input";
                }
                node.device_channel = rule.iv;
            }

            if (!rule.vt) {
                rule.vt = 'str';
            }
            if (rule.vt === 'str' || rule.vt === 'num') {
                if (!isNaN(Number(rule.v))) {
                    rule.v = Number(rule.v);
                }
            }

            if (typeof rule.v2 !== 'undefined') {
                if (!rule.v2t) {
                    rule.v2t = 'str';
                }
                if (rule.v2t === 'str' || rule.v2t === 'num') {
                    if (!isNaN(Number(rule.v2))) {
                        rule.v2 = Number(rule.v2);
                    }
                }
            }
        }

        //setup mqttClient
        node.mqttClient = nodeUtil.setupMqttClient(credentials,{
            onMessage: onMqttMessage,
            onConnect: onMqttConnect
        });

        node.on("close", function() {
            // Called when the node is shutdown 
            if(node.mqttClient){
                node.mqttClient.end(true);
            }
        });
    }

    RED.nodes.registerType("xively-device-rule", XivelyDeviceRuleNode);

}