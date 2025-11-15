const ORDER_STATUS_FLOW = [
  'pending',
  'confirmed',
  'packed',
  'shipped',
  'out_for_delivery',
  'delivered',
];

const OPTIONAL_ORDER_STATUSES = ['cancelled'];

const ORDER_STATUS_VALUES = [...ORDER_STATUS_FLOW, ...OPTIONAL_ORDER_STATUSES];

module.exports = {
  ORDER_STATUS_FLOW,
  ORDER_STATUS_VALUES,
};

