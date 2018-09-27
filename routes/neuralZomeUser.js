var express = require('express');
var router = express.Router();
var neuralzomeUserController = require(CONTROLLERS + 'neuralZomeUser');
var preprocessModelingController = require(CONTROLLERS + 'preprocessModeling');


/* GET users listing. */
router.post('/getDetailsForStep2', neuralzomeUserController.getDetailsForStep2);
router.post('/getDetailsForStep3', preprocessModelingController.getDetailsForStep3);
router.post('/getDetailsForStep4', preprocessModelingController.getDetailsForStep4);
router.post('/getDetailsForPredict', neuralzomeUserController.getDetailsForPredict);
router.post('/contactus', preprocessModelingController.contactus);
router.post('/algo_select', neuralzomeUserController.getAccuracyDetails);
router.post('/evaluate', preprocessModelingController.evaluateAccuracy);


module.exports = router;
