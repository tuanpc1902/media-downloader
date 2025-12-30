import { useState, useRef, useCallback, useEffect } from 'react';
import { Search, X, Upload, AlertCircle, CheckCircle, Copy } from 'lucide-react';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { cn } from '../../utils/cn';

export interface TikTokURLValidationResult {
  isValid: boolean;
  url: string;
  error?: string;
  videoId?: string;
}

interface TikTokInputSectionProps {
  onAnalyze: (urls: string[]) => Promise<void>;
  onClear: () => void;
  loading?: boolean;
}

/**
 * TikTok URL Input Section
 * 
 * Features:
 * - Multi-line URL input
 * - Real-time validation (TikTok URLs only)
 * - Drag & drop support
 * - Paste from clipboard
 * - Visual validation indicators
 */
export function TikTokInputSection({ onAnalyze, onClear, loading = false }: TikTokInputSectionProps) {
  const [text, setText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [validationResults, setValidationResults] = useState<Map<number, TikTokURLValidationResult>>(new Map());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse URLs from text (support newline, comma, semicolon)
  const parseURLs = useCallback((text: string): string[] => {
    return text
      .split(/[\n\r,;]+/)
      .map(url => url.trim())
      .filter(url => url.length > 0);
  }, []);

  // Validate TikTok URL
  const validateTikTokURL = useCallback((url: string): TikTokURLValidationResult => {
    const trimmed = url.trim();
    
    if (!trimmed) {
      return { isValid: false, url: trimmed, error: 'URL không được để trống' };
    }

    // Basic URL format check
    try {
      new URL(trimmed);
    } catch {
      return { isValid: false, url: trimmed, error: 'URL không hợp lệ' };
    }

    // Check if it's a TikTok URL
    if (!trimmed.includes('tiktok.com')) {
      return { 
        isValid: false, 
        url: trimmed, 
        error: 'Chỉ hỗ trợ URL TikTok. Ví dụ: https://www.tiktok.com/@username/video/1234567890' 
      };
    }

    // Extract video ID if possible
    const videoIdMatch = trimmed.match(/\/video\/(\d+)/);
    const videoId = videoIdMatch ? videoIdMatch[1] : undefined;

    // Check if it's a video URL (not user profile, etc.)
    if (!trimmed.includes('/video/')) {
      return { 
        isValid: false, 
        url: trimmed, 
        error: 'URL phải là link video TikTok. Ví dụ: https://www.tiktok.com/@username/video/1234567890' 
      };
    }

    return { isValid: true, url: trimmed, videoId };
  }, []);

  // Validate all URLs
  useEffect(() => {
    const urls = parseURLs(text);
    const results = new Map<number, TikTokURLValidationResult>();
    
    urls.forEach((url, index) => {
      results.set(index, validateTikTokURL(url));
    });
    
    setValidationResults(results);
  }, [text, parseURLs, validateTikTokURL]);

  const urls = parseURLs(text);
  const validURLs = urls.filter((_url, index) => {
    const result = validationResults.get(index);
    return result?.isValid;
  });

  const hasValidURLs = validURLs.length > 0;
  const hasInvalidURLs = urls.length > validURLs.length;

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  const handleAnalyze = async () => {
    if (validURLs.length === 0) return;
    await onAnalyze(validURLs);
  };

  const handleClear = () => {
    setText('');
    setValidationResults(new Map());
    onClear();
  };

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const paste = (e.clipboardData || (window as any).clipboardData).getData('text');
    if (paste && textareaRef.current) {
      if (document.activeElement === textareaRef.current) {
        return; // Let default paste behavior handle it
      }
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentValue = text;
      const newValue = currentValue.slice(0, start) + paste + currentValue.slice(end);
      setText(newValue);
      e.preventDefault();
    }
  }, [text]);

  const handleDrag = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedText = e.dataTransfer?.getData('text/plain');
    if (droppedText) {
      const currentUrls = text ? text + '\n' + droppedText : droppedText;
      setText(currentUrls);
    }
  }, [text]);

  const handleImportFromClipboard = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (clipboardText) {
        const currentUrls = text ? text + '\n' + clipboardText : clipboardText;
        setText(currentUrls);
      }
    } catch (error) {
      console.error('Failed to read clipboard:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          setText(content);
        }
      };
      reader.readAsText(file);
    }
  };

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.addEventListener('paste', handlePaste);
      return () => {
        textarea.removeEventListener('paste', handlePaste);
      };
    }
  }, [handlePaste]);

  useEffect(() => {
    const handleDragEvents = (e: DragEvent) => handleDrag(e);
    const handleDropEvent = (e: DragEvent) => handleDrop(e);

    window.addEventListener('dragenter', handleDragEvents);
    window.addEventListener('dragover', handleDragEvents);
    window.addEventListener('dragleave', handleDragEvents);
    window.addEventListener('drop', handleDropEvent);

    return () => {
      window.removeEventListener('dragenter', handleDragEvents);
      window.removeEventListener('dragover', handleDragEvents);
      window.removeEventListener('dragleave', handleDragEvents);
      window.removeEventListener('drop', handleDropEvent);
    };
  }, [handleDrag, handleDrop]);

  return (
    <div className="space-y-4">
      {/* Input Area */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          placeholder="Nhập URL TikTok... (hỗ trợ nhiều URL, mỗi dòng một URL)&#10;&#10;Ví dụ:&#10;https://www.tiktok.com/@username/video/1234567890"
          className={cn(
            'w-full min-h-[120px] px-4 py-3 bg-transparent',
            'text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500',
            'resize-y focus:outline-none',
            'font-mono text-sm',
            'border-2 border-gray-300 dark:border-gray-600 rounded-xl',
            'focus:border-blue-500 dark:focus:border-blue-400',
            'transition-colors'
          )}
          disabled={loading}
        />

        {/* Drag & Drop overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-blue-500/10 dark:bg-blue-500/20 rounded-xl flex items-center justify-center z-10 border-2 border-blue-500 border-dashed">
            <div className="text-center">
              <Upload className="w-12 h-12 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
              <p className="text-blue-700 dark:text-blue-300 font-semibold">
                Thả URL vào đây
              </p>
            </div>
          </div>
        )}

        {/* URL Count Badge */}
        {text && (
          <div className="absolute top-2 right-2 flex items-center gap-2">
            {hasValidURLs && (
              <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                {validURLs.length} valid
              </Badge>
            )}
            {hasInvalidURLs && (
              <Badge variant="default" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                <AlertCircle className="w-3 h-3 mr-1" />
                {urls.length - validURLs.length} invalid
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Validation Details */}
      {hasInvalidURLs && urls.length <= 5 && (
        <div className="space-y-1">
          {urls.map((url, index) => {
            const result = validationResults.get(index);
            if (result?.isValid) return null;
            
            return (
              <div key={index} className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="font-mono">{url.substring(0, 60)}{url.length > 60 ? '...' : ''}</span>
                  {result?.error && <span className="ml-2">- {result.error}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TikTok Badge */}
      {hasValidURLs && (
        <div className="flex items-center gap-2">
          <Badge variant="platform" platform="tiktok">
            TikTok
          </Badge>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {validURLs.length} video{validURLs.length > 1 ? 's' : ''} ready to analyze
          </span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleImportFromClipboard}
            disabled={loading}
          >
            <Copy className="w-4 h-4" />
            Paste from Clipboard
          </Button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
          >
            <Upload className="w-4 h-4" />
            Import from File
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={loading || !text}
          >
            <X className="w-4 h-4" />
            Clear
          </Button>
          
          <Button
            variant="primary"
            size="md"
            onClick={handleAnalyze}
            disabled={loading || !hasValidURLs}
            loading={loading}
          >
            <Search className="w-4 h-4" />
            Analyze ({validURLs.length})
          </Button>
        </div>
      </div>

      {/* Helper Text */}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        💡 Tip: Bạn có thể nhập nhiều URL TikTok, mỗi URL một dòng hoặc phân cách bằng dấu phẩy. 
        Hỗ trợ drag & drop URL hoặc paste từ clipboard.
      </p>
    </div>
  );
}

