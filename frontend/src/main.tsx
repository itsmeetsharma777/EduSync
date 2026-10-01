import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ToastContainer, toast } from 'react-toastify';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import 'react-toastify/dist/ReactToastify.css';
import './styles.css';

registerSW({
  onNeedRefresh() {
    toast.info('A newer EduSync version is ready. Refresh when you’re ready.');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <ToastContainer position="bottom-right" theme="dark" hideProgressBar />
  </StrictMode>,
);
