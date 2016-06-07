var redis = require('redis'),
    client = redis.createClient({
        url: 'redis://h:pbk5tnqagv5auc5ub9l4erfjq6g@ec2-23-21-84-3.compute-1.amazonaws.com:7728 ',
        retry_strategy: function (options) {
            if (options.times_connected > 15) {
                // End reconnecting with built in error 
                return undefined;
            }
            // reconnect after 
            return Math.max(options.attempt * 100, 3000);
        }
    });




