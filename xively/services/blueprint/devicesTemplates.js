var when = require("when");
var request = require('request');

var getApiRoot = require('../../config').getApiRoot;
var BLUEPRINT_BASE_URL = getApiRoot('xively.services.blueprint');

var getDevicesTemplates = function(accountId, jwt) {
    return when.promise(function(resolve) {
        request.get({
          url: BLUEPRINT_BASE_URL+'devices/templates', 
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

var getCustomFieldsByDeviceTemplateId = function(accountId, jwt, deviceTemplateId, page, pageSize) {
    return when.promise(function(resolve) {
        request.get({
          url: BLUEPRINT_BASE_URL+'devices/custom-fields', 
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
    get: getDevicesTemplates,
    getCustomFields: getCustomFieldsByDeviceTemplateId
};