import React from 'react';
import ShareForm from './ShareForm';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Yeni Paylaşım</h2>
        <ShareForm onShareComplete={onClose} />
        <button
          onClick={onClose}
          className="mt-4 bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
        >
          Kapat
        </button>
      </div>
    </div>
  );
};

export default ShareModal;