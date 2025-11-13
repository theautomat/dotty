import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';

interface TransactionSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  signature: string;
  coordinates: { x: number; y: number };
  searchId?: string;
}

export const TransactionSuccessModal: React.FC<TransactionSuccessModalProps> = ({
  isOpen,
  onClose,
  signature,
  coordinates,
  searchId,
}) => {
  const explorerUrl = `https://solscan.io/tx/${signature}?cluster=devnet`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Search Transaction Successful!
          </DialogTitle>
          <DialogDescription>
            Your search has been submitted to the blockchain.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Coordinates */}
          <div className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50">
            <h4 className="text-sm font-semibold text-gray-700 mb-1">
              Location Searched
            </h4>
            <p className="text-lg font-bold text-blue-600">
              ({coordinates.x}, {coordinates.y})
            </p>
          </div>

          {/* Transaction Signature */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700">
              Transaction Signature
            </h4>
            <div className="bg-gray-100 rounded p-3 break-all">
              <code className="text-xs text-gray-800">{signature}</code>
            </div>
          </div>

          {/* Search ID */}
          {searchId && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700">Search ID</h4>
              <div className="bg-gray-100 rounded p-3">
                <code className="text-xs text-gray-800">{searchId}</code>
              </div>
            </div>
          )}

          {/* View on Solscan */}
          <div className="pt-2">
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
              View on Solscan
            </a>
          </div>

          {/* Info Message */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              The transaction is being processed on the blockchain. Check back
              soon to see if you found any treasure!
            </p>
          </div>

          {/* Close Button */}
          <div className="flex justify-end pt-2">
            <Button
              onClick={onClose}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
