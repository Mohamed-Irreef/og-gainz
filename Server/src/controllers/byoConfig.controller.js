const BuildYourOwnConfig = require('../models/BuildYourOwnConfig.model');

const getSingleton = async () => {
	let doc = await BuildYourOwnConfig.findOne({}).lean();
	if (!doc) {
		doc = await BuildYourOwnConfig.create({ minimumWeeklyOrderAmount: 0, minimumMonthlyOrderAmount: 0 });
		doc = doc.toObject({ versionKey: false });
	}
	return doc;
};

const adminGetByoConfig = async (req, res, next) => {
	try {
		const doc = await getSingleton();
		return res.json({ status: 'success', data: { ...doc, id: String(doc._id) } });
	} catch (err) {
		return next(err);
	}
};

const adminUpdateByoConfig = async (req, res, next) => {
	try {
		const existing = await BuildYourOwnConfig.findOne({});
		const payload = {
			minimumWeeklyOrderAmount: req.body?.minimumWeeklyOrderAmount,
			minimumMonthlyOrderAmount: req.body?.minimumMonthlyOrderAmount,
		};

		const updated = existing
			? await BuildYourOwnConfig.findByIdAndUpdate(existing._id, payload, { new: true, runValidators: true })
			: await BuildYourOwnConfig.create(payload);

		const obj = updated.toObject({ versionKey: false });
		return res.json({ status: 'success', data: { ...obj, id: String(obj._id) } });
	} catch (err) {
		return next(err);
	}
};

module.exports = {
	adminGetByoConfig,
	adminUpdateByoConfig,
};
