import { useState } from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '../common/Button';

interface FacebookLegalDisclaimerProps {
  onAccept: () => void;
  onDecline: () => void;
}

/**
 * Legal Disclaimer Modal - Required before using Facebook downloader
 */
export function FacebookLegalDisclaimer({ onAccept, onDecline }: FacebookLegalDisclaimerProps) {
  const [accepted, setAccepted] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Terms of Use
            </h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Important Notice */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
                  Important Legal Notice
                </h3>
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  Please read and understand these terms before using this service.
                </p>
              </div>
            </div>
          </div>

          {/* Terms */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Terms and Conditions
            </h3>
            
            <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">1</span>
                </div>
                <div>
                  <p className="font-medium mb-1">Content Ownership</p>
                  <p>
                    You may only download content that you own or have explicit permission to download.
                    Downloading content without permission may violate copyright laws.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">2</span>
                </div>
                <div>
                  <p className="font-medium mb-1">Public Content Only</p>
                  <p>
                    This service only supports downloading public Facebook videos and stories. 
                    Private or restricted content cannot be downloaded.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">3</span>
                </div>
                <div>
                  <p className="font-medium mb-1">Facebook Terms of Service</p>
                  <p>
                    You must comply with Facebook's Terms of Service. 
                    This tool is for personal use only and should not be used to violate Facebook's policies.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">4</span>
                </div>
                <div>
                  <p className="font-medium mb-1">User Responsibility</p>
                  <p>
                    You are solely responsible for how you use downloaded content. 
                    This service is provided as-is and we are not liable for misuse.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Technical Details */}
          <details className="border border-gray-200 dark:border-gray-700 rounded-lg">
            <summary className="px-4 py-3 cursor-pointer font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50">
              Technical Information
            </summary>
            <div className="px-4 pb-4 pt-2 text-xs text-gray-600 dark:text-gray-400 space-y-2">
              <p>
                <strong>How it works:</strong> This service uses yt-dlp, an open-source tool that 
                accesses Facebook videos and stories through public APIs.
              </p>
              <p>
                <strong>File storage:</strong> Downloaded files are temporarily stored on our servers 
                and automatically deleted after 24 hours. We do not keep permanent copies.
              </p>
            </div>
          </details>

          {/* Acceptance Checkbox */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white mb-1">
                  I have read and agree to the terms above
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  I understand that I am responsible for using downloaded content legally and in 
                  compliance with Facebook's Terms of Service.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={onDecline}
            className="px-6"
          >
            Decline
          </Button>
          <Button
            variant="primary"
            onClick={onAccept}
            disabled={!accepted}
            className="px-6"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Accept & Continue
          </Button>
        </div>
      </div>
    </div>
  );
}

