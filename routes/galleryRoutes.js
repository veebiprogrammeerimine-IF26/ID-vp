const express = require('express');
const router = express.Router();
const loginCheck = require('../src/checkLogin');

//kontrollin sisselogimist
router.use(loginCheck.isLogin);

//kasutatavad kontrollerid
const {
	galleryPage
	} = require('../controllers/galleryControllers');

router.route('/').get(galleryPage);

module.exports = router;