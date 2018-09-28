var request = require('request');
var multer = require('multer');
var fs = require('fs');
const config = require('config');
const ai_url = config.get('ai_URL');
const neuralZomeUserModel = require(MODELS + 'neuralZomeUser');
var nodemailer = require('nodemailer');

var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: config.get('node_mailer')
});

exports.preprocessing_modelling = function (req, res, next) {
    try {
        var bodyDetails = req.body;
        neuralZomeUserModel.find({ email: req.body.email, "model.model_id": req.body.modelId }, (err, record) => {
            if (err) {
                console.log(err);
            } else {
                if (record.length > 0) {
                    if ((record[0].premium == 'Free') && (record[0].total_model_count < config.get('free_version.total_model_count')) && (record[0].total_api_hit_count < config.get('free_version.total_api_hit_count'))) {
                        sendPreprocessingData(bodyDetails, res, next);
                    } else if ((record[0].premium == 'Gold') && (record[0].total_model_count < config.get('gold_version.total_model_count')) && (record[0].total_api_hit_count < config.get('gold_version.total_api_hit_count'))) {
                        sendPreprocessingData(bodyDetails, res, next);
                    } else if ((record[0].premium == 'Platinum')) {
                        sendPreprocessingData(bodyDetails, res, next);
                    } else {
                        next('Buy premium');
                    }
                } else {
                    next('Invalid data');
                }
            }
        });
    } catch (ex) {
        return ex;
    }
}

function sendPreprocessingData(bodyDetails, res, next) {
    neuralZomeUserModel.findOneAndUpdate({
        email: bodyDetails.email,
        "model.model_id": bodyDetails.modelId
    }, {
            'model.$.algo': bodyDetails.algo,
            'model.$.x_list': JSON.stringify(bodyDetails.x_list),
            'model.$.y_list': JSON.stringify(bodyDetails.y_list),
        }, { multi: true }, function (err, record) {
            if (err) {
                console.log(err);
            } else {
                console.log(record);
                bodyDetails.tt_split = "80% train and 20% test";
                request.post({
                    url: ai_url + 'preprocessing_modelling',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    json: bodyDetails
                }, function (error, body) {
                    if (error) {
                        console.log(error);
                    } else {
                        if (body.body.status == 'true') {
                            var result = body.body;
                            console.log(result);
                            neuralZomeUserModel.findOneAndUpdate({
                                email: result.email,
                                "model.model_id": result.modelId
                            }, {
                                    $inc: { total_model_count: 1, 'model.$.model_count': 1 },
                                    'model.$.accuracy': result.accuracy,
                                    'model.$.train_split': result.train_split,
                                    'model.$.test_split': result.test_split,
                                    'model.$.model_file_path': result.download,
                                    'model.$.pkl_file_path': result.pklfile,
                                    'model.$.hint': result.hint,
                                    'model.$.steps': bodyDetails.steps
                                }, { multi: true }, function (err, record) {
                                    if (err) {
                                        console.log(err);
                                    } else {
                                        console.log(record);
                                        const mailOptions = {
                                            from: 'support@neuralzome.com', // sender address
                                            to: result.email, // list of receivers
                                            subject: 'Greetings from Neuralzome', // Subject line
                                            html: '<p>Hi,</p>' +
                                                '<p>Thanks for using Neuralzome! Please use below link with given email address</p>' +
                                                '<p>and modelId to make predictions.</p>' +
                                                '<p>email: ' + result.email + '</p>' +
                                                '<p>modelId: ' + result.modelId + '</p>' +
                                                '<p>' + 'http://neuralzome.com/api' + '</p>' +
                                                '<p>if any issues and need help contact' + ' mohan@gamasome.com' + '</p>' +
                                                '<br>' + '<br>' + '<p>Regards,</p>' + '<p>The Gamasome Interactive LLP</p>'
                                        };

                                        transporter.sendMail(mailOptions, function (err, info) {
                                            if (err) {
                                                console.log(err);
                                                next(err);
                                            } else {
                                                console.log('email sent successfully', info);
                                            }
                                        });

                                        // send mail to email
                                        result.info = true;
                                        res.sendResponse(result, 'Preprocessing successfully.');
                                    }
                                });
                        } else {
                            next(body.body);
                        }
                    }
                });
            }
        });
}

exports.getPredictResult = function (req, res, next) {
    try {
        var bodyDetails = req.body;
        neuralZomeUserModel.find({ email: req.body.email, "model.model_id": req.body.modelId }, (err, record) => {
            if (err) {
                console.log(err);
            } else {
                if (record.length > 0) {
                    if ((record[0].premium == 'Free') && (record[0].total_model_count < config.get('free_version.total_model_count')) && (record[0].total_api_hit_count < config.get('free_version.total_api_hit_count'))) {
                        sendPredictData(bodyDetails, res, next);
                    } else if ((record[0].premium == 'Gold') && (record[0].total_model_count < config.get('gold_version.total_model_count')) && (record[0].total_api_hit_count < config.get('gold_version.total_api_hit_count'))) {
                        sendPredictData(bodyDetails, res, next);
                    } else if ((record[0].premium == 'Platinum')) {
                        sendPredictData(bodyDetails, res, next);
                    } else {
                        next('Buy premium');
                    }
                } else {
                    next('Invalid data');
                }
            }
        });
    } catch (ex) {
        return ex;
    }
}

