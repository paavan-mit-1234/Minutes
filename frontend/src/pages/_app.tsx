import type { AppProps } from 'next/app';
import Navbar from '@/components/Navbar';
import '@/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <Component {...pageProps} />
    </div>
  );
}
