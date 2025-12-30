import { useState, useRef, useCallback, useEffect } from 'react';
import { Search, X, Upload, AlertCircle, CheckCircle, Copy } from 'lucide-react';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { cn } from '../../utils/cn';
import { PlatformType } from '../../types';

export type Platform = 'youtube' | 'soundcloud' | 'tiktok' | 'unknown';

export interface URLValidationResult {
  isValid: boolean;
  platform: Platform;
  url: string;
  error?: string;
  warnings?: string[];
}

interface URLInputSectionProps {
  onAnalyze: (urls: string[]) => Promise<void>;
  onClear: () => void;
  loading?: boolean;
  placeholder?: string;
}

// Platform detection
function detectPlatform(url: string): Platform {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('soundcloud.com')) return 'soundcloud';
  if (url.includes('tiktok.com')) return 'tiktok';
  return 'unknown';
}

// URL validation
function validateURL(url: string): URLValidationResult {
  const trimmed = url.trim();
  
  if (!trimmed) {
    return { isValid: false, platform: 'unknown', url: trimmed, error: 'URL không được để trống' };
  }

  // Basic URL format check
  try {
    new URL(trimmed);
  } catch {
    return { isValid: false, platform: 'unknown', url: trimmed, error: 'URL không hợp lệ' };
  }

  const platform = detectPlatform(trimmed);
  
  if (platform === 'unknown') {
    return { 
      isValid: false, 
      platform: 'unknown', 
      url: trimmed, 
      error: 'Không hỗ trợ platform này. Hỗ trợ: YouTube, SoundCloud, TikTok' 
    };
  }

  return { isValid: true, platform, url: trimmed };
}

export function URLInputSection({ onAnalyze, onClear, loading = false, placeholder = 'Nhập URL... (hỗ trợ nhiều URL, mỗi dòng một URL)' }: URLInputSectionProps) {
  const [text, setText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [validationResults, setValidationResults] = useState<Map<number, URLValidationResult>>(new Map());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse URLs from text (support newline, comma, semicolon)
  const parseURLs = useCallback((text: string): string[] => {
    return text
      .split(/[\n\r,;]+/)
      .map(url => url.trim())
      .filter(url => url.length > 0);
  }, []);

  // Validate all URLs
  useEffect(() => {
    const urls = parseURLs(text);
    const results = new Map<number, URLValidationResult>();
    
    urls.forEach((url, index) => {
      results.set(index, validateURL(url));
    });
    
    setValidationResults(results);
  }, [text, parseURLs]);

  const validURLs = parseURLs(text).filter((_url, index) => {
    const result = validationResults.get(index);
    return result?.isValid;
  });

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
    textareaRef.current?.focus();
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData('text');
    if (pastedText.includes('http')) {
      // Auto-paste URLs
      const currentText = text;
      const newText = currentText ? `${currentText}\n${pastedText}` : pastedText;
      setText(newText);
    }
  };

  // Drag & Drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedText = e.dataTransfer.getData('text/plain');
    if (droppedText && droppedText.includes('http')) {
      const currentText = text;
      const newText = currentText ? `${currentText}\n${droppedText}` : droppedText;
      setText(newText);
    }
  }, [text]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setText(content);
      };
      reader.readAsText(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImportFromClipboard = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (clipboardText.includes('http')) {
        const currentText = text;
        const newText = currentText ? `${currentText}\n${clipboardText}` : clipboardText;
        setText(newText);
      }
    } catch (error) {
      console.error('Failed to read clipboard:', error);
    }
  };

  const urls = parseURLs(text);
  const hasValidURLs = validURLs.length > 0;
  const hasInvalidURLs = urls.some((_, index) => !validationResults.get(index)?.isValid);

  return (
    <div className="space-y-4">
      {/* URL Input Area */}
      <div
        className={cn(
          'relative border-2 border-dashed rounded-xl transition-colors',
          isDragging
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800',
          'focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20'
        )}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onPaste={handlePaste}
          placeholder={placeholder}
          className={cn(
            'w-full min-h-[120px] px-4 py-3 bg-transparent',
            'text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500',
            'resize-y focus:outline-none',
            'font-mono text-sm'
          )}
          disabled={loading}
        />

        {/* Drag & Drop overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-primary-500/10 dark:bg-primary-500/20 rounded-xl flex items-center justify-center z-10">
            <div className="text-center">
              <Upload className="w-12 h-12 text-primary-600 dark:text-primary-400 mx-auto mb-2" />
              <p className="text-primary-700 dark:text-primary-300 font-semibold">
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

      {/* Validation Details (if needed) */}
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

      {/* Platform Badges for valid URLs */}
      {hasValidURLs && (
        <div className="flex flex-wrap gap-2">
          {validURLs.map((url, index) => {
            const platform = detectPlatform(url);
            const platformNames: Record<PlatformType, string> = {
              youtube: 'YouTube',
              soundcloud: 'SoundCloud',
              tiktok: 'TikTok',
            };
            
            // Only show badge if platform is known
            if (platform === 'unknown') {
              return null;
            }
            
            return (
              <Badge key={index} variant="platform" platform={platform as PlatformType}>
                {platformNames[platform as PlatformType] || platform}
              </Badge>
            );
          })}
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
        💡 Tip: Bạn có thể nhập nhiều URL, mỗi URL một dòng hoặc phân cách bằng dấu phẩy. 
        Hỗ trợ drag & drop URL hoặc paste từ clipboard.
      </p>
    </div>
  );
}

