const express = require('express');
const app = express();

app.use(express.json());

app.use((req, res, next) => {
	console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
	next();
});

app.get('/', (req, res) => {
	res.send('Hello from CodeAryal - Express on port 4500');
});


// Error handler
app.use((err, req, res, next) => {
	console.error('Unhandled error:', err);
	res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
const PORT = process.env.PORT || 4500;
const server = app.listen(PORT, () => {
	console.log(`Server listening on http://localhost:${PORT}`);
});
