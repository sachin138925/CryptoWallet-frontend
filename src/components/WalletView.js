// src/components/WalletView.js

import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import { toast } from 'react-hot-toast';
import { isAddress } from 'ethers';
import Card from './Card';
import QrModal from './QrModal';

// Header and Sidebar components remain the same...

const Header = ({ onLock }) => (
    <header className="app-header">
        <h1 className="title-small">🦊 CryptoNest</h1>
        <button className="btn btn-secondary" onClick={onLock}>Lock Wallet</button>
    </header>
);

const Sidebar = ({ walletData, balance, usdtBalance, usdcBalance, onRefresh }) => {
    const [qrOpen, setQrOpen] = useState(false);
    return (
        <>
            {qrOpen && <QrModal address={walletData.address} onClose={() => setQrOpen(false)} />}
            <div className="wallet-sidebar">
                <Card title={`Wallet: ${walletData.name}`}>
                    <div className="address-bar">
                        <span>{`${walletData.address.slice(0, 6)}...${walletData.address.slice(-4)}`}</span>
                        <button onClick={() => setQrOpen(true)} title="Show QR Code">📷</button>
                        <button onClick={() => navigator.clipboard.writeText(walletData.address).then(() => toast.success('Address copied!'))} title="Copy Address">📋</button>
                    </div>
                </Card>
                <Card title="Balances">
                    <p className="balance-row"><strong>BNB:</strong> <span>{balance ? parseFloat(balance).toFixed(5) : "…"}</span></p>
                    <p className="balance-row"><strong>USDT:</strong> <span>{usdtBalance ? parseFloat(usdtBalance).toFixed(2) : "…"}</span></p>
                    <p className="balance-row"><strong>USDC:</strong> <span>{usdcBalance ? parseFloat(usdcBalance).toFixed(2) : "…"}</span></p>
                    <button className="btn btn-secondary" style={{width: '100%', marginTop: '10px'}} onClick={() => onRefresh(walletData.address)}>Refresh</button>
                </Card>
            </div>
        </>
    );
};


// Main Component
const WalletView = ({ walletHook }) => {
    const [activeTab, setActiveTab] = useState('send');
    const { walletData, handleFetchHistory, handleFetchContacts } = walletHook;
    
    useEffect(() => {
        if (walletData) {
            if (activeTab === "history") handleFetchHistory();
            if (activeTab === "contacts") handleFetchContacts();
        }
    }, [activeTab, walletData, handleFetchHistory, handleFetchContacts]);

    return (
        <div className="app-logged-in">
            <Header onLock={walletHook.lockWallet} />
            <main className="app-main">
                <Sidebar {...walletHook} onRefresh={walletHook.fetchAllBalances} />
                 <div className="wallet-main">
                    <div className="main-tabs">
                        <button className={clsx('tab-btn', {active: activeTab === 'send'})} onClick={() => setActiveTab('send')}>🚀 Send</button>
                        <button className={clsx('tab-btn', {active: activeTab === 'history'})} onClick={() => setActiveTab('history')}>📜 History</button>
                        <button className={clsx('tab-btn', {active: activeTab === 'contacts'})} onClick={() => setActiveTab('contacts')}>👥 Contacts</button>
                        <button className={clsx('tab-btn', {active: activeTab === 'security'})} onClick={() => setActiveTab('security')}>🔐 Security</button>
                    </div>
                    <div className="tab-content">
                        {/* THE FIX IS HERE: Pass a function to change the tab on success */}
                        {activeTab === 'send' && <SendTab {...walletHook} onSendSuccess={() => setActiveTab('history')} />}
                        {activeTab === 'history' && <HistoryTab {...walletHook} />}
                        {activeTab === 'contacts' && <ContactsTab {...walletHook} />}
                        {activeTab === 'security' && <SecurityTab {...walletHook} />}
                    </div>
                </div>
            </main>
        </div>
    );
};


// --- Tab Sub-components ---

