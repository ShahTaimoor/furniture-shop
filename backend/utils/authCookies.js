// Admin (ADMIN_URL) and storefront (CLIENT_URL) both authenticate against this
// same backend host. Browsers scope cookies by hostname only, not port, so a
// plain "accessToken"/"refreshToken" cookie would be shared — and clobbered —
// between the two apps whenever both are open in the same browser. Using a
// distinct cookie name for admin sessions keeps the two logins independent.
const getAuthCookieNames = (origin) => {
  const isAdmin = Boolean(process.env.ADMIN_URL) && origin === process.env.ADMIN_URL;
  return isAdmin
    ? { access: 'adminAccessToken', refresh: 'adminRefreshToken' }
    : { access: 'accessToken', refresh: 'refreshToken' };
};

module.exports = { getAuthCookieNames };
