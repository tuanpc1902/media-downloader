import { useState, useRef, useCallback, DragEvent } from 'react';
import { Search, X, AlertCircle, CheckCircle, Youtube, Music, Video } from 'lucide-react';
import { analyzeVideo, analyzePlaylist } from '../../services/api';
import { MediaInfo } from '../../types';

interface URLInputSectionProps {
  onAnalyzeComplete: (results: MediaInfo[]) => void;
  onError: (error: string) => void;
}

export function URLInputSection({ onAnalyzeComplete, onError }: URLInputSectionProps) {
  const [urls, setUrls] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [validations, setValidations] = useState<Map<number, { valid: boolean; platform?: string; error?: string }>>(new Map());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const detectPlatform = (url: string): string | null => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('soundcloud.com')) return 'soundcloud';
    if (url.includes('tiktok.com')) return 'tiktok';
    return null;
  };

  const validateURL = (url: string): { valid: boolean; platform?: string; error?: string } => {
    const trimmed = url.trim();
    if (!trimmed) return { valid: false, error: 'URL trống' };
    
    try {
      new URL(trimmed);
    } catch {
      return { valid: false, error: 'URL không hợp lệ' };
    }

    const platform = detectPlatform(trimmed);
    if (!platform) {
      return { valid: false, error: 'Nền tảng không được hỗ trợ' };
    }

    return { valid: true, platform };
  };

  const handleInputChange = (value: string) => {
    setUrls(value);
    
    // Real-time validation
    const lines = value.split('\n').filter(line => line.trim());
    const newValidations = new Map<number, { valid: boolean; platform?: string; error?: string }>();
    
    lines.forEach((line, index) => {
      if (line.trim()) {
        newValidations.set(index, validateURL(line));
      }
    });
    
    setValidations(newValidations);
  };

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const paste = (e.clipboardData || (window as any).clipboardData).getData('text');
    if (paste && textareaRef.current) {
      // Check if textarea is focused
      if (document.activeElement === textareaRef.current) {
        return; // Let default paste handle it
      }
      
      // If textarea has selection, insert at cursor
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentValue = urls;
      
      const newValue = currentValue.slice(0, start) + paste + currentValue.slice(end);
      handleInputChange(newValue);
      e.preventDefault();
    }
  }, [urls]);

  const handleDrag = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedText = e.dataTransfer.getData('text/plain');
    if (droppedText) {
      const currentUrls = urls ? urls + '\n' + droppedText : droppedText;
      handleInputChange(currentUrls);
    }
  }, [urls]);

  const handleAnalyze = async () => {
    const urlList = urls
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (urlList.length === 0) {
      onError('Vui lòng nhập ít nhất một URL');
      return;
    }

    // Validate all URLs
    const invalidUrls = urlList.filter(url => {
      const validation = validateURL(url);
      return !validation.valid;
    });

    if (invalidUrls.length > 0) {
      onError(`Có ${invalidUrls.length} URL không hợp lệ`);
      return;
    }

    setLoading(true);
    const results: MediaInfo[] = [];
    const errors: string[] = [];

    try {
      // Analyze URLs in parallel (limit to 5 concurrent)
      const batchSize = 5;
      for (let i = 0; i < urlList.length; i += batchSize) {
        const batch = urlList.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(
          batch.map(async (url) => {
            const isPlaylist = url.includes('list=') || url.includes('/playlist');
            if (isPlaylist) {
              return await analyzePlaylist(url);
            } else {
              return await analyzeVideo(url);
            }
          })
        );

        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value as MediaInfo);
          } else {
            errors.push(`${batch[index]}: ${result.reason?.message || 'Lỗi không xác định'}`);
          }
        });
      }

      if (results.length > 0) {
        onAnalyzeComplete(results);
        // Clear input after successful analyze
        setUrls('');
        setValidations(new Map());
      }

      if (errors.length > 0 && results.length === 0) {
        onError(errors.join('\n'));
      } else if (errors.length > 0) {
        // Show warning but continue with successful results
        console.warn('Some URLs failed:', errors);
      }
    } catch (error: any) {
      onError(error.message || 'Lỗi phân tích URL');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setUrls('');
    setValidations(new Map());
  };

  const urlLines = urls.split('\n');
  const validCount = Array.from(validations.values()).filter(v => v.valid).length;
  const invalidCount = Array.from(validations.values()).filter(v => !v.valid).length;

  const getPlatformIcon = (platform?: string) => {
    switch (platform) {
      case 'youtube':
        return <Youtube className="w-4 h-4 text-red-500" />;
      case 'soundcloud':
        return <Music className="w-4 h-4 text-orange-500" />;
      case 'tiktok':
        return <Video className="w-4 h-4 text-gray-900 dark:text-white" />;
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Input Container */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-6 transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <textarea
          ref={textareaRef}
          value={urls}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="Nhập URL (mỗi URL một dòng) hoặc dán nhiều URL&#10;&#10;Hỗ trợ: YouTube, SoundCloud, TikTok&#10;Ví dụ:&#10;https://www.youtube.com/watch?v=...&#10;https://soundcloud.com/..."
          className="w-full min-h-[200px] px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm"
          disabled={loading}
        />

        {/* Validation Indicators */}
        {urlLines.length > 1 && validations.size > 0 && (
          <div className="absolute top-2 right-2 flex items-center gap-2 text-xs">
            {validCount > 0 && (
              <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <CheckCircle className="w-3 h-3" />
                {validCount}
              </span>
            )}
            {invalidCount > 0 && (
              <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                <AlertCircle className="w-3 h-3" />
                {invalidCount}
              </span>
            )}
          </div>
        )}

        {/* URL Line Indicators */}
        {urlLines.length > 1 && (
          <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
            {urlLines.map((line, index) => {
              if (!line.trim()) return null;
              const validation = validations.get(index);
              if (!validation) return null;

              return (
                <div
                  key={index}
                  className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${
                    validation.valid
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                      : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                  }`}
                >
                  {validation.valid ? (
                    <>
                      <CheckCircle className="w-3 h-3" />
                      {getPlatformIcon(validation.platform)}
                      <span className="truncate flex-1">{line.substring(0, 50)}...</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3" />
                      <span className="truncate flex-1">{validation.error}</span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Drag Overlay */}
        {dragActive && (
          <div className="absolute inset-0 bg-blue-500/10 dark:bg-blue-500/20 rounded-xl flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="text-4xl mb-2">📥</div>
              <div className="text-lg font-semibold text-blue-700 dark:text-blue-300">
                Thả URL vào đây
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {urlLines.filter(l => l.trim()).length > 0 && (
            <span>
              {urlLines.filter(l => l.trim()).length} URL
              {validCount > 0 && ` (${validCount} hợp lệ)`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleClear}
            disabled={loading || !urls.trim()}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Xóa
          </button>

          <button
            onClick={handleAnalyze}
            disabled={loading || !urls.trim() || invalidCount > 0}
            className="px-6 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 disabled:transform-none flex items-center gap-2 shadow-lg"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Đang phân tích...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Phân tích ({urlLines.filter(l => l.trim()).length})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

