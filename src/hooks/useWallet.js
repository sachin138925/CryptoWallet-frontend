// src/hooks/useWallet.js

import { useState, useEffect, useCallback, useMemo } from "react";
import { Wallet, isAddress, parseEther, formatEther, JsonRpcProvider, Contract, formatUnits, parseUnits } from "ethers";
import { toast } from "react-hot-toast";
import * as walletService from '../api/walletService';

// Configuration
const RPC_URL = "https://bsc-testnet-dataseed.bnbchain.org";
const USDT_CONTRACT_ADDRESS = "0x787A697324dbA4AB965C58CD33c13ff5eeA6295F";
const USDC_CONTRACT_ADDRESS = "0x342e3aA1248AB77E319e3331C6fD3f1F2d4B36B1";
const ERC20_ABI = ["function balanceOf(address owner) view returns (uint256)", "function transfer(address to, uint256 amount) returns (bool)", "function decimals() view returns (uint8)", "event Transfer(address indexed from, address indexed to, uint256 value)"];

export const useWallet = () => {
    const [loading, setLoading] = useState(false);
    const [walletData, setWalletData] = useState(null);
    const [password, setPassword] = useState('');
    const [balance, setBalance] = useState(null);
    const [usdtBalance, setUsdtBalance] = useState(null);
    const [usdcBalance, setUsdcBalance] = useState(null);
    const [history, setHistory] = useState([]);
    const [pendingTxs, setPendingTxs] = useState([]);
    const [contacts, setContacts] = useState([]);

    const provider = useMemo(() => new JsonRpcProvider(RPC_URL), []);

    const displayedHistory = useMemo(() => {
        const pendingWithStatus = pendingTxs.map(tx => ({ ...tx, status: 'Pending' }));
        const confirmedFiltered = history.filter(
            confirmedTx => !pendingTxs.some(pendingTx => pendingTx.hash === confirmedTx.hash)
        );
        return [...pendingWithStatus, ...confirmedFiltered].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }, [pendingTxs, history]);

    const fetchAllBalances = useCallback(async (address) => {
        try {
            const bnbBal = await provider.getBalance(address);
            setBalance(formatEther(bnbBal));
            const usdt = new Contract(USDT_CONTRACT_ADDRESS, ERC20_ABI, provider);
            setUsdtBalance(formatUnits(await usdt.balanceOf(address), await usdt.decimals()));
            const usdc = new Contract(USDC_CONTRACT_ADDRESS, ERC20_ABI, provider);
            setUsdcBalance(formatUnits(await usdc.balanceOf(address), await usdc.decimals()));
        } catch (e) { toast.error("Failed to fetch balances."); }
    }, [provider]);

    const handleCreateWallet = async (walletName, newPassword) => {
        setLoading(true);
        try {
            const wallet = Wallet.createRandom();
            const payload = { name: walletName, address: wallet.address, privateKey: wallet.privateKey, mnemonic: wallet.mnemonic.phrase, password: newPassword };
            await walletService.createWallet(payload);
            toast.success("Wallet created & saved!");
            return true;
        } catch (e) {
            toast.error(e.message || "Save failed");
            return false;
        } finally { setLoading(false); }
    };

    const handleLoadWallet = async (walletName, newPassword) => {
        setLoading(true);
        try {
            const data = await walletService.loadWallet(walletName, newPassword);
            toast.success(`Wallet "${data.name}" loaded!`);
            setWalletData(data);
            setPassword(newPassword);
            fetchAllBalances(data.address);
        } catch (e) { toast.error(e.message || "Failed to load wallet"); }
        finally { setLoading(false); }
    };

    const lockWallet = () => {
        setWalletData(null);
        setPassword('');
        setHistory([]);
        setPendingTxs([]);
        setContacts([]);
    };

    const handleSend = async (recipient, amount, sendToken) => {
        setLoading(true);
        const toastId = toast.loading('Submitting transaction...');
        try {
            const wallet = new Wallet(walletData.privateKey, provider);
            const nonce = await provider.getTransactionCount(wallet.address, "pending");
            let txRequest;

            if (sendToken === "BNB") {
                txRequest = { to: recipient, value: parseEther(amount), nonce };
            } else {
                const contractAddress = sendToken === "USDT" ? USDT_CONTRACT_ADDRESS : USDC_CONTRACT_ADDRESS;
                const tokenContract = new Contract(contractAddress, ERC20_ABI, wallet);
                const decimals = await tokenContract.decimals();
                const data = tokenContract.interface.encodeFunctionData("transfer", [recipient, parseUnits(amount, decimals)]);
                txRequest = { to: contractAddress, data, nonce };
            }

            const tx = await wallet.sendTransaction(txRequest);
            const pendingTxData = {
                hash: tx.hash, from: wallet.address.toLowerCase(), to: recipient.toLowerCase(), amount,
                tokenName: sendToken, timestamp: new Date().toISOString(), nonce: tx.nonce, gasPrice: tx.gasPrice.toString(),
            };
            setPendingTxs(prev => [pendingTxData, ...prev]);
            toast.success(<span><b>Transaction Submitted!</b><br/>It is now pending.</span>, { id: toastId, duration: 6000 });

            tx.wait().then(async (receipt) => {
                toast.success(<span><b>Transaction Confirmed!</b><br/><a href={`https://testnet.bscscan.com/tx/${receipt.hash}`} target="_blank" rel="noopener noreferrer">View on BscScan</a></span>);
                await walletService.logTransaction(receipt.hash);
                setPendingTxs(prev => prev.filter(p => p.hash !== receipt.hash));
                fetchAllBalances(wallet.address);
                handleFetchHistory();
            }).catch(err => {
                if (err.reason !== 'transaction replaced') toast.error("Transaction failed or was dropped.");
                setPendingTxs(prev => prev.filter(p => p.hash !== tx.hash));
            });
            return true;
        } catch (e) {
            toast.error(e.reason || "Failed to submit transaction", { id: toastId });
            return false;
        } finally { setLoading(false); }
    };

    const handleCancel = async (txToCancel) => {
        if (!window.confirm("Are you sure you want to cancel this transaction? This will cost a small gas fee.")) return;
        setLoading(true);
        const toastId = toast.loading('Submitting cancellation...');
        try {
            const wallet = new Wallet(walletData.privateKey, provider);
            const feeData = await provider.getFeeData();
            const originalGasPrice = BigInt(txToCancel.gasPrice);
            const requiredGasPrice = originalGasPrice + (originalGasPrice / 10n); // 10% more
            const newGasPrice = (feeData.gasPrice > requiredGasPrice ? feeData.gasPrice : requiredGasPrice) + BigInt(parseUnits('1', 'gwei'));
            const cancelTx = await wallet.sendTransaction({ to: wallet.address, value: 0, nonce: txToCancel.nonce, gasPrice: newGasPrice });
            toast.success(<span><b>Cancellation submitted!</b><br/>Waiting for confirmation...</span>, { id: toastId });
            await cancelTx.wait();
            toast.success("Original transaction successfully cancelled!");
            setPendingTxs(prev => prev.filter(p => p.nonce !== txToCancel.nonce));
            fetchAllBalances(wallet.address);
        } catch (error) { toast.error(error.reason || "Cancellation failed.", { id: toastId }); }
        finally { setLoading(false); }
    };

    const handleFetchHistory = useCallback(async () => {
        if (!walletData) return;
        try {
            const data = await walletService.fetchHistory(walletData.address);
            setHistory(data);
        } catch (e) { toast.error(e.message || "Could not load history"); }
    }, [walletData]);

    const handleFetchContacts = useCallback(async () => {
        if (!walletData) return;
        try {
            const data = await walletService.fetchContacts(walletData.address);
            setContacts(data);
        } catch (e) { toast.error(e.message || "Could not load contacts."); }
    }, [walletData]);

    const handleAddContact = async (name, address) => {
        try {
            await walletService.addContact({ walletAddress: walletData.address, contactName: name, contactAddress: address });
            toast.success("Contact added!");
            handleFetchContacts();
            return true;
        } catch(e) { toast.error(e.message); return false; }
    };

    const handleDeleteContact = async (contactId) => {
        if (!window.confirm("Are you sure you want to delete this contact?")) return;
        try {
            await walletService.deleteContact(contactId);
            toast.success("Contact deleted.");
            handleFetchContacts();
        } catch(e) { toast.error(e.message); }
    };

    return {
        loading, walletData, password, balance, usdtBalance, usdcBalance, contacts, displayedHistory,
        handleCreateWallet, handleLoadWallet, lockWallet, handleSend, handleCancel,
        handleFetchHistory, handleFetchContacts, handleAddContact, handleDeleteContact, fetchAllBalances,
    };
};