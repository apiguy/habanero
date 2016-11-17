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

  var nodeUtil = require("../../xively/habanero/nodeUtil");
  var settings = require("../../xively/habanero/settings");
  var getJwt = require("../../xively/habanero/auth").getJwtForCredentialsId;

  function SalesforceCredsNode(n) {
    RED.nodes.createNode(this, n);
    var node = this;
    var credentials = RED.nodes.getCredentials(n.id);

    this.login = function (callback, msg) {
      var accessToken = msg.accessToken || credentials.accessToken;
      var instanceUrl = msg.instanceUrl || credentials.instanceUrl;
      if (n.logintype == "oauth") {
          var error;
          if (!accessToken || !instanceUrl) {
              error = JSON.parse('["' + "No Authenticate specified" + '"]');
          }
          var conn = new jsforce.Connection({
            oauth2 : {
                clientId : credentials.clientid,
                clientSecret : credentials.clientsecret,
                redirectUri : null
            }
          });
          conn.initialize({
              accessToken : accessToken,
              refreshToken : credentials.refreshToken,
              instanceUrl : instanceUrl
          });
          callback(conn, error);

      } else if (n.logintype == "Username-Password") {
          var conn = new jsforce.Connection({
            loginUrl: n.loginurl
          });
          var error;

          conn.login(n.username, credentials.password+credentials.token, function (err, userInfo) {
            if (err) {
              error = err;
            }
            callback(conn, error);
          });
      } else if (n.logintype == "Signed-Request") {
          var conn = new jsforce.Connection({
            accessToken : accessToken,
            instanceUrl : instanceUrl
          });
          callback(conn, error);
      }
    }
  }


  RED.nodes.registerType('salesforce', SalesforceCredsNode, {
    credentials: {
      token: { type: 'password' },
      password: { type: 'password' },
      clientid: { type: 'password' },
      clientsecret: { type: 'password' },
      accessToken : { type: 'password' },
      refreshToken : { type: 'password' },
      instanceUrl : { type: 'text' }
    }
  });

  RED.httpAdmin.get('/force-credentials/:id/force-credentials', function(req, res) {
    var forceConfig = RED.nodes.getNode(req.params.id);
    var clientid,
        clientsecret;
    if (forceConfig && forceConfig.credentials && forceConfig.credentials.clientid) {
        clientid = forceConfig.credentials.clientid;
    } else {
        clientid = req.query.clientid;
    }
    if (forceConfig && forceConfig.credentials && forceConfig.credentials.clientsecret) {
        clientsecret = forceConfig.credentials.clientsecret;
    } else {
        clientsecret = req.query.clientsecret;
    }
    var credentials = {
        clientid: clientid,
        clientsecret: clientsecret,
        redirectUri : req.query.callback
    };
    RED.nodes.addCredentials(req.params.id, credentials);

    var oauth2 = new jsforce.OAuth2({
      loginUrl: req.query.loginurl,
      clientId : clientid,
      redirectUri : req.query.callback
    });
    var authUrl = oauth2.getAuthorizationUrl();
    if (req.query.username) authUrl = authUrl + '&login_hint=' + req.query.username;

    var resData = {};
    resData.authUrl = authUrl;
    res.send(resData);
  });

  RED.httpAdmin.get('/force-credentials/:id/auth/callback', function(req, res) {
    console.log("Recieved SF callback");
    if(!req.query.code){
        var sendHtml = "<html><head></head><body>ERROR: not return Authorization code</body></html>";
        return res.send(sendHtml);
    }
    var forceConfig = RED.nodes.getCredentials(req.params.id);

    var conn = new jsforce.Connection({
        oauth2 : {
            clientId : forceConfig.clientid,
            clientSecret : forceConfig.clientsecret,
            redirectUri : forceConfig.redirectUri
        }
    });

    conn.authorize(req.query.code, function(err, userInfo) {
        if (err) {
          node.error(err.toString());
          node.status({ fill: 'red', shape: 'ring', text: 'failed' });
          var sendHtml = "<html><head></head><body>" + err.toString() + "</body></html>";
          return res.send(sendHtml);
        }

        var credentials = {
            clientid: forceConfig.clientid,
            clientsecret: forceConfig.clientsecret,
            accessToken: conn.accessToken,
            refreshToken: conn.refreshToken,
            instanceUrl: conn.instanceUrl
        };
        RED.nodes.addCredentials(req.params.id, credentials);

        var sendHtml = "<html><head></head><body>Authorised - you can close this window and return to Node-RED</body></html>";
        res.send(sendHtml);
      });
  });

  function ForceCreateCaseNode(n) {
    RED.nodes.createNode(this, n);
    this.salesforce = n.salesforce;
    this.sobject = n.sobject;
    this.extname = n.extname;
    this.operation = n.operation;
    this.subject = n.subject;
    this.description = n.description;
    this.priority = n.priority;
    this.forceConfig = RED.nodes.getNode(this.salesforce);
    this.xively_creds;

    var node = this;

    if (this.forceConfig) {
      settings.get().then(function(hsettings){
          node.xively_creds = hsettings.credsId;
          setupNode();
      });
    }else {
      this.error('missing salesforce configuration');
    }

    function setupNode(){
      node.on('input', function (msg) {
        node.sendMsg = function (err, result) {
          if (err) {
            node.error(err.toString());
            node.status({ fill: 'red', shape: 'ring', text: 'failed' });
          } else {
            node.status({});
          }
          msg.payload = result;
          node.send(msg);
        };

        this.forceConfig.login(function (conn, err) {
          if(err){
            node.sendMsg(err);
            return;
          }

          var post_obt = {};
          post_obt.subject = node.subject || msg.payload.subject;
          post_obt.description = node.description || JSON.stringify(msg.payload);
          post_obt.priority = node.priority || msg.payload.priority;
          post_obt.Asset = {xively__Device_ID__c: msg.device.id};
          post_obt.xively__XI_Device_ID__c = msg.device.id;
          
          // contact currently throws from SF
          // INVALID_FIELD: Foreign key external ID: 66f8b672-5d8e-40b2-af6b-0659f7d97659 not found for field xively__XI_End_User_ID__c in entity Contact
          // nodeUtil.ensureMsgHasDeviceInfo(node.xively_creds, msg).then(function(updatedMsg){
          //     var orgId = updatedMsg.device.organizationId;
          //     post_obt.Contact = {xively__XI_End_User_ID__c: orgId};
          // }).catch(function(err){
          //     RED.log.warn("Unable to capture device info for sf device case: "+err);
          // }).finally(function(){
          //     conn.sobject(node.sobject).create(post_obt, node.sendMsg);
          // });
          conn.sobject(node.sobject).create(post_obt, node.sendMsg);

        }, msg);
      });
    }
  }
  RED.nodes.registerType('salesforce-create-case out', ForceCreateCaseNode);

  function ForceCreateXiMessageNode(n) {
    RED.nodes.createNode(this, n);
    this.salesforce = n.salesforce;
    this.sobject = "Xively1__Xively_Message__c";
    this.forceConfig = RED.nodes.getNode(this.salesforce);
    this.xively_creds;

    var node = this;

    if (this.forceConfig) {
      settings.get().then(function(hsettings){
          node.xively_creds = hsettings.credsId;
          setupNode();
      });
    }else {
      this.error('missing salesforce configuration');
    }

    function setupNode(){
      node.on('input', function (msg) {
        node.sendMsg = function (err, result) {
          if (err) {
            node.error(err.toString());
            node.status({ fill: 'red', shape: 'ring', text: 'failed' });
          } else {
            node.status({});
          }
          msg.payload = result;
          node.send(msg);
        };

        this.forceConfig.login(function (conn, err) {
          if(err){
            node.sendMsg(err);
            return;
          }

          if (typeof msg.payload === 'string') { 
            // attempt to try and parse it as JSON
            try {
                msg.payload = JSON.parse(msg.payload);
            } catch (e) {
                //ignore it
            }
          }

          var post_obt = {};
          post_obt.Xively1__Message__c = JSON.stringify(msg);
          
          conn.sobject(node.sobject).create(post_obt, node.sendMsg);

        }, msg);
      });
    }
  }
  RED.nodes.registerType('salesforce-create-xi-message out', ForceCreateXiMessageNode);



  function ForceCreateInventoryRequestNode(n) {
    RED.nodes.createNode(this, n);
    this.salesforce = n.salesforce;
    this.forceConfig = RED.nodes.getNode(this.salesforce);
    this.xively_creds;

    var node = this;

    if (this.forceConfig) {
      settings.get().then(function(hsettings){
          node.xively_creds = hsettings.credsId;
          setupNode();
      });
    }else {
      this.error('missing salesforce configuration');
    }

    function setupNode(){
      node.on('input', function (msg) {
        node.sendMsg = function (err, result) {
          if (err) {
            node.error(err.toString());
            node.status({ fill: 'red', shape: 'ring', text: 'failed' });
          } else {
            node.status({});
          }
          msg.payload = result;
          node.send(msg);
        };

        this.forceConfig.login(function (conn, err) {
          if(err){
            node.sendMsg(err);
            return;
          }

          var post_obt = {};
          post_obt.Status__c = "New - Requested";
          post_obt.Request_Date_Time__c = new Date().toISOString();

          nodeUtil.ensureMsgHasDeviceInfo(node.xively_creds, msg).then(function(updatedMsg){
            post_obt.Employee_Requestor__c = updatedMsg.device.employeeId || "003B0000006JIlS";
            post_obt.Request_Type__c = updatedMsg.device.vendorType || "Popcorn";
            post_obt.Request_Geolocation__Latitude__s = msg.latitude || updatedMsg.device.latitude;
            post_obt.Request_Geolocation__Longitude__s = msg.longitude || updatedMsg.device.longitude;
            conn.sobject('Inventory_Request__c').create(post_obt, node.sendMsg);
          });

        }, msg);
      });
    }
  }
  //RED.nodes.registerType('salesforce-inventory-request out', ForceCreateInventoryRequestNode);


  function ForceCreateEmergencyTrackingNode(n) {
    RED.nodes.createNode(this, n);
    this.salesforce = n.salesforce;
    this.forceConfig = RED.nodes.getNode(this.salesforce);
    this.xively_creds;

    var node = this;

    if (this.forceConfig) {
      settings.get().then(function(hsettings){
          node.xively_creds = hsettings.credsId;
          setupNode();
      });
    }else {
      this.error('missing salesforce configuration');
    }

    function setupNode(){
      node.on('input', function (msg) {
        node.sendMsg = function (err, result) {
          if (err) {
            node.error(err.toString());
            node.status({ fill: 'red', shape: 'ring', text: 'failed' });
          } else {
            node.status({});
          }
          msg.payload = result;
          node.send(msg);
        };

        this.forceConfig.login(function (conn, err) {
          if(err){
            node.sendMsg(err);
            return;
          }

          var post_obt = {};
          post_obt.Status__c = "New";
          post_obt.Emergency_Type__c = "Perpetrator";
          post_obt.Reported_Date_Time__c = new Date().toISOString();

          nodeUtil.ensureMsgHasDeviceInfo(node.xively_creds, msg).then(function(updatedMsg){
            post_obt.Employee__c = updatedMsg.device.employeeId || "003B0000006JIlS";
            post_obt.Emergency_Geolocation__Latitude__s = msg.latitude || updatedMsg.device.latitude;
            post_obt.Emergency_Geolocation__Longitude__s = msg.longitude || updatedMsg.device.longitude;
            conn.sobject('Emergency_Tracking__c').create(post_obt, node.sendMsg);
          });

        }, msg);
      });
    }
  }
  //RED.nodes.registerType('salesforce-emergency-request out', ForceCreateEmergencyTrackingNode);

  function ForceCreateCheckInNode(n) {
    RED.nodes.createNode(this, n);
    this.salesforce = n.salesforce;
    this.forceConfig = RED.nodes.getNode(this.salesforce);
    this.xively_creds;

    var node = this;

    if (this.forceConfig) {
      settings.get().then(function(hsettings){
          node.xively_creds = hsettings.credsId;
          setupNode();
      });
    }else {
      this.error('missing salesforce configuration');
    }

    function setupNode(){
      node.on('input', function (msg) {
        node.sendMsg = function (err, result) {
          if (err) {
            node.error(err.toString());
            node.status({ fill: 'red', shape: 'ring', text: 'failed' });
          } else {
            node.status({});
          }
          msg.payload = result;
          node.send(msg);
        };

        this.forceConfig.login(function (conn, err) {
          if(err){
            node.sendMsg(err);
            return;
          }

          var post_obt = {};
          post_obt.Date_Time__c = new Date().toISOString();
          post_obt.Request_Type__c = "Check-In";

          nodeUtil.ensureMsgHasDeviceInfo(node.xively_creds, msg).then(function(updatedMsg){
            post_obt.Employee__c = updatedMsg.device.employeeId || "003B0000006JIlS";
            post_obt.Request_Geolocation__Latitude__s = msg.latitude || updatedMsg.device.latitude;
            post_obt.Request_Geolocation__Longitude__s = msg.longitude || updatedMsg.device.longitude;
            conn.sobject('Check_in__c').create(post_obt, node.sendMsg);
          });

        }, msg);
      });
    }
  }
  //RED.nodes.registerType('salesforce-checkin-request out', ForceCreateCheckInNode);
}
