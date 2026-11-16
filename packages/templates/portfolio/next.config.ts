import type { NextConfig } from 'next';
const config: NextConfig = {
  reactStrictMode: true,
  agentRules: false,
  experimental: { globalNotFound: true },
};
export default config;
