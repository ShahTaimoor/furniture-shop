const { query } = require('../../config/postgres');

const getAll = async () => {
  const { rows } = await query('select key, value from settings');
  return rows.reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});
};

const get = async (key) => {
  const { rows } = await query('select value from settings where key = $1', [key]);
  return rows[0]?.value ?? null;
};

// Upserts each key/value pair given in `entries` ({ key: value, ... }).
const setMany = async (entries) => {
  const keys = Object.keys(entries);
  if (keys.length === 0) return getAll();

  await Promise.all(
    keys.map((key) =>
      query(
        `insert into settings (key, value)
         values ($1, $2)
         on conflict (key) do update set value = excluded.value`,
        [key, entries[key]]
      )
    )
  );

  return getAll();
};

module.exports = { getAll, get, setMany };
