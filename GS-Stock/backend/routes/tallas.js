const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const catalogos = require('../controllers/catalogosController');

router.get('/', auth, catalogos.getTallas);

module.exports = router;
