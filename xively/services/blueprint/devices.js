var when = require("when");
var request = require('request');

var getApiRoot = require('../../config').getApiRoot;
var BLUEPRINT_BASE_URL = getApiRoot('xively.services.blueprint');

var getDevice = function(accountId, jwt, deviceId) {
    return when.promise(function(resolve) {
        request.get({
          url: BLUEPRINT_BASE_URL+'devices/'+deviceId, 
          headers: {
            Authorization: "Bearer "+ jwt
          },
          qs:{
            accountId: accountId
          }
        },
        function(err,httpResponse,body){ 
          var resp = JSON.parse(body);
          resolve(resp);
        });
    });
};

var putDevice = function(jwt, deviceId, etag, body) {
    return when.promise(function(resolve) {
        request.put({
          url: BLUEPRINT_BASE_URL+'devices/'+deviceId, 
          headers: {
            Authorization: "Bearer "+ jwt,
            etag: etag
          },
          form:body
        },
        function(err,httpResponse,body){ 
          var resp = JSON.parse(body);
          resolve(resp);
        });
    });
};

var getDevices = function(accountId, jwt) {
    return when.promise(function(resolve) {
        request.get({
          url: BLUEPRINT_BASE_URL+'devices', 
          headers: {
            Authorization: "Bearer "+ jwt
          },
          qs:{
            accountId: accountId
          }
        },
        function(err,httpResponse,body){ 
          var resp = JSON.parse(body);
          resolve(resp);
        });
    });
};

var getDevicesBySerial = function(accountId, jwt, serialNumber, page, pageSize) {
    return when.promise(function(resolve) {
        request.get({
          url: BLUEPRINT_BASE_URL+'devices', 
          headers: {
            Authorization: "Bearer "+ jwt
          },
          qs:{
            accountId: accountId,
            serialNumber: serialNumber,
            page: page || 1,
            pageSize: pageSize || 75
          }
        },
        function(err,httpResponse,body){ 
          var resp = JSON.parse(body);
          resolve(resp);
        });
    });
};

var getDevicesByDeviceTemplateId = function(accountId, jwt, deviceTemplateId, page, pageSize) {
    return when.promise(function(resolve) {
        request.get({
          url: BLUEPRINT_BASE_URL+'devices', 
          headers: {
            Authorization: "Bearer "+ jwt
          },
          qs:{
            accountId: accountId,
            deviceTemplateId: deviceTemplateId,
            page: page || 1,
            pageSize: pageSize || 75
          }
        },
        function(err,httpResponse,body){ 
          var resp = JSON.parse(body);
          resolve(resp);
        });
    });
};

module.exports = {
    get: getDevices,
    getByDeviceTemplateId: getDevicesByDeviceTemplateId,
    getDevicesBySerial: getDevicesBySerial,
    getDevice: getDevice,
    putDevice: putDevice
};