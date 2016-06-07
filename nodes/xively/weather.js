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
    
    var request = require("request");
    var when = require("when");

    var xiRed = require('../../xively/');
    var getApiRoot = require('../../xively/config').getApiRoot;
    var nodeUtil = require("../../xively/habanero/nodeUtil");

    var WEATHER_DATA_URL = getApiRoot('xively.habanero-proxy')+'weather';

    function apiRespDataToWeatherInfo(respData, dataRow){
        var jsun = respData.weather;
        var weather = {};
        if(dataRow == 0){
            weather.slug = jsun.daily.data[dataRow].icon;
            weather.summary = jsun.currently.summary;
            weather.temperature = jsun.currently.temperature;
            weather.apparentTemperature = jsun.currently.apparentTemperature;
            weather.humidity = jsun.currently.humidity;
            weather.nearestStormDistance = jsun.currently.nearestStormDistance;
            weather.nearestStormBearing = jsun.currently.nearestStormBearing;
            weather.windSpeed = jsun.currently.windSpeed;
            weather.windBearing = jsun.currently.windBearing;
            weather.visibility = jsun.currently.visibility;
            weather.cloudCover = jsun.currently.cloudCover;
            weather.precipProbability = jsun.currently.precipProbability;
            weather.pressure = jsun.currently.pressure;
            weather.ozone = jsun.currently.ozone;
        }else{
            weather.slug = jsun.daily.data[dataRow].icon;
            weather.summary = jsun.daily.data[dataRow].summary;
            weather.humidity = jsun.daily.data[dataRow].humidity;
            weather.windSpeed = jsun.daily.data[dataRow].windSpeed;
            weather.windBearing = jsun.daily.data[dataRow].windBearing;
            weather.cloudCover = jsun.daily.data[dataRow].cloudCover;
            weather.precipProbability = jsun.daily.data[dataRow].precipProbability;
            weather.ozone = jsun.daily.data[dataRow].ozone;
        }
        weather.sunrise = jsun.daily.data[dataRow].sunriseTime;
        weather.sunset = jsun.daily.data[dataRow].sunsetTime;
        weather.maxTemp = jsun.daily.data[dataRow].temperatureMax;
        weather.minTemp = jsun.daily.data[dataRow].temperatureMin;
        weather.lon = jsun.latitude;
        weather.lat = jsun.longitude;
        weather.units = jsun.flags.units;
        weather.time = new Date(jsun.daily.data[dataRow].time*1000);
        weather.title = RED._("weather.message.weather-forecast");
        weather.description = RED._("weather.message.weather-info", {time: weather.time.toLocaleString(), lat: weather.lat, weather: weather.lon});
        return weather;
    }

    function queryWeather(xively_creds, lat, lon, date, tomorrow) {
        return when.promise(function(resolve, reject) {
            xiRed.habanero.auth.getJwtForCredentialsId(xively_creds).then(function(jwtResp){
                request.post({
                  url: WEATHER_DATA_URL, 
                  headers: {
                    Authorization: "Bearer "+ jwtResp.jwt
                  },
                  form:{
                    latitude: lat,
                    longitude: lon,
                    date: date
                  }
                },
                function(err,httpResponse,body){ 
                    try{
                        var resp = JSON.parse(body);
                        if(resp.success == false){
                            reject(resp.message);
                        }
                        var dataRow = (tomorrow) ? 1 : 0;
                        var weatherInfo  = apiRespDataToWeatherInfo(resp, dataRow);
                        resolve(weatherInfo);
                    }catch(err){
                        reject(err);
                    }
                });
            });
        });
    }

    function latLonValid(lat, lon){
        return (90 >= lat && 180 >= lon && lat >= -90 && lon >= -180);
    }

    function getQueryOptions(node, msg){
            var date;
            var time;
            var year;
            var lat;
            var lon;

            if (node.lat && node.lon) {
                lat = node.lat;
                lon = node.lon;
            } else if (typeof msg.device === "object" 
                                && msg.device.latitude
                                && msg.device.longitude) {
                lat = msg.device.latitude;
                lon = msg.device.longitude;
            }else if (msg.location) {
                //query node code to check the input for information.
                if (msg.location.lat && msg.location.lon) {
                    lat = msg.location.lat;
                    lon = msg.location.lon;
                }
            }

            if(!latLonValid(lat, lon)){
                node.error(RED._("weather.error.msg-invalid-lat_lon"));
                return null;
            }

            //the date string is in the format YYYY-MM-DD
            //the time string is in the format HH:MM
            var isoDateStr = null;
            var tomorrow = false;
            if (node.date && node.time) {
                date = node.date;
                time = node.time;
            }
            else if (msg.time && node.mode === "message") {
                if (msg.time.toISOstring) {
                    isoDateStr = msg.time.toISOString();
                } else if (typeof(msg.time === "string") && !isNaN(parseInt(msg.time))) {
                    var epoch = new Date(parseInt(msg.time));
                    isoDateStr = msg.time.toISOString();
                }
            }else{
                if(node.mode !== "currently"){
                    tomorrow = true;
                }
            }

            isoDateStr = isoDateStr || new Date().toISOString();
            date = isoDateStr.substring(0,10);
            time = isoDateStr.substring(11,16);
            year = date.substring(0,4);

            var today = new Date();
            if (today.getFullYear() - year > 60) {
                node.warn(RED._("weather.warn.more-than-60-years"));
                return null;
            } else if (today.getFullYear() - year < -10) {
                node.warn(RED._("weather.warn.more-than-10-years"));
                return null;
            }

            return {
                lat:lat,
                lon:lon,
                isoDateStr:isoDateStr,
                tomorrow:tomorrow
            }
    }



    function WeatherQueryNode(n) {
        RED.nodes.createNode(this,n);
        this.units = n.units || "us";
        this.lat = n.lat;
        this.lon = n.lon;
        this.mode = n.mode;
        this.xively_creds = n.xively_creds;
        var node = this;

        this.on ('input', function(msg) {
            nodeUtil.ensureMsgHasDeviceInfo(null, msg, true).then((msg) => {
                var opts = getQueryOptions(node, msg);
                if(opts !== null){
                    queryWeather(node.xively_creds, opts.lat, opts.lon, opts.isoDateStr, opts.tomorrow).
                    then(function(weatherInfo){
                        msg.weather = weatherInfo;
                        node.send(msg);
                    }).catch(function(err){
                        RED.log.error("Error retrieving weather: "+err);
                    });
                }
            });
        });
    }

    RED.nodes.registerType("xi-weather-query", WeatherQueryNode);


    function WeatherRuleNode(n) {
        RED.nodes.createNode(this,n);
        this.units = n.units || "us";
        this.lat = n.lat;
        this.lon = n.lon;
        this.rules = n.rules;
        this.matchall = n.matchall;
        this.mode = n.mode;
        this.xively_creds = n.xively_creds;
        var node = this;

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

        function evaluateRules(msg){
            var i = 0;
            console.log(msg.weather);
            var loopRules = function(){
                var rule = node.rules[i];
                var prop = msg.weather[rule.iv];
                var v1,v2;
                v1 = RED.util.evaluateNodeProperty(rule.v,rule.vt,node,msg);
                v2 = rule.v2;
                if (typeof v2 !== 'undefined') {
                    v2 = RED.util.evaluateNodeProperty(rule.v2,rule.v2t,node,msg);
                }
                if (rule.t == "else") { prop = elseflag; elseflag = true; }
                console.log(prop)
                console.log(v1)
                console.log(v2)
                if (operators[rule.t](prop,v1,v2,rule.case)) {
                    // Rule passed
                    console.log("pass")
                    i++;
                    if(node.matchall == true && i<node.rules.length){
                        // `ALL` query with additional rules, continue iteration
                        loopRules();
                    }else{
                        // passed rule(s) / we are complete
                        node.send(msg);
                    }
                } else {
                    // rule failed
                    console.log("fail")
                    if(!node.matchall){
                        // `OR` query, continue interation
                        i++;
                        if(i < node.rules.length) {
                            loopRules();
                        }
                    }else{
                        // `ALL` query, do not continue iteration
                    }
                }

            }
            loopRules();
        };

        this.on ('input', function(msg) {
            nodeUtil.ensureMsgHasDeviceInfo(null, msg, true).then((msg) => {
                console.log(msg.device);
                var opts = getQueryOptions(node, msg);
                if(opts !== null){
                    queryWeather(node.xively_creds, opts.lat, opts.lon, opts.isoDateStr, opts.tomorrow).
                    then(function(weatherInfo){
                        msg.weather = weatherInfo;
                        evaluateRules(msg);
                    });
                }
            });
        });
    }

    RED.nodes.registerType("xi-weather-rule", WeatherRuleNode);
};