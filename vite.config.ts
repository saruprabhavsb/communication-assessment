import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';

function suppressHmrErrorPlugin(): Plugin {
  return {
    name: 'suppress-hmr-error',
    transformIndexHtml(html: string) {
      return html.replace(
        '</head>',
        `<script>
          // Catch and handle benign WebSocket HMR rejections in preview environments
          window.addEventListener('unhandledrejection', function(event) {
            if (
              event.reason &&
              (event.reason.message === 'WebSocket closed without opened.' ||
               (typeof event.reason === 'string' && event.reason.includes('WebSocket')) ||
               (event.reason.stack && event.reason.stack.includes('WebSocket')))
            ) {
              event.preventDefault();
            }
          });
        </script></head>`
      );
    },
  };
}

export default defineConfig(() => {
  const isHmrDisabled = process.env.DISABLE_HMR === 'true';

  return {
    plugins: [
      react(),
      tailwindcss(),
      suppressHmrErrorPlugin(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      strictPort: true,
      hmr: isHmrDisabled
        ? false
        : {
            host: '0.0.0.0',
            port: 3000,
          },
      watch: isHmrDisabled ? null : {},
    },
  };
});
