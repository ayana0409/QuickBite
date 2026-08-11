import { useState } from 'react';
import BootScreen from './components/BootScreen';

function App() {
  const [isSystemReady, setIsSystemReady] = useState<boolean>(false);

  // Nếu hệ thống chưa sẵn sàng (backend cold start / đang poll API Gateway), hiển thị BootScreen
  if (!isSystemReady) {
    return <BootScreen onReady={() => setIsSystemReady(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 p-8 rounded-xl border border-slate-700 shadow-2xl text-center space-y-4">
        <h1 className="text-3xl font-bold text-amber-500">QuickBite Portal</h1>
        <p className="text-slate-400">Backend API Gateway is ONLINE & BootScreen unmounted!</p>
        <div className="inline-block px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-sm font-medium">
          System Ready for Authentication
        </div>
      </div>
    </div>
  );
}

export default App;
