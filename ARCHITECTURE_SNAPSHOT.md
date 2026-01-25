1️⃣ CLIENT ARCHITECTURE



2️⃣ SERVER ARCHITECTURE

Server/
├── node_modules/
├── src/
│   ├── cache/
│   │   ├── cacheGet.js
│   │   ├── cacheSet.js
│   │   └── redisKeys.js
│   ├── config/
│   │   ├── constants.config.js
│   │   ├── db.config.js
│   │   ├── env.config.js
│   │   ├── googleOAuth.config.js
│   │   └── redis.config.js
│   ├── controllers/
│   │   ├── addon.controller.js
│   │   ├── admin.controller.js
│   │   ├── auth.controller.js
│   │   ├── cart.controller.js
│   │   ├── checkout.controller.js
│   │   ├── consultation.controller.js
│   │   ├── delivery.controller.js
│   │   ├── location.controller.js
│   │   ├── meal.controller.js
│   │   ├── notification.controller.js
│   │   ├── report.controller.js
│   │   ├── subscription.controller.js
│   │   ├── user.controller.js
│   │   └── wallet.controller.js
│   ├── docs/
│   │   ├── api-contracts.md
│   │   ├── architecture.md
│   │   ├── db-schema.md
│   │   └── redis-strategy.md
│   ├── jobs/
│   │   ├── deliveryScheduler.job.js
│   │   ├── email.job.js
│   │   ├── export.job.js
│   │   └── subscriptionExpiry.job.js
│   ├── middlewares/
│   │   ├── admin.middleware.js
│   │   ├── auth.middleware.js
│   │   ├── error.middleware.js
│   │   ├── rateLimit.middleware.js
│   │   └── validate.middleware.js
│   ├── models/
│   │   ├── Addon.model.js
│   │   ├── AdminActionLog.model.js
│   │   ├── AdminLog.model.js
│   │   ├── AuditLog.model.js
│   │   ├── Cart.model.js
│   │   ├── Consultation.model.js
│   │   ├── CustomMealComponent.model.js
│   │   ├── Delivery.model.js
│   │   ├── DeliveryStatusLog.model.js
│   │   ├── EmailTemplate.model.js
│   │   ├── MealPack.model.js
│   │   ├── Notification.model.js
│   │   ├── NotificationLog.model.js
│   │   ├── Order.model.js
│   │   ├── PauseSkipLog.model.js
│   │   ├── Payment.model.js
│   │   ├── Subscription.model.js
│   │   ├── SubscriptionServing.model.js
│   │   ├── User.model.js
│   │   ├── UserAddress.model.js
│   │   ├── UserProfile.model.js
│   │   ├── Wallet.model.js
│   │   └── WalletTransaction.model.js
│   ├── routes/
│   │   ├── addon.routes.js
│   │   ├── admin.routes.js
│   │   ├── auth.routes.js
│   │   ├── cart.routes.js
│   │   ├── checkout.routes.js
│   │   ├── consultation.routes.js
│   │   ├── delivery.routes.js
│   │   ├── index.routes.js
│   │   ├── location.routes.js
│   │   ├── meal.routes.js
│   │   ├── notification.routes.js
│   │   ├── report.routes.js
│   │   ├── subscription.routes.js
│   │   ├── user.routes.js
│   │   └── wallet.routes.js
│   ├── services/
│   │   ├── admin.service.js
│   │   ├── auth.service.js
│   │   ├── delivery.service.js
│   │   ├── location.service.js
│   │   ├── notification.service.js
│   │   ├── payment.service.js
│   │   ├── pricing.service.js
│   │   ├── report.service.js
│   │   ├── subscription.service.js
│   │   └── wallet.service.js
│   ├── tests/
│   │   ├── integration/
│   │   │   └── .gitkeep
│   │   ├── load/
│   │   │   └── .gitkeep
│   │   ├── unit/
│   │   │   └── .gitkeep
│   │   └── .gitkeep
│   ├── utils/
│   │   ├── apiResponse.js
│   │   ├── constants.js
│   │   ├── date.util.js
│   │   ├── distance.util.js
│   │   ├── jwt.util.js
│   │   ├── logger.util.js
│   │   ├── validation.util.js
│   │   └── validators.js
│   ├── app.js
│   └── server.js
├── .gitignore
├── package.json
└── package-lock.json

