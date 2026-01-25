/* eslint-disable no-console */

const http = require('http');
const mongoose = require('mongoose');

const app = require('../app');
const { connectDB } = require('../config/db.config');

const BuildYourOwnItemType = require('../models/BuildYourOwnItemType.model');
const BuildYourOwnItem = require('../models/BuildYourOwnItem.model');
const BuildYourOwnConfig = require('../models/BuildYourOwnConfig.model');

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

const assert = (condition, message) => {
	if (!condition) {
		const err = new Error(message);
		err.isAssertion = true;
		throw err;
	}
};

const main = async () => {
	await connectDB();

	const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
	const slug = `smoke-protein-${suffix}`;

	let createdType;
	let createdItem;

	try {
		// Seed minimal config so the endpoint returns non-zero
		await BuildYourOwnConfig.updateOne(
			{},
			{ $set: { minimumWeeklyOrderAmount: 50, minimumMonthlyOrderAmount: 150 } },
			{ upsert: true }
		);

		createdType = await BuildYourOwnItemType.create({
			name: `Smoke Protein (${suffix})`,
			slug,
			displayOrder: 999,
			isActive: true,
		});

		createdItem = await BuildYourOwnItem.create({
			name: `Smoke Chicken (${suffix})`,
			itemTypeId: createdType._id,
			quantityValue: 250,
			quantityUnit: 'g',
			proteinGrams: 60,
			calories: 320,
			pricing: { single: 10, weekly: 9, monthly: 8 },
			servings: { weekly: 1, monthly: 1 },
			image: {
				url: 'https://example.com/smoke.jpg',
				publicId: `smoke/${suffix}`,
				alt: 'smoke test image',
			},
			displayOrder: 999,
			isActive: true,
		});

		const server = app.listen(0);
		await new Promise((resolve) => server.once('listening', resolve));
		const address = server.address();
		const port = typeof address === 'object' && address ? address.port : null;
		assert(!!port, 'Failed to bind an ephemeral port');

		try {
			const typesRes = await requestJson({
				method: 'GET',
				port,
				path: '/api/commerce/build-your-own/item-types',
			});
			assert(typesRes.statusCode === 200, 'Expected item-types 200');
			assert(typesRes.body?.status === 'success', 'Expected item-types success');
			const types = Array.isArray(typesRes.body?.data) ? typesRes.body.data : [];
			assert(types.some((t) => t.slug === slug), 'Seeded item type not found in public item-types');

			const itemsRes = await requestJson({
				method: 'GET',
				port,
				path: '/api/commerce/build-your-own/items',
			});
			assert(itemsRes.statusCode === 200, 'Expected items 200');
			assert(itemsRes.body?.status === 'success', 'Expected items success');
			const items = Array.isArray(itemsRes.body?.data) ? itemsRes.body.data : [];
			assert(items.some((i) => i.id === String(createdItem._id)), 'Seeded item not found in public items');

			const cfgRes = await requestJson({
				method: 'GET',
				port,
				path: '/api/commerce/build-your-own/config',
			});
			assert(cfgRes.statusCode === 200, 'Expected config 200');
			assert(cfgRes.body?.data?.minimumWeeklyOrderAmount === 50, 'Expected config.minimumWeeklyOrderAmount = 50');

			const quoteRes = await requestJson({
				method: 'POST',
				port,
				path: '/api/commerce/build-your-own/quote',
				body: {
					mode: 'weekly',
					selections: [{ itemId: String(createdItem._id), quantity: 2 }],
				},
			});
			assert(quoteRes.statusCode === 200, 'Expected quote 200');
			assert(quoteRes.body?.status === 'success', 'Expected quote success');
			assert(quoteRes.body?.data?.total === 18, 'Expected quote total = 18 (weekly 9 * qty 2)');
			assert(quoteRes.body?.data?.minimumRequired === 50, 'Expected quote minimumRequired = 50');
			assert(quoteRes.body?.data?.meetsMinimum === false, 'Expected quote meetsMinimum = false');

			console.log('✅ BYO seed + public fetch smoke passed');
		} finally {
			await new Promise((resolve) => server.close(resolve));
		}
	} finally {
		if (createdItem?._id) await BuildYourOwnItem.deleteOne({ _id: createdItem._id });
		if (createdType?._id) await BuildYourOwnItemType.deleteOne({ _id: createdType._id });
		await mongoose.connection.close(false);
	}
};

main().catch(async (err) => {
	console.error('Smoke test failed:', err?.message || err);
	try {
		await mongoose.connection.close(false);
	} catch {
		// ignore
	}
	process.exitCode = 1;
});
