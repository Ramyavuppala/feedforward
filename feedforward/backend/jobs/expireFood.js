const Food = require('../models/Food');
const Notification = require('../models/Notification');

const autoExpireFood = async (io) => {
  try {
    const expiredFoods = await Food.find({
      expiryTime: { $lt: new Date() },
      status: { $in: ['available', 'requested'] },
    });

    for (const food of expiredFoods) {
      food.status = 'expired';
      await food.save();

      await Notification.create({
        userId: food.providerId,
        message: `"${food.foodName}" has expired and been removed from listings.`,
        type: 'expired',
        refId: food._id,
      });

      if (io) {
        io.to(food.providerId.toString()).emit('foodExpired', { foodId: food._id });
      }
    }

    if (expiredFoods.length > 0) {
      console.log(`Auto-expired ${expiredFoods.length} food item(s)`);
    }
  } catch (err) {
    console.error('Auto-expire error:', err);
  }
};

module.exports = { autoExpireFood };
