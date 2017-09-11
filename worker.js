var amqp   =  require('amqp');
var rabbit =  amqp.createConnection();

rabbit.on('ready', function(){
  rabbit.exchange('gfs_code', {autoDelete: false}, function(exchange){
    rabbit.queue('gfs', {autoDelete: false}, function(queue){
      queue.bind('gfs_code', 'gfs');
      queue.subscribe(function(message, headers, deliveryInfo, messageObject){
        console.log('the message is', message);
        console.log('headers', headers);
        console.log('delivery info', deliveryInfo);
        exchange.publish(deliveryInfo.replyTo, {message: message}, {headers: headers});
      });
    });
  });
});
