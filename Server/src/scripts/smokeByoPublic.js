/* eslint-disable no-console */

const http = require('http');
const mongoose = require('mongoose');

const app = require('../app');
const { connectDB } = require('../config/db.config');

const requestJson = ({ method, port, path, body }) =>
	new Promise((resolve, reject) => {
		const payload = body ? JSON.stringify(body) : '';

		const req = http.request(
			{
				host: '127.0.0.1',
				port,
				path,
				method,
				headers: {
					Accept: 'application/json',
					'Content-Type': 'application/json',
					...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
				},
			},
			(res) => {
				let raw = '';
				res.setEncoding('utf8');
				res.on('data', (chunk) => {
					raw += chunk;
				});
				res.on('end', () => {
					let parsed = raw;
					try {
						parsed = raw ? JSON.parse(raw) : null;
					} catch {
						// leave as raw string
					}
					resolve({ statusCode: res.statusCode, body: parsed });
				});
			},
		);

		req.on('error', reject);

		if (payload) req.write(payload);
		req.end();
	});

const main = async () => {
	await connectDB();

	const server = app.listen(0);
	await new Promise((resolve) => server.once('listening', resolve));
	const address = server.address();
	const port = typeof address === 'object' && address ? address.port : null;
	if (!port) throw new Error('Failed to bind an ephemeral port');

	const calls = [
		{ method: 'GET', path: '/api/commerce/build-your-own/item-types' },
		{ method: 'GET', path: '/api/commerce/build-your-own/items' },
		{ method: 'GET', path: '/api/commerce/build-your-own/config' },
		{ method: 'POST', path: '/api/commerce/build-your-own/quote', body: { mode: 'weekly', selections: [] } },
		// Should remain protected (expect 401)
		{ method: 'POST', path: '/api/commerce/build-your-own/purchases', body: { mode: 'single', selections: [] } },
	];

	for (const c of calls) {
		const result = await requestJson({ method: c.method, port, path: c.path, body: c.body });
		console.log(`${c.method} ${c.path} -> ${result.statusCode}`);
		console.log(JSON.stringify(result.body, null, 2));
		console.log('---');
	}

	await new Promise((resolve) => server.close(resolve));
	await mongoose.connection.close(false);
};

main().catch(async (err) => {
	console.error('Smoke test failed:', err);
	try {
		await mongoose.connection.close(false);
	} catch {
		// ignore
	}
	process.exitCode = 1;
});
