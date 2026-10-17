import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  }),
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          banner:
            'if(typeof MessageChannel==="undefined"){class P{postMessage(){}close(){}}globalThis.MessageChannel=class MessageChannel{constructor(){this.port1=new P();this.port2=new P();}};};',
        },
      },
    },
  },
});