function sendPredictData(bodyDetails, res, next) {
    request.post({
        url: ai_url + 'predict',
        headers: {
            'Content-Type': 'application/json'
        },
        json: bodyDetails
    }, function (error, body) {
        if (error) {
            console.log(error);
        } else {
            if (body.body.status == 'true') {
                var result = body.body;
                neuralZomeUserModel.findOneAndUpdate({
                    email: result.email,
                    "model.model_id": result.modelId
                }, {
                        'model.$.steps': bodyDetails.steps,
                        $inc: { total_api_hit_count: 1, 'model.$.api_hit_count': 1 },
                    }, { multi: true }, function (err, record) {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log(record);
                            result.info = false;
                            res.sendResponse(result, 'Preprocessing successfully.');
                        }
                    });
            } else {
                next(body.body);
            }
        }
    });
}

exports.contactus = function (req, res, next) {
    try {
        var contactusData = req.body;

        console.log('form data', contactusData);


        const mailOptions = {
            from: 'support@neuralzome.com', // sender address
            to: ['mohan@gamasome.com', 'prasanna@gamasome.com', 'pmohansivam@gmail.com'], // list of receivers
            subject: 'Query from customer-Neuralzome', // Subject line
            html: '<p>Hi,</p>' +
                '<p>Following are the details and query from the customer</p>' +
                '<p>Name: ' + contactusData.name + '</p>' +
                '<p>Email: ' + contactusData.email + '</p>' +
                '<p>Mobile: ' + contactusData.mobile + '</p>' +
                '<p>Message: ' + contactusData.message + '</p>'
        };

        transporter.sendMail(mailOptions, function (err, info) {
            if (err) {
                console.log(err);
                next(err);
            } else {
                res.sendResponse(info, 'successfully.');
                console.log('email sent successfully', info);
            }
        });


    } catch (ex) {
        return ex;
    }
}

exports.evaluateAccuracy = function (req, res, next) {
    try {
        var bodyDetails = req.body;
        request.post({
            url: ai_url + 'evaluate',
            headers: {
                'Content-Type': 'application/json'
            },
            json: bodyDetails
        }, function (error, body) {
            if (error) {
                next(error);
            } else {
                var result = body.body;
                if (result.status == 'True') {
                    var finalStruct = {};
                    finalStruct.result = result;
                    neuralZomeUserModel.find({ email: result.email },
                        { model: { $elemMatch: { model_id: result.modelId } } }, (err, record) => {
                            if (err) {
                                next(err)
                            } else {
                                finalStruct.record = record;
                                if (record.length > 0) {
                                    if (record[0]._doc.model[0] != undefined) {
                                        Object.keys(record[0]._doc.model[0].algo_hyper).forEach(function (key) {
                                            if (key.indexOf(finalStruct.result.algo) != -1) {
                                                var hyper_value = record[0]._doc.model[0].algo_hyper[key];
                                                Object.keys(hyper_value).map(function (key, index) {
                                                    hyper_value[key].accuracy = finalStruct.result.accuracy[key] != undefined ? finalStruct.result.accuracy[key] : hyper_value[key].accuracy;
                                                });
                                                finalStruct.hyper_accuracy = record[0]._doc.model[0].algo_hyper;
                                            }
                                        });
                                        neuralZomeUserModel.findOneAndUpdate({
                                            email: finalStruct.result.email,
                                            "model.model_id": finalStruct.result.modelId
                                        }, {
                                                'model.$.algo_hyper': finalStruct.hyper_accuracy
                                            }, { multi: true }, function (err, record) {
                                                if (err) {
                                                    next(err);
                                                } else {
                                                    var finalResult = {};
                                                    finalResult.email = finalStruct.result.email;
                                                    finalResult.algo_hyper = finalStruct.hyper_accuracy;
                                                    finalResult.tt_split = finalStruct.record[0].tt_split;
                                                    finalResult.file_path = finalStruct.record[0]._doc.model[0].filepath;
                                                    finalResult.model_id = finalStruct.record[0]._doc.model[0].model_id;
                                                    res.sendResponse(finalResult, 'Accuracy evaluated  successfully..');
                                                }
                                            });
                                    } else {
                                        next('Invalid model');
                                    }
                                } else {
                                    next('Invalid data');
                                }
                            }
                        });
                } else {
                    next(result);
                }
            }
        });
    } catch (ex) {
        return ex;
    }
}