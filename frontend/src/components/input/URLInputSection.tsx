import { useState, useRef, useCallback, useEffect } from 'react';
import { Search, X, Upload, AlertCircle, CheckCircle, Copy } from 'lucide-react';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { cn } from '../../utils/cn';
import { PlatformType } from '../../types';
import { extractVideoId, isPlaylistUrl } from '../../utils/urlValidator';

export type Platform = 'youtube' | 'soundcloud' | 'tiktok' | 'facebook' | 'unknown';

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

/**
 * Normalize URL - thêm protocol nếu thiếu
 */
function normalizeUrl(url: string): string {
  let normalized = url.trim();
  
  // Loại bỏ fragments (#)
  const hashIndex = normalized.indexOf('#');
  if (hashIndex !== -1) {
    normalized = normalized.substring(0, hashIndex);
  }
  
  // Loại bỏ trailing slashes
  normalized = normalized.replace(/\/+$/, '');
  
  // Thêm protocol nếu thiếu (giả định https)
  if (!normalized.match(/^https?:\/\//i)) {
    // Chỉ thêm nếu có vẻ là URL (có domain)
    if (normalized.includes('.') || normalized.includes('/')) {
      normalized = 'https://' + normalized;
    }
  }
  
  return normalized;
}

// Platform detection - cải thiện để nhận diện tốt hơn
function detectPlatform(url: string): Platform {
  const normalized = normalizeUrl(url).toLowerCase();
  
  // YouTube patterns
  if (normalized.includes('youtube.com') || normalized.includes('youtu.be')) {
    return 'youtube';
  }
  
  // SoundCloud patterns
  if (normalized.includes('soundcloud.com')) {
    return 'soundcloud';
  }
  
  // TikTok patterns
  if (normalized.includes('tiktok.com')) {
    return 'tiktok';
  }
  
  // Facebook patterns
  if (normalized.includes('facebook.com') || normalized.includes('fb.com') || normalized.includes('m.facebook.com')) {
    return 'facebook';
  }
  
  return 'unknown';
}

// URL validation - cải thiện để validate tốt hơn
function validateURL(url: string): URLValidationResult {
  const trimmed = url.trim();
  
  if (!trimmed) {
    return { isValid: false, platform: 'unknown', url: trimmed, error: 'URL không được để trống' };
  }

  const platform = detectPlatform(trimmed);
  
  // Nếu không phải platform được hỗ trợ, kiểm tra xem có phải là video ID không
  if (platform === 'unknown') {
    // Kiểm tra xem có phải là YouTube video ID không (11 ký tự)
    const videoId = extractVideoId(trimmed);
    if (videoId) {
      return { isValid: true, platform: 'youtube', url: trimmed };
    }
    
    return { 
      isValid: false, 
      platform: 'unknown', 
      url: trimmed, 
      error: 'Không hỗ trợ platform này. Hỗ trợ: YouTube, SoundCloud, TikTok, Facebook' 
    };
  }

  // Validate cụ thể cho từng platform
  if (platform === 'youtube') {
    const videoId = extractVideoId(trimmed);
    const isPlaylist = isPlaylistUrl(trimmed);
    
    // YouTube URL hợp lệ nếu có video ID hoặc là playlist
    if (!videoId && !isPlaylist) {
      // Thử normalize và kiểm tra lại
      const normalized = normalizeUrl(trimmed);
      const normalizedVideoId = extractVideoId(normalized);
      const normalizedIsPlaylist = isPlaylistUrl(normalized);
      
      if (!normalizedVideoId && !normalizedIsPlaylist) {
        return { 
          isValid: false, 
          platform: 'youtube', 
          url: trimmed, 
          error: 'Không thể extract video ID hoặc playlist ID từ URL YouTube' 
        };
      }
    }
  }

  // Với SoundCloud và TikTok, chỉ cần kiểm tra format URL cơ bản
  if (platform === 'soundcloud' || platform === 'tiktok') {
    try {
      const normalized = normalizeUrl(trimmed);
      new URL(normalized);
    } catch {
      return { 
        isValid: false, 
        platform, 
        url: trimmed, 
        error: 'URL không hợp lệ' 
      };
    }
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
          'relative border-2 border-dashed rounded-xl transition-all duration-200',
          isDragging
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 scale-[1.005] shadow-lg'
            : 'border-border-light dark:border-border-dark bg-secondary-50 dark:bg-background-surfaceDark/50',
          'focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:shadow-md'
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
            'text-text-primary-light dark:text-text-primary-dark placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark',
            'resize-y focus:outline-none',
            'font-mono text-sm'
          )}
          disabled={loading}
        />

        {/* Drag & Drop overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-primary-500/10 dark:bg-primary-500/20 rounded-xl flex items-center justify-center z-10 backdrop-blur-sm">
            <div className="text-center animate-scale-in">
              <div className="w-16 h-16 bg-primary-500 rounded-xl flex items-center justify-center mb-3 shadow-md">
                <Upload className="w-8 h-8 text-white" />
              </div>
              <p className="text-primary-600 dark:text-primary-400 font-semibold text-lg">
                Thả URL vào đây
              </p>
            </div>
          </div>
        )}

        {/* URL Count Badge */}
        {text && (
          <div className="absolute top-2 right-2 flex items-center gap-2">
            {hasValidURLs && (
              <Badge variant="default" className="bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300">
                <CheckCircle className="w-3 h-3 mr-1" />
                {validURLs.length} valid
              </Badge>
            )}
            {hasInvalidURLs && (
              <Badge variant="default" className="bg-error-100 text-error-700 dark:bg-error-900 dark:text-error-300">
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
              <div key={index} className="flex items-start gap-2 text-sm text-error-600 dark:text-error-400">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-mono break-all">{url.length > 60 ? url.substring(0, 60) + '...' : url}</span>
                  {result?.error && <span className="ml-2 break-words">- {result.error}</span>}
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
              facebook: 'Facebook',
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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-border-light dark:border-border-dark">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleImportFromClipboard}
            disabled={loading}
            className="flex-1 sm:flex-initial"
            title="Dán URL từ clipboard"
          >
            <Copy className="w-4 h-4" />
            <span className="hidden sm:inline">Paste</span>
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
            className="flex-1 sm:flex-initial"
            title="Import từ file .txt"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Import</span>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={loading || !text}
            className="flex-1 sm:flex-initial"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Clear</span>
          </Button>
          
          <Button
            variant="primary"
            size="md"
            onClick={handleAnalyze}
            disabled={loading || !hasValidURLs}
            loading={loading}
            className="flex-1 sm:flex-initial min-w-[120px]"
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Analyze</span>
            <span className="sm:hidden">Phân tích</span>
            {validURLs.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-xs">
                {validURLs.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Helper Text */}
      <div className="flex items-start gap-2 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
        <span className="text-primary-600 dark:text-primary-400 text-sm flex-shrink-0">💡</span>
        <p className="text-xs text-primary-800 dark:text-primary-300 flex-1 break-words">
          <strong>Mẹo:</strong> Bạn có thể nhập nhiều URL, mỗi URL một dòng hoặc phân cách bằng dấu phẩy. 
          Hỗ trợ drag & drop URL hoặc paste từ clipboard.
        </p>
      </div>
    </div>
  );
}

