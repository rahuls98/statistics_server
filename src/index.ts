import express, {Application, Request, Response, NextFunction} from 'express';

const app:Application = express();
const endpoints = require('./endpoints');

app.use('/api', endpoints);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Server running");
})