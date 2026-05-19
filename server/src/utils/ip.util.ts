import type { Request } from 'express';

/**
 * Safely extracts the client IP address from request headers when behind reverse proxies,
 * falling back to Express's req.ip and finally the underlying socket remote address.
 */
export const getClientIp = (req: Request): string => {
  const xForwardedFor = req.headers['x-forwarded-for'];
  const xRealIp = req.headers['x-real-ip'];
  const cfConnectingIp = req.headers['cf-connecting-ip'];
  const reqIp = req.ip;
  const socketIp = req.socket?.remoteAddress;

  let resolvedIp = 'unknown';

  if (xForwardedFor) {
    const ips = typeof xForwardedFor === 'string'
      ? xForwardedFor.split(',')
      : Array.isArray(xForwardedFor)
        ? xForwardedFor
        : [];
    const firstIp = ips[0]?.trim();
    if (firstIp) resolvedIp = firstIp;
  } else if (xRealIp && typeof xRealIp === 'string') {
    resolvedIp = xRealIp.trim();
  } else if (cfConnectingIp && typeof cfConnectingIp === 'string') {
    resolvedIp = cfConnectingIp.trim();
  } else if (reqIp) {
    resolvedIp = reqIp;
  } else if (socketIp) {
    resolvedIp = socketIp;
  }

  // Log the complete IP detection details for debugging and verification
  console.log(
    `[IP Detection] Resolved: ${resolvedIp} | ` +
    `x-forwarded-for: ${xForwardedFor || 'none'} | ` +
    `x-real-ip: ${xRealIp || 'none'} | ` +
    `cf-connecting-ip: ${cfConnectingIp || 'none'} | ` +
    `req.ip: ${reqIp || 'none'} | ` +
    `socket: ${socketIp || 'none'}`
  );

  return resolvedIp;
};
