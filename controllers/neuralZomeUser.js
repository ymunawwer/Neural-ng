var request = require('request');
var multer = require('multer');
var fs = require('fs');
const config = require('config');
const ai_url = config.get('ai_URL');
const neuralZomeUserModel = require(MODELS + 'neuralZomeUser');
var user_details;
var NeuralZoneData = {};

const storage = multer.diskStorage({
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + '.' + file.originalname.split('.').pop());
    }
});
const upload = multer({ storage: storage }).single('file');

exports.getDetailsForStep2 = function (req, res, next) {
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
                            if ((body[0].premium) || (body[0].total_model_count < 3) || (body[0].total_api_hit_count < 200)) {
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

exports.getUserData = function (req, res) {
    try {
        neuralZomeUserModel.find({ email: req.params.email }, (err, data) => {
            if (err) {
                console.log(err);
            } else {
                console.log(data);
                return res.sendResponse({
                    data
                }, "User data fetched successfully");
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
                            model: [{
                                model_id: result.modelId,
                                data_types: JSON.stringify(result.datatypes),
                                filepath: result.filePath,
                                steps: parseInt(NeuralZoneData.user_details.steps),
                                file_extension: result.fileExtension
                            }]
                        };
                        new neuralZomeUserModel(obj).save(function (err, data) {
                            if (err) {
                                console.log(err);
                            } else {
                                res.sendResponse(result, 'User created successfully.');
                            }
                        });
                    } else {
                        data.model.push({
                            model_id: result.modelId,
                            data_types: JSON.stringify(result.datatypes),
                            filepath: result.filePath,
                            steps: parseInt(NeuralZoneData.user_details.steps),
                            file_extension: result.fileExtension
                        })
                        obj = {
                            model: data.model

                        };
                        neuralZomeUserModel.findOneAndUpdate({
                            email: result.email
                        }, {
                                'model': data.model

                            }, { multi: true }, function (err, record) {
                                if (err) {
                                    next('Network Error');
                                } else {
                                    res.sendResponse(result, 'User updated successfully.');
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