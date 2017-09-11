var express    =  require('express');
var amqp       =  require('amqp');
var io         =  require('socket.io');
var app        =  express();
var port       =  3000;
var connection =  amqp.createConnection();

/**
 * set current directory as static directory
 * usually we use public directory as static directory example
 * app.use(express.static(__dirname + '/public'));
 */
app.use(express.static(__dirname));

connection.on('ready', function(){
  /**
   * connection.exchange(name, options={}, openCallback)
   * this is just basic  rabbitMQ exchange with ques
   * this will be improved and basically this is just backend stuff
   * https://github.com/postwait/node-amqp
   *
   */
  connection.exchange('gfs_code', {autoDelete: false}, function(exchange) {
    console.log('Exchange ' + exchange.name + ' is open');
    connection.queue('gfs', {autoDelete: false}, function(queue){
      queue.bind('gfs_code', queue.name);
      queue.close();
      runServer(exchange);
    });
  });
});

/**
 * this is the sample data we're sending
 * just an example
 *
 */
var theData = {
  code    : "2334-232333-344-00-33-01",
  details : 'Details'
};

/**
 *
 * run server function takes an exchange bind the route to
 * a queue
 * @params exchange RabbitMQ exchange
 */
function runServer(exchange){
  app.get('/gfs_code', function(req, res){
    connection.queue('', {exclusive: true, autoDelete: true}, function(queue){
      queue.bind('gfs_code', queue.name);
      exchange.publish('gfs', {card: data}, {replyTo: queue.name});
      queue.subscribe(function(message){
        console.log(message);
        queue.destroy();
        queue.close();
        res.send('new-gfs!');
      });
    });
  });

  /**
   * start listening on port 8002 and log
   * some data in console
   *
   */
  var server = app.listen(port, function() {
    console.log('app listening on', port);
  });

  /**
   *
   * set socket.io to listen to the same port as
   * our server, this is needed, below are just basic socket.io stuff
   * https://socket.io/
   */
  io = io.listen(server);

  io.on('connection', function(socket){
    connection.queue(socket.id, {exclusive: true, autoDelete: true}, function(queue){
      queue.bind('gfs_code', queue.name);
      queue.subscribe(function(message, headers, delivery){
        socket.emit(headers.emitEvent);
      });

      socket.on('gfs', function(){
        console.log('new-gfs through socket', theData);
        socket.emit('gfs-received', theData);
        exchange.publish('gfs', {gfs: theData}, {
          replyTo: queue.name, headers: {emitEvent: 'new-gfs'}
        });
      });

      socket.on('disconnect', function(){
        console.log('socket disconnected');
        queue.destroy();
        queue.close();
      });
    });
  });
}
