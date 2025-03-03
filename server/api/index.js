const express = require('express');
const router = express.Router();

// 导入各个API路由
const testRouter = require('./debug');
router.use('/debug', testRouter);

const accountsRouter = require('./accounts');
router.use('/accounts', accountsRouter);

const configRouter = require('./config');
router.use('/config', configRouter);

const registerRouter = require('./register');
router.use('/register', registerRouter);

const licenseRouter = require('./license');
router.use('/license', licenseRouter);

const usersRouter = require('./users');
router.use('/users', usersRouter);

module.exports = router; 