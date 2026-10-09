const nextConfig = {
  agentRules: false,
  turbopack: {
    root: process.cwd(),
  },
  async rewrites() {
    const apiOrigin = (process.env.TASK_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
    return [{ source: '/api/:path*', destination: `${apiOrigin}/api/:path*` }];
  },
};

export default nextConfig;
