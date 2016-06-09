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

    var knex = createKnex({
	  client: 'pg',
	  connection: process.env.DATABASE_URL+'?ssl=true'
	});

    function HerokuConnectInsertNode (n) {
        RED.nodes.createNode(this, n);
        this.table = n.table;
        this.mappings = n.mappings;
        var node = this;

        function createInsertRequest(msg){
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
        }

        node.on('input', function (msg) {
        	try {
                createInsertRequest(msg);
                msg = null;
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
			  	if(column.column_name.indexOf('_') !== 0 && column.column_name !== "systemmodstamp"){
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






