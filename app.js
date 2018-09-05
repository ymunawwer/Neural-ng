CONTROLLERS = __dirname + '/controllers/';
UPLOADFILE = __dirname + '/uploads/';
MODELS = __dirname + '/models/';
var createError = require('http-errors');
var express = require('express');
var path = require('path');
const config = require('config');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var morgan = require('morgan');
const mongoose = require('mongoose');
mongoose.Promise = Promise;
// DB2 = mongoose.createConnection(config.get('databaseName'), { useMongoClient: true, keepAlive: 300000, connectTimeoutMS: 30000 }, console.log);
mongoose.connect(config.get('databaseName'), { useNewUrlParser: true });
const winston = require('./config/winston');

var indexRouter = require('./routes/index');
var neuralZomeUserRouter = require('./routes/neuralZomeUser');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(morgan('combined', { stream: winston.stream }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
const allowCrossDomain = (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // intercept OPTIONS method
  if ('OPTIONS' == req.method) {
    res.sendStatus(200);
  } else {
    next();
  }
};
app.use((req, res, next) => {
  res.sendResponse = (body, message, statusCode) => {
    try {
      let status = true;
      statusCode = statusCode || 200;
      message = message;
      if(body.info == true){
        winston.info(`${'Email : '+body.email} - ${'ModelId : '+body.modelId}`);
      }
      res.json({ body, message, statusCode, status });
    }
    catch (ex) {
      return next(ex);
    }
  }
  next();
});
app.use(allowCrossDomain);
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/neuralZome', neuralZomeUserRouter);
app.use('/', indexRouter);

// catch 404 and forward to error handler
// app.use(function (req, res, next) {
//   next(createError(404));
// });
app.use((req, res, next) => {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  let response = {};
  response.message = err;
  response.status = false;
  response.errodCode = err.status || 500;
  response.statusText = 'fail';
  response.body = {};
  res.json(response);
});

module.exports = app;
