/**
 * Kollus Node.js 샘플 앱 — Express 앱 설정 및 라우터 마운트
 */
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const indexRouter = require('./routes/index');
const jwtRouter = require('./routes/jwt');
const callbackRouter = require('./routes/callback');
const apiRouter = require('./routes/api');

const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));

// Kollus 플레이어 iframe 권한 위임 및 Private Network Access 허용
// Chrome PNA 정책: OPTIONS preflight에 Access-Control-Allow-Private-Network 응답 필요
app.use((req, res, next) => {
    res.setHeader('Permissions-Policy', 'local-network-access=*, encrypted-media=*, autoplay=*, fullscreen=*');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Access-Control-Request-Private-Network');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/jwt', jwtRouter);
app.use('/callback', callbackRouter);
app.use('/api', apiRouter);

// 404 처리
app.use(function (req, res, next) {
    next(createError(404));
});

// 에러 핸들러
app.use(function (err, req, res, next) {
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
