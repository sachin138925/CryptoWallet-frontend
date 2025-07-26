// src/components/LoginView.js
import React, { useState } from 'react';
import clsx from 'clsx';
import { toast } from 'react-hot-toast';

const LoginView = ({ onWalletCreated, onWalletLoaded, loading }) => {
    const [mode, setMode] = useState("create");
    const [walletName, setWalletName] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPw, setConfirmPw] = useState("");

    const handleSubmit = async () => {
        if (!walletName.trim() || !password.trim()) return toast.error("Please fill all fields.");
        if (mode === "create" && password !== confirmPw) return toast.error("Passwords do not match.");
        
        if (mode === 'create') {
            const success = await onWalletCreated(walletName, password);
            if (success) {
                setWalletName('');
                setPassword('');
                setConfirmPw('');
                setMode('fetch');
                toast.success("Now you can access your new wallet!");
            }
        } else {
            await onWalletLoaded(walletName, password);
        }
    };

    return (
        <div className="app-pre-login">
            <div className="login-box">
                <h1 className="title">🦊 CryptoNest</h1>
                <p className="subtitle">Your Simple & Secure BSC Wallet</p>
                <div className="pill-toggle">
                    <span className={clsx({ active: mode === "create" })} onClick={() => setMode("create")}>Create Wallet</span>
                    <span className={clsx({ active: mode === "fetch" })} onClick={() => setMode("fetch")}>Access Wallet</span>
                </div>
                <div className="input-group">
    <input name="walletName" placeholder="Wallet Name" value={walletName} onChange={(e) => setWalletName(e.target.value)} />
    <input name="password" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
    {mode === "create" && (<input name="confirmPassword" type="password" placeholder="Confirm Password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}/>)}
</div>
                <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
                    {loading ? "Loading..." : (mode === "create" ? "Create & Secure Wallet" : "Access My Wallet")}
                </button>
            </div>
        </div>
    );
};

export default LoginView;