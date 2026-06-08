const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const catalogos = require('../controllers/catalogosController');

router.get('/', auth, catalogos.getTiposCalzado);

module.exports = router;
