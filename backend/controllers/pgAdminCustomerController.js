const { query } = require('../config/postgres');
const userModel = require('../models/postgres/userModel');
const orderModel = require('../models/postgres/orderModel');

const SORT_COLUMN_MAP = {
  createdAt: 'created_at',
  name: 'name',
  email: 'email',
  lastLogin: 'last_login',
};

// @route GET /api/pg/admin/customers
const getCustomers = async (req, res) => {
  try {
    const {
      page = 1, limit = 20, search, role, isActive, isBlacklisted,
      sortBy = 'createdAt', sortOrder = 'desc',
    } = req.query;

    const conditions = ['role = 0'];
    const params = [];
    let idx = 1;

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(name ilike $${idx} or email ilike $${idx} or phone ilike $${idx})`);
      idx += 1;
    }
    if (role !== undefined) {
      params.push(Number(role));
      conditions[0] = `role = $${idx}`;
      idx += 1;
    }
    if (isActive !== undefined) {
      params.push(isActive === 'true');
      conditions.push(`is_active = $${idx}`);
      idx += 1;
    }
    if (isBlacklisted !== undefined) {
      params.push(isBlacklisted === 'true');
      conditions.push(`is_blacklisted = $${idx}`);
      idx += 1;
    }

    const whereClause = conditions.join(' and ');
    const sortColumn = SORT_COLUMN_MAP[sortBy] || 'created_at';
    const sortDir = sortOrder === 'asc' ? 'asc' : 'desc';

    const countResult = await query(`select count(*) from users where ${whereClause}`, params);
    const total = Number(countResult.rows[0].count);

    const listParams = [...params, Number(limit), (Number(page) - 1) * Number(limit)];
    const { rows } = await query(
      `select * from users where ${whereClause} order by ${sortColumn} ${sortDir} limit $${listParams.length - 1} offset $${listParams.length}`,
      listParams
    );

    const [totalCount, activeCount, blacklistedCount, inactiveCount] = await Promise.all([
      query('select count(*) from users where role = 0'),
      query('select count(*) from users where role = 0 and is_active = true'),
      query('select count(*) from users where role = 0 and is_blacklisted = true'),
      query('select count(*) from users where role = 0 and is_active = false'),
    ]);

    res.json({
      success: true,
      customers: rows.map(userModel.rowToUser),
      stats: {
        total: Number(totalCount.rows[0].count),
        active: Number(activeCount.rows[0].count),
        blacklisted: Number(blacklistedCount.rows[0].count),
        inactive: Number(inactiveCount.rows[0].count),
      },
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    console.error('pg getCustomers error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch customers' });
  }
};

// @route GET /api/pg/admin/customers/stats
// NOTE: registered before /:id in routes so it doesn't get swallowed by the param route
const getCustomerStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const conditions = ['role = 0'];
    const params = [];
    let idx = 1;

    if (startDate) {
      params.push(new Date(startDate));
      conditions.push(`created_at >= $${idx}`);
      idx += 1;
    }
    if (endDate) {
      params.push(new Date(endDate));
      conditions.push(`created_at <= $${idx}`);
      idx += 1;
    }

    const whereClause = conditions.join(' and ');
    const { rows } = await query(
      `select count(*) as total,
              sum(case when is_active then 1 else 0 end) as active,
              sum(case when is_blacklisted then 1 else 0 end) as blacklisted,
              sum(case when email_verified then 1 else 0 end) as email_verified
       from users where ${whereClause}`,
      params
    );

    const todayResult = await query(
      "select count(*) from users where role = 0 and created_at >= date_trunc('day', now())"
    );

    const row = rows[0];
    res.json({
      success: true,
      stats: {
        total: Number(row.total) || 0,
        active: Number(row.active) || 0,
        blacklisted: Number(row.blacklisted) || 0,
        emailVerified: Number(row.email_verified) || 0,
        phoneVerified: 0,
      },
      newCustomersToday: Number(todayResult.rows[0].count),
    });
  } catch (error) {
    console.error('pg getCustomerStats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch customer statistics' });
  }
};

// @route GET /api/pg/admin/customers/:id
const getCustomer = async (req, res) => {
  try {
    const row = await userModel.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Customer not found' });
    const customer = userModel.rowToUser(row);

    const { rows: orderRows } = await query('select amount, status from orders where user_id = $1', [req.params.id]);
    const orderStats = {
      totalOrders: orderRows.length,
      totalSpent: orderRows.reduce((sum, o) => sum + (Number(o.amount) || 0), 0),
      completedOrders: orderRows.filter((o) => o.status === 'delivered').length,
      pendingOrders: orderRows.filter((o) => o.status === 'pending').length,
    };

    const { rows: addresses } = await query(
      'select * from addresses where user_id = $1 and is_active = true',
      [req.params.id]
    );

    res.json({ success: true, customer: { ...customer, orderStats, addresses } });
  } catch (error) {
    console.error('pg getCustomer error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch customer' });
  }
};

// @route GET /api/pg/admin/customers/:id/orders
const getCustomerOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const conditions = ['user_id = $1'];
    const params = [req.params.id];
    let idx = 2;

    if (status) {
      params.push(status);
      conditions.push(`status = $${idx}`);
      idx += 1;
    }

    const whereClause = conditions.join(' and ');
    const countResult = await query(`select count(*) from orders where ${whereClause}`, params);
    const total = Number(countResult.rows[0].count);

    const listParams = [...params, Number(limit), (Number(page) - 1) * Number(limit)];
    const { rows } = await query(
      `select * from orders where ${whereClause} order by created_at desc limit $${listParams.length - 1} offset $${listParams.length}`,
      listParams
    );

    res.json({
      success: true,
      orders: rows.map(orderModel.rowToOrder),
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    console.error('pg getCustomerOrders error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch customer orders' });
  }
};

// @route PATCH /api/pg/admin/customers/:id/status
const updateCustomerStatus = async (req, res) => {
  try {
    const { isActive, isBlacklisted } = req.body;
    const fields = {};
    if (isActive !== undefined) fields.isActive = isActive;
    if (isBlacklisted !== undefined) fields.isBlacklisted = isBlacklisted;

    const row = await userModel.updateById(req.params.id, fields);
    if (!row) return res.status(404).json({ success: false, message: 'Customer not found' });
    const customer = userModel.rowToUser(row);

    res.json({
      success: true,
      message: 'Customer status updated successfully',
      customer: { id: customer._id, name: customer.name, email: customer.email, isActive: customer.isActive, isBlacklisted: customer.isBlacklisted },
    });
  } catch (error) {
    console.error('pg updateCustomerStatus error:', error);
    res.status(500).json({ success: false, message: 'Failed to update customer status' });
  }
};

// @route POST /api/pg/admin/customers/:id/blacklist
const blacklistCustomer = async (req, res) => {
  try {
    const row = await userModel.updateById(req.params.id, { isBlacklisted: true, isActive: false });
    if (!row) return res.status(404).json({ success: false, message: 'Customer not found' });
    const customer = userModel.rowToUser(row);

    res.json({
      success: true,
      message: 'Customer blacklisted successfully',
      customer: { id: customer._id, name: customer.name, email: customer.email, isBlacklisted: customer.isBlacklisted },
    });
  } catch (error) {
    console.error('pg blacklistCustomer error:', error);
    res.status(500).json({ success: false, message: 'Failed to blacklist customer' });
  }
};

// @route POST /api/pg/admin/customers/:id/unblacklist
const unblacklistCustomer = async (req, res) => {
  try {
    const row = await userModel.updateById(req.params.id, { isBlacklisted: false, isActive: true });
    if (!row) return res.status(404).json({ success: false, message: 'Customer not found' });
    const customer = userModel.rowToUser(row);

    res.json({
      success: true,
      message: 'Customer removed from blacklist successfully',
      customer: { id: customer._id, name: customer.name, email: customer.email, isBlacklisted: customer.isBlacklisted },
    });
  } catch (error) {
    console.error('pg unblacklistCustomer error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove customer from blacklist' });
  }
};

module.exports = {
  getCustomers,
  getCustomerStats,
  getCustomer,
  getCustomerOrders,
  updateCustomerStatus,
  blacklistCustomer,
  unblacklistCustomer,
};
