var express = require('express');
var router = express.Router();
var neuralzomeUserController = require(CONTROLLERS + 'neuralZomeUser');
var preprocessModelingController = require(CONTROLLERS + 'preprocessModeling');


/* GET users listing. */
router.post('/uploadFile', neuralzomeUserController.uploadFile);
router.post('/preprocessing_modelling', preprocessModelingController.preprocessing_modelling);
router.post('/getPredictResult', preprocessModelingController.getPredictResult);
router.post('/getDetailsForPredict', neuralzomeUserController.getDetailsForPredict);
router.post('/contactus', preprocessModelingController.contactus);
router.post('/algo_select', neuralzomeUserController.getAccuracyDetails);
router.post('/evaluate', preprocessModelingController.evaluateAccuracy);


module.exports = router;
