import express from 'express';
const app = express();

app.use(express.json());

const PORT = 31198; // cash

app.get('/', (req, res) => {

});

import EndPoints from './constants/EndPoints.js';
EndPoints.init(app);

app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});


import TESTER from './modules/TESTER.js';
TESTER.test();