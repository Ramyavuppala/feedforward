const Food = require('../models/Food');

function parseLegacyQuantity(quantity) {
  if (typeof quantity !== 'string') return null;
  const trimmed = quantity.trim();
  const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*(.+)$/);
  if (!match) return null;
  const totalQuantity = Number(match[1]);
  const unit = (match[2] || '').trim();
  if (!Number.isFinite(totalQuantity) || totalQuantity <= 0) return null;
  if (!unit) return null;
  return { totalQuantity, unit };
}

async function addFood(req, res) {
  try {
    const {
      foodName,
      quantity,
      totalQuantity: rawTotalQuantity,
      unit: rawUnit,
      expiryTime,
      location,
      lat,
      lng,
      description,
    } = req.body;

    let totalQuantity;
    let unit;
    if (rawTotalQuantity !== undefined || rawUnit !== undefined) {
      totalQuantity = Number(rawTotalQuantity);
      unit = typeof rawUnit === 'string' ? rawUnit.trim() : '';
      if (!Number.isFinite(totalQuantity) || totalQuantity <= 0) {
        return res.status(400).json({ message: 'totalQuantity must be a positive number' });
      }
      if (!unit) return res.status(400).json({ message: 'unit is required' });
    } else {
      const parsed = parseLegacyQuantity(quantity);
      if (!parsed) {
        return res.status(400).json({ message: 'Provide totalQuantity + unit (or quantity like "5 kg")' });
      }
      totalQuantity = parsed.totalQuantity;
      unit = parsed.unit;
    }

    const food = await Food.create({
      foodName,
      quantity: quantity || `${totalQuantity} ${unit}`.trim(),
      totalQuantity,
      remainingQuantity: totalQuantity,
      unit,
      expiryTime,
      location,
      lat,
      lng,
      description,
      providerId: req.user._id,
    });

    await food.populate('providerId', 'name email');
    req.io.emit('foodAdded', food);
    req.io.emit('quantityUpdated', {
      foodId: food._id,
      totalQuantity: food.totalQuantity,
      remainingQuantity: food.remainingQuantity,
      unit: food.unit,
      status: food.status,
    });

    res.status(201).json(food);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function getAllFood(req, res) {
  try {
    const foods = await Food.find({ status: 'available', remainingQuantity: { $gt: 0 } })
      .populate('providerId', 'name email')
      .sort('-createdAt');
    res.json(foods);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function getProviderFood(req, res) {
  try {
    const foods = await Food.find({ providerId: req.user._id }).sort('-createdAt');
    res.json(foods);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function updateFoodStatus(req, res) {
  try {
    const food = await Food.findOne({ _id: req.params.id, providerId: req.user._id });
    if (!food) return res.status(404).json({ message: 'Food not found' });
    food.status = req.body.status || food.status;
    await food.save();
    req.io.emit('foodUpdated', food);
    req.io.emit('quantityUpdated', {
      foodId: food._id,
      totalQuantity: food.totalQuantity,
      remainingQuantity: food.remainingQuantity,
      unit: food.unit,
      status: food.status,
    });
    res.json(food);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function deleteFood(req, res) {
  try {
    const food = await Food.findOneAndDelete({ _id: req.params.id, providerId: req.user._id });
    if (!food) return res.status(404).json({ message: 'Food not found' });
    req.io.emit('foodDeleted', { _id: req.params.id });
    res.json({ message: 'Food deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = { addFood, getAllFood, getProviderFood, updateFoodStatus, deleteFood };

