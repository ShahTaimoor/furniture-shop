const { query } = require('../config/postgres');

const rowToAddress = (row) => {
  if (!row) return null;
  return {
    _id: row.id,
    user: row.user_id,
    type: row.type,
    fullName: row.full_name,
    phone: row.phone,
    altPhone: row.alt_phone,
    addressLine1: row.address_line1,
    addressLine2: row.address_line2,
    city: row.city,
    state: row.state,
    postalCode: row.postal_code,
    country: row.country,
    deliveryInstructions: row.delivery_instructions,
    isDefault: row.is_default,
    landmark: row.landmark,
    coordinates:
      row.latitude !== null && row.longitude !== null ? { latitude: row.latitude, longitude: row.longitude } : undefined,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    getFullAddress: () =>
      [row.address_line1, row.address_line2, row.city, row.state, row.postal_code, row.country].filter(Boolean).join(', '),
  };
};

// @route GET /api/pg/addresses
const getAddresses = async (req, res) => {
  try {
    const { rows } = await query(
      'select * from addresses where user_id = $1 and is_active = true order by is_default desc, created_at desc',
      [req.user._id.toString()]
    );
    res.json({ success: true, addresses: rows.map(rowToAddress) });
  } catch (error) {
    console.error('pg getAddresses error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch addresses' });
  }
};

// @route GET /api/pg/addresses/:id
const getAddress = async (req, res) => {
  try {
    const { rows } = await query('select * from addresses where id = $1 and user_id = $2 and is_active = true', [
      req.params.id,
      req.user._id.toString(),
    ]);
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Address not found' });
    res.json({ success: true, address: rowToAddress(rows[0]) });
  } catch (error) {
    console.error('pg getAddress error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch address' });
  }
};

// @route POST /api/pg/addresses
const createAddress = async (req, res) => {
  try {
    const {
      type, fullName, phone, altPhone, addressLine1, addressLine2, city, state,
      postalCode, country, deliveryInstructions, landmark, coordinates, isDefault,
    } = req.body;

    if (!fullName || !phone || !addressLine1 || !city || !country) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    const userId = req.user._id.toString();

    // First address for a user is automatically default (mirrors the old Mongo pre-save hook)
    const { rows: existingCount } = await query('select count(*) from addresses where user_id = $1', [userId]);
    const shouldBeDefault = Boolean(isDefault) || Number(existingCount[0].count) === 0;

    if (shouldBeDefault) {
      await query('update addresses set is_default = false where user_id = $1', [userId]);
    }

    const { rows } = await query(
      `insert into addresses (
         user_id, type, full_name, phone, alt_phone, address_line1, address_line2,
         city, state, postal_code, country, delivery_instructions, landmark,
         latitude, longitude, is_default
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       returning *`,
      [
        userId, type || 'home', fullName, phone, altPhone || null, addressLine1, addressLine2 || null,
        city, state || null, postalCode || null, country || 'Pakistan', deliveryInstructions || null,
        landmark || null, coordinates?.latitude ?? null, coordinates?.longitude ?? null, shouldBeDefault,
      ]
    );

    res.status(201).json({ success: true, message: 'Address created successfully', address: rowToAddress(rows[0]) });
  } catch (error) {
    console.error('pg createAddress error:', error);
    res.status(500).json({ success: false, message: 'Failed to create address' });
  }
};

// @route PUT /api/pg/addresses/:id
const updateAddress = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { rows: existingRows } = await query('select * from addresses where id = $1 and user_id = $2', [
      req.params.id,
      userId,
    ]);
    const existing = existingRows[0];
    if (!existing) return res.status(404).json({ success: false, message: 'Address not found' });

    const fieldMap = {
      type: 'type', fullName: 'full_name', phone: 'phone', altPhone: 'alt_phone',
      addressLine1: 'address_line1', addressLine2: 'address_line2', city: 'city',
      state: 'state', postalCode: 'postal_code', country: 'country',
      deliveryInstructions: 'delivery_instructions', landmark: 'landmark',
    };

    const setClauses = [];
    const params = [];
    let idx = 1;

    Object.entries(fieldMap).forEach(([bodyKey, column]) => {
      if (req.body[bodyKey] !== undefined) {
        setClauses.push(`${column} = $${idx}`);
        params.push(req.body[bodyKey]);
        idx += 1;
      }
    });

    if (req.body.coordinates !== undefined) {
      setClauses.push(`latitude = $${idx}`);
      params.push(req.body.coordinates?.latitude ?? null);
      idx += 1;
      setClauses.push(`longitude = $${idx}`);
      params.push(req.body.coordinates?.longitude ?? null);
      idx += 1;
    }

    if (req.body.isDefault !== undefined) {
      if (req.body.isDefault) {
        await query('update addresses set is_default = false where user_id = $1', [userId]);
      }
      setClauses.push(`is_default = $${idx}`);
      params.push(Boolean(req.body.isDefault));
      idx += 1;
    }

    if (setClauses.length === 0) {
      return res.json({ success: true, message: 'Address updated successfully', address: rowToAddress(existing) });
    }

    params.push(req.params.id);
    const { rows } = await query(`update addresses set ${setClauses.join(', ')} where id = $${idx} returning *`, params);

    res.json({ success: true, message: 'Address updated successfully', address: rowToAddress(rows[0]) });
  } catch (error) {
    console.error('pg updateAddress error:', error);
    res.status(500).json({ success: false, message: 'Failed to update address' });
  }
};

// @route DELETE /api/pg/addresses/:id (soft delete)
const deleteAddress = async (req, res) => {
  try {
    const { rows } = await query(
      'update addresses set is_active = false where id = $1 and user_id = $2 returning *',
      [req.params.id, req.user._id.toString()]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Address not found' });
    res.json({ success: true, message: 'Address deleted successfully' });
  } catch (error) {
    console.error('pg deleteAddress error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete address' });
  }
};

// @route PATCH /api/pg/addresses/:id/set-default
const setDefaultAddress = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { rows: existingRows } = await query(
      'select * from addresses where id = $1 and user_id = $2 and is_active = true',
      [req.params.id, userId]
    );
    if (!existingRows[0]) return res.status(404).json({ success: false, message: 'Address not found' });

    await query('update addresses set is_default = false where user_id = $1', [userId]);
    const { rows } = await query('update addresses set is_default = true where id = $1 returning *', [req.params.id]);

    res.json({ success: true, message: 'Default address updated successfully', address: rowToAddress(rows[0]) });
  } catch (error) {
    console.error('pg setDefaultAddress error:', error);
    res.status(500).json({ success: false, message: 'Failed to set default address' });
  }
};

module.exports = {
  getAddresses,
  getAddress,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  rowToAddress,
};
