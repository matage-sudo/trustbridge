/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; frame-src 'self' blob:; object-src 'self' blob:; img-src 'self' blob: data:; font-src 'self'; connect-src 'self' http://127.0.0.1:4000 http://localhost:4000 https://*.supabase.co wss://*.supabase.co;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;