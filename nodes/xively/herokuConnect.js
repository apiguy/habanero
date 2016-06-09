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

    var createKnex = require('knex');
    var when = require("when");

    var schema = 'salesforce';

    var nodeUtil = require("../../xively/habanero/nodeUtil");

    var knex = createKnex({
	  client: 'pg',
	  connection: process.env.DATABASE_URL+'?ssl=true'
	});

    function HerokuConnectInsertNode (n) {
        RED.nodes.createNode(this, n);
        this.crudtype = n.crudtype;
        this.whereValue = n.whereValue;
        this.whereValueType = n.whereValueType;
        this.table = n.table;
        this.mappings = n.mappings;
        var node = this;

        function isEmpty(obj) {

            // null and undefined are "empty"
            if (obj == null) return true;

            // Assume if it has a length property with a non-zero value
            // that that property is correct.
            if (obj.length > 0)    return false;
            if (obj.length === 0)  return true;

            // Otherwise, does it have any properties of its own?
            // Note that this doesn't handle
            // toString and valueOf enumeration bugs in IE < 9
            for (var key in obj) {
                if (hasOwnProperty.call(obj, key)) return false;
            }

            return true;
        }

        function createCrudRequest(msg){
            if(node.crudtype == "insert"){
            	var stamp = new Date().toISOString().slice(0,-5);
            	var insert = {
            		createddate:stamp,
            		systemmodstamp:stamp
            	};
            	node.mappings.forEach((mapping, i) => {
            		insert[mapping.iv] = RED.util.evaluateNodeProperty(mapping.v,mapping.vt,this,msg);
            	});
            	knex.withSchema(schema).insert(insert).returning('*').into(node.table).then((result) => {
            		// clobber the payload
            		msg.payload = result;
            		node.send(msg);
            	});
            }else if(node.crudtype == "update"){
                var whereId = RED.util.evaluateNodeProperty(node.whereValue,node.whereValueType,this,msg);
                var update = {};
                node.mappings.forEach((mapping, i) => {
                    update[mapping.iv] = RED.util.evaluateNodeProperty(mapping.v,mapping.vt,this,msg);
                });
                knex(node.table).withSchema(schema).where('sfid', whereId).update(update).returning('*').then((result) => {
                    // clobber the payload
                    msg.payload = result;
                    node.send(msg);
                });
            }else{
                RED.log.warn("Unknown crud type: "+node.crudtype);
            }
        }

        node.on('input', function (msg) {
        	try {
                if(!isEmpty(msg.payload)){
                    nodeUtil.ensureMsgHasDeviceInfo(null, msg).then(function(updatedMsg){
                        createCrudRequest(updatedMsg);
                        msg = null;
                    });
                }
            } catch(err) {
                this.error(err,msg);
            }

        });
    }

    RED.nodes.registerType("heroku-connect insert", HerokuConnectInsertNode);


    function getTableInfo(table_name){
    	return when.promise(function(resolve, reject) {
			knex.raw("SELECT column_name FROM information_schema.columns WHERE table_schema = 'salesforce' AND table_name = ?", [table_name]).then(function(resp) {
			  var table = {name:table_name, columns:[]};
			  resp.rows.forEach(function(column, i){
			  	if(column.column_name.indexOf('_') !== 0 && column.column_name !== "systemmodstamp" && column.column_name !== "sfid"){
			  		table.columns.push(column.column_name);
			  	}
			  });
			  resolve(table);
			});
		});
	}

	function getHCScheme(){
		return when.promise(function(resolve, reject) {
			var schema = [];
			knex.raw("SELECT table_name FROM information_schema.tables WHERE table_schema = 'salesforce'").then(function(resp) {
			  var allTables = [];
			  resp.rows.forEach(function(table, i){
			  	if(table.table_name.indexOf('_') !== 0){
			  		allTables.push(getTableInfo(table.table_name));
			  	}
			  });
			  when.all(allTables).then(function(tables){
			  	resolve(tables);
			  });
			}).catch(function(err){
				reject(err);
			});

		});
	}
		

    RED.httpAdmin.get('/xively/heroku-connect/scheme', RED.auth.needsPermission(""), function(req, res, next) {
        getHCScheme().then(function(tables){
            res.json({tables:tables});
        }).catch(function(err){
            console.log(err);
            res.json([err]);
        });
    });
};






