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

    var getJwt = require("../../xively/habanero/auth").getJwtForCredentialsId;
    var blueprint = require("../../xively/services/blueprint");

    function XivelyUserCredentialsNode (config) {
        RED.nodes.createNode(this, config);
        this.creds_name = config.creds_name;
    }

    RED.nodes.registerType("xively-user-credentials", XivelyUserCredentialsNode, {
        credentials: {
            creds_name: {type: "text"},
            account_id: {type: "text"},
            user_id: {type: "text"},
            account_user_id: {type: "text"},
            username: {type: "text"},
            password: {type: "password"},
            mqtt_secret: {type: "password"}
        }
    });

    RED.httpAdmin.get('/xively/deviceTemplates/:id', RED.auth.needsPermission(""), function(req, res, next) {
        getJwt(req.params.id).then(function(jwtConfig){
            blueprint.devicesTemplates.get(jwtConfig.account_id, jwtConfig.jwt).then(function(dTemplatesResp){
                res.json(dTemplatesResp.deviceTemplates.results);
            });
        }).catch(function(err){
            console.log(err);
            res.json([err]);
        });
    });

    RED.httpAdmin.get('/xively/deviceTemplates/:id/customFields/:tmplId', RED.auth.needsPermission(""), function(req, res, next) {
        getJwt(req.params.id).then(function(jwtConfig){
            blueprint.devicesTemplates.getCustomFields(jwtConfig.account_id, jwtConfig.jwt, req.params.tmplId).then(function(cFieldsResp){
                res.json(cFieldsResp.deviceFields.results);
            });
        }).catch(function(err){
            console.log(err);
            res.json([err]);
        });
    });

    RED.httpAdmin.get('/xively/orgs/:id', RED.auth.needsPermission(""), function(req, res, next) {
        getJwt(req.params.id).then(function(jwtConfig){
            blueprint.organizations.get(jwtConfig.account_id, jwtConfig.jwt, req.query.parentId, req.query.page).then(function(dOrgsResp){
                res.json(dOrgsResp.organizations.results);
            });
        }).catch(function(err){
            console.log(err);
            res.json([err]);
        });
    });
};