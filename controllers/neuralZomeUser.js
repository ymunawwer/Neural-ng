var request = require('request');
var multer = require('multer');
var fs = require('fs');
const config = require('config');
const ai_url = config.get('ai_URL');
const neuralZomeUserModel = require(MODELS + 'neuralZomeUser');
var user_details;
var NeuralZoneData = {};
var nodemailer = require('nodemailer');

var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: config.get('node_mailer')
});

const storage = multer.diskStorage({
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + '.' + file.originalname.split('.').pop());
    }
});
const upload = multer({ storage: storage }).single('file');

exports.uploadFile = function (req, res, next) {
    try {
        var file_details;
        upload(req, res, function (err) {
            if (err) {
                return err;
            }
            if ((res.req.file) && (res.req.body.email)) {
                neuralZomeUserModel.find({ 'email': res.req.body.email }, function (err, body) {
                    if (err) {
                        console.log(err);
                    } else {
                        NeuralZoneData.file_details = res.req.file;
                        NeuralZoneData.user_details = res.req.body;
                        if (body.length > 0) {
                            if ((body[0].premium == 'Free') && (body[0].total_model_count < config.get('free_version.total_model_count')) && (body[0].total_api_hit_count < config.get('free_version.total_api_hit_count'))) {
                                sendDataToAI(NeuralZoneData, 1, body[0], res, next);
                            } else if ((body[0].premium == 'Gold') && (body[0].total_model_count < config.get('gold_version.total_model_count')) && (body[0].total_api_hit_count < config.get('gold_version.total_api_hit_count'))) {
                                sendDataToAI(NeuralZoneData, 1, body[0], res, next);
                            } else if ((body[0].premium == 'Platinum')) {
                                sendDataToAI(NeuralZoneData, 1, body[0], res, next);
                            } else {
                                next('Buy premium');
                            }
                        } else {
                            sendDataToAI(NeuralZoneData, 0, {}, res, next);
                        }
                    }
                });
            } else {
                next('File and Email is required');
            }
        })
    } catch (ex) {
        return ex;
    }
}

