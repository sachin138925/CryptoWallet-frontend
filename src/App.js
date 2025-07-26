// src/App.js
import React from 'react';
import { Toaster } from 'react-hot-toast';
import { useWallet } from './hooks/useWallet';
import LoginView from './components/LoginView';
import WalletView from './components/WalletView';
import './App.css';

function App() {
  const walletHook = useWallet();

  return (
    <>
      <Toaster position="top-center" toastOptions={{ className: 'toast-custom' }}/>
      {walletHook.walletData ? (
        <WalletView walletHook={walletHook} />
      ) : (
        <LoginView
          loading={walletHook.loading}
          onWalletCreated={walletHook.handleCreateWallet}
          onWalletLoaded={walletHook.handleLoadWallet}
        />
      )}
    </>
  );
}

export default App;
//