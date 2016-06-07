var when = require("when");
var request = require('request');

var getApiRoot = require('../../config').getApiRoot;
var TIMESERIES_BASE_URL = getApiRoot('xively.services.timeseries');

var getLatestActivity = function(jwt, topic) {
    return when.promise(function(resolve) {
      console.log(topic);
    	var url = TIMESERIES_BASE_URL + topic + '/latest';
        request.get({
          url: url, 
          headers: {
            Authorization: "Bearer "+ jwt
          },
          qs:{
            pageSize: 15,
            omitNull: true
          }
        },
        function(err,httpResponse,body){ 
          var resp = JSON.parse(body);
          resolve(resp);
        });
  });
};

module.exports = {
    getLatestActivity: getLatestActivity
};

