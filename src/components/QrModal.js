// src/components/QrModal.js
import React from "react";
import QRCode from "react-qr-code";

const QrModal = ({ address, onClose }) => (
  <div className="modal-backdrop" onClick={onClose}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <h4>Wallet Address</h4>
      <div className="qr-container">
        <QRCode value={address} size={256} />
      </div>
      <p>{address}</p>
      <button className="btn btn-secondary" onClick={onClose}>Close</button>
    </div>
  </div>
);

export default QrModal;