exports.getDetailsForPredict = function (req, res, next) {
    try {
        var modelId = req.body.modelId;
        neuralZomeUserModel.find({ email: req.body.email, "model.model_id": req.body.modelId }, (err, record) => {
            if (err) {
                console.log(err);
            } else {
                if (record.length > 0) {
                    var data;
                    var result = record[0].model.find(function (item) {
                        if (item.model_id == modelId) {
                            return item;
                        }
                    });
                    if ((result.steps == 2) || result.steps == 3) {
                        data = { 'email': record[0].email, 'model_details': result };
                        if ((record[0].premium == 'Free') && (record[0].total_model_count < config.get('free_version.total_model_count')) && (record[0].total_api_hit_count < config.get('free_version.total_api_hit_count'))) {
                            data.info = false;
                            return res.sendResponse({
                                data
                            }, "User data fetched successfully");
                        } else if ((record[0].premium == 'Gold') && (record[0].total_model_count < config.get('gold_version.total_model_count')) && (record[0].total_api_hit_count < config.get('gold_version.total_api_hit_count'))) {
                            data.info = false;
                            return res.sendResponse({
                                data
                            }, "User data fetched successfully");
                        } else if ((record[0].premium == 'Platinum')) {
                            data.info = false;
                            return res.sendResponse({
                                data
                            }, "User data fetched successfully");
                        } else {
                            next('Buy premium');
                        }
                    } else {
                        next('Please complete step 2');
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

function sendDataToAI(NeuralZoneData, num, data, res, next) {
    let formData = {
        file: {
            value: fs.createReadStream(NeuralZoneData.file_details.path),
            options: {
                filename: NeuralZoneData.file_details.filename,
                contentType: NeuralZoneData.file_details.mimetype
            }
        },
        email: NeuralZoneData.user_details.email
    };
    request.post({
        url: ai_url + 'uploader',
        headers: {
            'Content-Type': 'multipart/form-data'
        },
        formData: formData
    }, function (error, body) {
        if (error) {
            next(error);
        } else {
            if ((typeof (body.body) == "string") && JSON.parse(body.body).status == 'true') {
                var result = JSON.parse(body.body);
                var obj;
                if (result.status == 'true') {
                    if (num == 0) {
                        obj = {
                            email: result.email,
                            tt_split: result.tt_split,
                            model: [{
                                model_id: result.modelId,
                                algo_hyper: result.algo,
                                prob_type: result.prob_type,
                                data_types: JSON.stringify(result.datatypes),
                                filepath: result.filePath,
                                steps: parseInt(NeuralZoneData.user_details.steps),
                                file_extension: result.fileExtension,
                                created_at: new Date()
                            }]
                        };
                        new neuralZomeUserModel(obj).save(function (err, data) {
                            if (err) {
                                console.log(err);
                            } else {
                                result.info = false;
                                var finalResult = {};
                                finalResult.datatypes = result.datatypes;
                                finalResult.email = result.email;
                                finalResult.fileExtension = result.fileExtension;
                                finalResult.filePath = result.filePath;
                                finalResult.modelId = result.modelId;
                                finalResult.prob_type = result.prob_type;
                                res.sendResponse(finalResult, 'User created successfully.');
                            }
                        });
                    } else {
                        data.model.push({
                            model_id: result.modelId,
                            algo_hyper: result.algo,
                            prob_type: result.prob_type,
                            data_types: JSON.stringify(result.datatypes),
                            filepath: result.filePath,
                            steps: parseInt(NeuralZoneData.user_details.steps),
                            file_extension: result.fileExtension,
                            created_at: new Date()
                        })
                        obj = {
                            model: data.model

                        };
                        neuralZomeUserModel.findOneAndUpdate({
                            email: result.email
                        }, {
                                tt_split: result.tt_split,
                                'model': data.model

                            }, { multi: true }, function (err, record) {
                                if (err) {
                                    next('Network Error');
                                } else {
                                    result.info = false;
                                    var finalResult = {};
                                    finalResult.datatypes = result.datatypes;
                                    finalResult.email = result.email;
                                    finalResult.fileExtension = result.fileExtension;
                                    finalResult.filePath = result.filePath;
                                    finalResult.modelId = result.modelId;
                                    finalResult.prob_type = result.prob_type;
                                    res.sendResponse(finalResult, 'User updated successfully.');
                                }
                            });
                    }
                }
            } else {
                next(JSON.parse(body.body));
            }
        }
    });
}

exports.getAccuracyDetails = function (req, res, next) {
    try {
        var jsonStruct = {};
        var bodyDetails = req.body;
        neuralZomeUserModel.findOneAndUpdate({
            email: bodyDetails.email,
            "model.model_id": bodyDetails.modelId
        }, {
                'model.$.algo': bodyDetails.algo,
                'model.$.x_list': JSON.stringify(bodyDetails.x_list),
                'model.$.y_list': JSON.stringify(bodyDetails.y_list),
            }, { multi: true }, function (err, updatedResult) {
                if (err) {
                    next(err);
                } else {
                    if (updatedResult != null) {
                        jsonStruct.bodyDetails = bodyDetails;
                        request.post({
                            url: ai_url + 'algo_select',
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
                                    if (result.prediction_type == "auto") {
                                        jsonStruct.result = result;
                                        neuralZomeUserModel.findOneAndUpdate({
                                            email: result.email,
                                            "model.model_id": result.modelId
                                        }, {
                                                $inc: { total_model_count: 1, 'model.$.model_count': 1 },
                                                'model.$.accuracy': result.accuracy,
                                                'model.$.train_split': result.train_split,
                                                'model.$.test_split': result.test_split,
                                                'model.$.model_file_path': result.model_file_path,
                                                'model.$.pkl_file_path': result.pklfile,
                                                'model.$.hint': result.hint,
                                                'model.$.steps': 2
                                            }, { multi: true }, function (err, record) {
                                                if (err) {
                                                    console.log(err);
                                                } else {
                                                    const mailOptions = {
                                                        from: 'support@neuralzome.com', // sender address
                                                        to: result.email, // list of receivers
                                                        subject: 'Greetings from Neuralzome', // Subject line
                                                        html: '<p>Hi,</p>' +
                                                            '<p>Thanks for using Neuralzome! Please use below link with given email address</p>' +
                                                            '<p>and modelId to make predictions.</p>' +
                                                            '<p>email: ' + result.email + '</p>' +
                                                            '<p>modelId: ' + result.modelId + '</p>' +
                                                            '<p>' + config.get('neural_zome_dev') + 'api' + '</p>' +
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
                                                    res.sendResponse(jsonStruct.result, 'Preprocessing successfully.');
                                                }
                                            });
                                    } else if (result.prediction_type == "custom") {
                                        jsonStruct.result = result;
                                        if (jsonStruct.bodyDetails.deploy == "True") {
                                            neuralZomeUserModel.findOneAndUpdate({
                                                email: jsonStruct.result.email,
                                                "model.model_id": jsonStruct.result.modelId
                                            }, {
                                                    'model.$.accuracy': jsonStruct.result.accuracy,
                                                    'model.$.train_split': jsonStruct.result.train_split,
                                                    'model.$.test_split': jsonStruct.result.test_split,
                                                    'model.$.model_file_path': jsonStruct.result.model_file_path,
                                                    'model.$.pkl_file_path': jsonStruct.result.pklfile,
                                                    'model.$.hint': jsonStruct.result.hint,
                                                    'model.$.steps': 2
                                                }, { multi: true }, function (err, record) {
                                                    if (err) {
                                                        next(err);
                                                    } else {
                                                        const mailOptions = {
                                                            from: 'support@neuralzome.com', // sender address
                                                            to: result.email, // list of receivers
                                                            subject: 'Greetings from Neuralzome', // Subject line
                                                            html: '<p>Hi,</p>' +
                                                                '<p>Thanks for using Neuralzome! Please use below link with given email address</p>' +
                                                                '<p>and modelId to make predictions.</p>' +
                                                                '<p>email: ' + result.email + '</p>' +
                                                                '<p>modelId: ' + result.modelId + '</p>' +
                                                                '<p>' + config.get('neural_zome_dev') + 'api' + '</p>' +
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
                                                        res.sendResponse(jsonStruct.result, 'fetching accuracy successfully.');
                                                    }
                                                });
                                        } else {
                                            neuralZomeUserModel.find({ email: result.email },
                                                { model: { $elemMatch: { model_id: result.modelId } } }, (err, record) => {
                                                    if (err) {
                                                        next(err)
                                                    } else {
                                                        if (record.length > 0) {
                                                            jsonStruct.model = record[0];
                                                            if (jsonStruct.model._doc.model[0] != undefined) {
                                                                Object.keys(jsonStruct.model._doc.model[0].algo_hyper).forEach(function (key) {
                                                                    if (key.indexOf(jsonStruct.result.algo) != -1) {
                                                                        var hyper_value = jsonStruct.model._doc.model[0].algo_hyper[key];
                                                                        Object.keys(hyper_value).map(function (key, index) {
                                                                            hyper_value[key].accuracy = jsonStruct.result.accuracy[key];
                                                                        });
                                                                        jsonStruct.hyper_accuracy = hyper_value;
                                                                    }
                                                                });
                                                                neuralZomeUserModel.findOneAndUpdate({
                                                                    email: jsonStruct.result.email,
                                                                    "model.model_id": jsonStruct.result.modelId
                                                                }, {
                                                                        'model.$.algo_hyper': jsonStruct.model._doc.model[0].algo_hyper
                                                                    }, { multi: true }, function (err, record) {
                                                                        if (err) {
                                                                            next(err);
                                                                        } else {
                                                                            var finalResult = {};
                                                                            finalResult.email = record.email;
                                                                            finalResult.algo = jsonStruct.result.algo;
                                                                            finalResult.prediction_type = jsonStruct.result.prediction_type;
                                                                            finalResult.tt_split = record.tt_split;
                                                                            finalResult.file_path = jsonStruct.model._doc.model[0].filepath;
                                                                            finalResult.file_extension = jsonStruct.model._doc.model[0].file_extension;
                                                                            finalResult.model_id = jsonStruct.model._doc.model[0].model_id;
                                                                            finalResult.algo_hyper = jsonStruct.hyper_accuracy;
                                                                            finalResult.x_list = jsonStruct.bodyDetails.x_list;
                                                                            finalResult.y_list = jsonStruct.bodyDetails.y_list;
                                                                            res.sendResponse(finalResult, 'fetching accuracy successfully.');
                                                                        }
                                                                    });
                                                            } else {
                                                                next('Invalid data');
                                                            }
                                                            var finalResult = {};
                                                        } else {
                                                            next('Invalid data');
                                                        }
                                                    }
                                                });
                                        }
                                    }
                                } else {
                                    next(result);
                                }
                            }
                        });
                    } else {
                        next('Invalid data')
                    }

                }
            });
    } catch (ex) {
        return ex;
    }
}
