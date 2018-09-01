var request = require('request');
var multer = require('multer');
var fs = require('fs');
const config = require('config');
const ai_url = config.get('ai_URL');
const neuralZomeUserModel = require(MODELS + 'neuralZomeUser');


exports.getDetailsForStep3 = function (req, res, next) {
    try {
        var bodyDetails = req.body;
        neuralZomeUserModel.findOneAndUpdate({
            email: req.body.email,
            "model.model_id": req.body.modelId
        }, {
                'model.$.algo': req.body.algo,
                'model.$.x_list': JSON.stringify(req.body.x_list),
                'model.$.y_list': JSON.stringify(req.body.y_list),
            }, { multi: true }, function (err, record) {
                if (err) {
                    console.log(err);
                } else {
                    console.log(record);
                    request.post({
                        url: ai_url + 'preprocessing_modelling',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        json: req.body
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
    } catch (ex) {
        return ex;
    }
}

exports.getDetailsForStep4 = function (req, res, next) {
    try {
        var bodyDetails = req.body;
        request.post({
            url: ai_url + 'predict',
            headers: {
                'Content-Type': 'application/json'
            },
            json: req.body
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
                            }
                        });
                    res.sendResponse(result, 'Preprocessing successfully.');
                } else {
                    next(body.body);
                }
            }
        });
    } catch (ex) {
        return ex;
    }
}