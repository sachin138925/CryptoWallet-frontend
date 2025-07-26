const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

async function request(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_URL}${endpoint}`, options);
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'An API error occurred');
        }
        return data;
    } catch (error) {
        // Re-throw the error so it can be caught by the calling function
        throw error;
    }
}

export const createWallet = (payload) => {
    return request('/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
};

export const loadWallet = (walletName, password) => {
    return request(`/wallet/${walletName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
    });
};

export const logTransaction = (hash) => {
    return request(`/tx/${hash}`, { method: 'POST' });
};

export const fetchHistory = (address) => {
    return request(`/history/${address}`);
};

export const fetchContacts = (walletAddress) => {
    return request(`/contacts/${walletAddress}`);
};

export const addContact = (payload) => {
    return request('/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
};

export const deleteContact = (contactId) => {
    return request(`/contacts/${contactId}`, { method: 'DELETE' });
};