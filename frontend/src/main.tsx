import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ToastContainer, toast } from 'react-toastify';
import App from './App';
import 'react-toastify/dist/ReactToastify.css';
import './styles.css';

if (import.meta.env.PROD) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({
      onNeedRefresh() {
        toast.info('A newer EduSync version is ready. Refresh when you’re ready.');
      },
    });
  }).catch(() => {
    // PWA registration is optional; the application itself should still start.
  });
}

const root = document.getElementById('root');
if (!root) throw new Error('EduSync root element is missing.');

createRoot(root).render(
  <StrictMode>
    <App />
    <ToastContainer position="bottom-right" theme="dark" hideProgressBar />
  </StrictMode>,
);
