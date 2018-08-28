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
        cb(null, file.fieldname + '-' + Date.now() + '.csv');
    }
});
const upload = multer({ storage: storage }).single('file');

exports.getDetailsForStep2 = function (req, res, next) {
    try {
        var file_details;
        upload(req, res, function (err) {
            if (err) {
                // An error occurred when uploading
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
                                sendDataToAI(NeuralZoneData, 1, body[0], next);
                            } else {
                                next('Buy premium');
                            }
                        } else {
                            sendDataToAI(NeuralZoneData, 0, {}, next);
                        }
                    }
                });
            } else {
                next('File and Email is required');
            }
            // NeuralZoneData.user_details = res.req.body;
            // neuralZomeUserModel.find({ 'email': NeuralZoneData.user_details.email }, function (err, body) {
            //     if (err) {
            //         console.log(err);
            //     } else {
            //         if(body.length > 0){

            //         } else {
            //             next('User does not exist');
            //         }
            //         if ((body[0].premium) || (body[0].total_model_count < 3) || (body[0].total_api_hit_count < 200)) {
            //             if (file_details) {
            //                 let formData = {
            //                     file: {
            //                         value: fs.createReadStream(file_details.path),
            //                         options: {
            //                             filename: file_details.filename,
            //                             contentType: 'text/csv'
            //                         }
            //                     }
            //                 };
            //                 request.post({
            //                     url: ai_url + 'uploader',
            //                     headers: {
            //                         'Content-Type': 'multipart/form-data'
            //                     },
            //                     formData: formData
            //                 }, function (error, body) {
            //                     if (error) {
            //                         console.log('error');
            //                         console.log(error);
            //                         res.send(error);
            //                     } else {
            //                         var result = JSON.parse(body.body);
            //                         var step1Result = {
            //                             'email': NeuralZoneData.user_details.email,
            //                             'model': [{
            //                                 'model_id': result.modelId[0],
            //                                 'filepath': result.filePath,
            //                                 'steps': parseInt(NeuralZoneData.user_details.steps),
            //                                 'file_extension': result.fileExtension
            //                             }],
            //                         };
            //                         new neuralZomeUserModel(step1Result).save(function (err, data) {
            //                             if (err) {
            //                                 console.log(err);
            //                             } else {
            //                                 NeuralZoneData.mongoDetails = data;
            //                                 NeuralZoneData.filePathDetails = result;
            //                                 console.log(NeuralZoneData);
            //                                 var fileDetails = { 'filePath': result.filePath, 'fileExtension': result.fileExtension };
            //                                 request.post({
            //                                     url: ai_url + 'parse_api',
            //                                     headers: {
            //                                         'Content-Type': 'application/json'
            //                                     },
            //                                     json: fileDetails
            //                                 }, function (error, body) {
            //                                     if (error) {
            //                                         console.log('error');
            //                                         console.log(error);
            //                                         res.send(error);
            //                                     } else {
            //                                         //var result = body.body;
            //                                         var result = Array.isArray(body.body) ? body.body : [body.body];
            //                                         if (result[0].status == 'true') {
            //                                             neuralZomeUserModel.update({
            //                                                 _id: NeuralZoneData.mongoDetails._id,
            //                                                 "model.model_id": result[0].modelId[0]
            //                                             }, { '$set': { 'model.$.step2_details': result } }, { multi: true }, function (err, record) {
            //                                                 if (err) {
            //                                                     console.log(err);
            //                                                 } else {
            //                                                     console.log(record);
            //                                                     NeuralZoneData.fileDetails = result;
            //                                                     console.log(NeuralZoneData);
            //                                                     return res.sendResponse({

            //                                                     }, "NeuralZome user created successfully");
            //                                                 }
            //                                             });
            //                                         }
            //                                     }
            //                                 });
            //                             }
            //                         });
            //                     }
            //                 });
            //             } else {
            //                 next('file is required');  
            //             }
            //         } else {
            //             next('Buy premium');
            //         }

            //     }
            // });
        })
    } catch (ex) {
        return ex;
    }
}

exports.getUserData = function (req, res) {
    try {
        console.log(req.params);
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

function sendDataToAI(NeuralZoneData, num, data, next) {
    let formData = {
        file: {
            value: fs.createReadStream(NeuralZoneData.file_details.path),
            options: {
                filename: NeuralZoneData.file_details.filename,
                contentType: 'text/csv'
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
            console.log('error');
            console.log(error);
            next('Network Error');
        } else {
            var result = JSON.parse(body.body);
            var obj;
            console.log(result);
            if (result.status) {
                if (num == 0) {
                    obj = {
                        email: result.email,
                        model: [{
                            model_id: result.modelId[0],
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
                            console.log(data);
                            next(result);
                            //res.sendResponse(result, 'User created successfully.');
                        }
                    });
                } else {
                    data.model.push({
                        model_id: result.modelId[0],
                        data_types: JSON.stringify(result.datatypes),
                        filepath: result.filePath,
                        steps: parseInt(NeuralZoneData.user_details.steps),
                        file_extension: result.fileExtension
                    })
                    obj = {
                        model: data.model

                    };
                    neuralZomeUserModel.update({
                        email: result.email
                    }, {
                            '$set': {
                                'model': data.model
                            }
                        }, { multi: true }, function (err, record) {
                            if(err){
                                next('error');
                            } else {
                                next(result);
                                //next('Success');
                            }
                        });
                }
            }
            // var step1Result = {
            //     'email': NeuralZoneData.user_details.email,
            //     'model': [{
            //         'model_id': result.modelId[0],
            //         'filepath': result.filePath,
            //         'steps': parseInt(NeuralZoneData.user_details.steps),
            //         'file_extension': result.fileExtension
            //     }],
            // };
            // new neuralZomeUserModel(step1Result).save(function (err, data) {
            //     if (err) {
            //         console.log(err);
            //     } else {
            //         NeuralZoneData.mongoDetails = data;
            //         NeuralZoneData.filePathDetails = result;
            //         console.log(NeuralZoneData);
            //         var fileDetails = { 'filePath': result.filePath, 'fileExtension': result.fileExtension };
            //         request.post({
            //             url: ai_url + 'parse_api',
            //             headers: {
            //                 'Content-Type': 'application/json'
            //             },
            //             json: fileDetails
            //         }, function (error, body) {
            //             if (error) {
            //                 console.log('error');
            //                 console.log(error);
            //                 res.send(error);
            //             } else {
            //                 //var result = body.body;
            //                 var result = Array.isArray(body.body) ? body.body : [body.body];
            //                 if (result[0].status == 'true') {
            //                     neuralZomeUserModel.update({
            //                         _id: NeuralZoneData.mongoDetails._id,
            //                         "model.model_id": result[0].modelId[0]
            //                     }, { '$set': { 'model.$.step2_details': result } }, { multi: true }, function (err, record) {
            //                         if (err) {
            //                             console.log(err);
            //                         } else {
            //                             console.log(record);
            //                             NeuralZoneData.fileDetails = result;
            //                             console.log(NeuralZoneData);
            //                             return res.sendResponse({

            //                             }, "NeuralZome user created successfully");
            //                         }
            //                     });
            //                 }
            //             }
            //         });
            //     }
            // });
        }
    });
}