// THE FIX IS HERE: The SendTab now accepts and uses the onSendSuccess prop
const SendTab = ({ handleSend, loading, contacts, handleFetchContacts, onSendSuccess }) => {
    const [recipient, setRecipient] = useState("");
    const [amount, setAmount] = useState("");
    const [sendToken, setSendToken] = useState("BNB");
    const [isContactModalOpen, setContactModalOpen] = useState(false);

    const handleSendClick = async () => {
        // The handleSend function from the hook returns `true` if the tx was submitted
        const success = await handleSend(recipient, amount, sendToken);
        if (success) { 
            // If successful, clear the form...
            setRecipient(''); 
            setAmount('');
            // ...and call the function passed from the parent to change the tab!
            onSendSuccess();
        }
    };

    return (
        <Card>
            {isContactModalOpen && (
                 <div className="modal-backdrop" onClick={() => setContactModalOpen(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h4>Select a Contact</h4>
                        <ul className="contacts-modal-list">{contacts.length > 0 ? contacts.map(c => (<li key={c._id} onClick={() => { setRecipient(c.contactAddress); setContactModalOpen(false); }}><strong>{c.contactName}</strong><span>{c.contactAddress}</span></li>)) : <p>No contacts found.</p>}</ul>
                        <button className="btn btn-secondary" onClick={() => setContactModalOpen(false)}>Close</button>
                    </div>
                </div>
            )}
            <div className="input-group">
                <label>Recipient Address</label>
                <div className="address-input-wrapper">
                    <input placeholder="0x..." value={recipient} onChange={(e) => setRecipient(e.target.value)} />
                    <button className="btn-address-book" onClick={() => { if(contacts.length === 0) handleFetchContacts(); setContactModalOpen(true); }}>👥</button>
                </div>
            </div>
            <div className="input-group-row">
                <div className="input-group"><label>Amount</label><input placeholder="0.0" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
                <div className="input-group"><label>Token</label><select value={sendToken} onChange={(e) => setSendToken(e.target.value)}><option value="BNB">BNB</option><option value="USDT">USDT</option><option value="USDC">USDC</option></select></div>
            </div>
            <button className="btn btn-primary" onClick={handleSendClick} disabled={loading}>{loading ? "Processing..." : `Send ${sendToken}`}</button>
        </Card>
    );
};


// The rest of the components (HistoryTab, ContactsTab, SecurityTab) remain unchanged.

const HistoryTab = ({ displayedHistory, walletData, handleCancel, loading }) => (
    <Card>
        {displayedHistory.length > 0 ? (
            <ul className="history-list">{displayedHistory.map(tx => {
                const isSent = tx.from.toLowerCase() === walletData.address.toLowerCase();
                const txDate = new Date(tx.timestamp);
                const isPending = tx.status === 'Pending';
                return (<li key={tx.hash} className={clsx({ 'tx-status-pending': isPending })}>
                    <div className="tx-icon-and-details">
                        <div className={clsx('tx-direction', { sent: isSent, received: !isSent })}>{isSent ? '↗' : '↙'}</div>
                        <div className="tx-details"><p><strong>{isSent ? `Send ${tx.tokenName}` : `Receive ${tx.tokenName}`}</strong></p>{isPending ? <p className="status-text pending">Pending</p> : <p className="tx-sub-details">{`${txDate.toLocaleDateString()} at ${txDate.toLocaleTimeString()}`}</p>}</div>
                    </div>
                    <div className="tx-amount-and-actions">
                        <p className="tx-amount">{`${isSent ? '-' : '+'} ${parseFloat(tx.amount).toFixed(4)} ${tx.tokenName}`}</p>
                        {isPending ? <button className="btn-cancel" onClick={() => handleCancel(tx)} disabled={loading}>Cancel</button> : <a href={`https://testnet.bscscan.com/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer" className="tx-link">View</a>}
                    </div>
                </li>);
            })}</ul>
        ) : <p>No transactions found.</p>}
    </Card>
);

const ContactsTab = ({ contacts, handleAddContact, handleDeleteContact }) => {
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const handleAddClick = async () => {
        if (!name.trim() || !isAddress(address)) return toast.error("Please enter a valid name and address.");
        const success = await handleAddContact(name, address);
        if (success) { setName(''); setAddress(''); }
    };
    return (
        <Card title="Address Book">
            <div className="add-contact-form"><h4>Add New Contact</h4><input placeholder="Contact Name" value={name} onChange={e => setName(e.target.value)} /><input placeholder="Contact Address (0x...)" value={address} onChange={e => setAddress(e.target.value)} style={{marginTop: '1rem'}} /><button className="btn btn-secondary" onClick={handleAddClick} style={{marginTop: '1.5rem'}}>Save Contact</button></div>
            <div className="contacts-list"><h4>Saved Contacts</h4>{contacts.length > 0 ? (<ul>{contacts.map(c => (<li key={c._id}><div className="contact-info"><strong>{c.contactName}</strong><span>{c.contactAddress}</span></div><button className="btn-delete" onClick={() => handleDeleteContact(c._id)}>🗑️</button></li>))}</ul>) : <p>You have no saved contacts.</p>}</div>
        </Card>
    );
};

const SecurityTab = ({ walletData, password }) => {
    const [revealInput, setRevealInput] = useState("");
    const [showSensitive, setShowSensitive] = useState(false);
    return (
        <Card title="Reveal Private key & Mnemonic">
            <p className="warning-text">Only do this if you know what you are doing. Never share these with anyone.</p>
            <div className="input-group"><label>Enter Your Wallet Password</label><input type="password" placeholder="********" value={revealInput} onChange={(e) => setRevealInput(e.target.value)} /></div>
            <button className="btn btn-danger" onClick={() => { if(revealInput === password) setShowSensitive(p => !p); else toast.error("Incorrect password!") }}>{showSensitive ? "Hide Secrets" : "Reveal Secrets"}</button>
            {showSensitive && (<div className="secrets-box">
                <div className="input-group"><label>Private Key</label><textarea readOnly value={walletData.privateKey} rows={2} /></div>
                <div className="input-group"><label>Mnemonic Phrase</label><textarea readOnly value={walletData.mnemonic} rows={3} /></div>
            </div>)}
        </Card>
    );
};

export default WalletView;