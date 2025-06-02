import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Mic, Upload, Play, Pause, Trash2, FileAudio } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { uploadInterviewAudio, processInterviewAudio, getInterviewSummary } from '@/services/interviewService';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@/store';
import { uploadInterviewAudioThunk } from '@/slices/aiResultsSlice';

interface AudioUploadComponentProps {
  onTranscriptionComplete: (transcription: string) => void;
}

const AudioUploadComponent = ({ onTranscriptionComplete }: AudioUploadComponentProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const dispatch = useDispatch<AppDispatch>();

  const ACCEPTED_AUDIO_TYPES = ['.mp3', '.wav', '.m4a', '.mp4', '.webm'];
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File too large",
        description: "Please select an audio file smaller than 50MB",
        variant: "destructive",
      });
      return;
    }

    // Check file type
    const isValidType = ACCEPTED_AUDIO_TYPES.some(type => 
      file.name.toLowerCase().endsWith(type.slice(1))
    );

    if (!isValidType) {
      toast({
        title: "Invalid file type",
        description: "Please select an audio file (MP3, WAV, M4A, MP4, WebM)",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    toast({
      title: "Audio file selected",
      description: `${file.name} is ready for transcription`,
    });
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      // Dispatch the thunk to upload and process audio, and update Redux state
      const resultAction = await dispatch(uploadInterviewAudioThunk({ file: selectedFile }));
      setIsProcessing(false);
      setProgress(100);
      if (uploadInterviewAudioThunk.fulfilled.match(resultAction)) {
        toast({
          title: 'Transcription complete',
          description: 'Audio has been successfully transcribed and is ready for AI analysis',
        });
      } else if (uploadInterviewAudioThunk.rejected.match(resultAction)) {
        toast({
          title: 'Transcription failed',
          description: resultAction.payload as React.ReactNode || 'Unable to retrieve transcription after processing.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      setIsProcessing(false);
      toast({
        title: 'Upload or transcription error',
        description: error instanceof Error ? error.message : 'An error occurred during upload or transcription.',
        variant: 'destructive',
      });
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current || !selectedFile) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const removeFile = () => {
    setSelectedFile(null);
    setProgress(0);
    setIsPlaying(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileAudio className="w-5 h-5 mr-2" />
          Audio Interview Upload
        </CardTitle>
        <CardDescription>
          Upload interview recordings for automatic transcription and AI analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!selectedFile ? (
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
            <Mic className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <div className="space-y-2">
              <p className="text-lg font-medium">Upload Interview Recording</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Supports MP3, WAV, M4A, MP4, WebM • Max 50MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3,.wav,.m4a,.mp4,.webm"
                onChange={handleFileSelect}
                className="hidden"
                id="audio-upload"
              />
              <Button
                variant="outline"
                className="cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                <Upload className="w-4 h-4 mr-2" />
                Choose Audio File
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* File Info */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-3">
                <FileAudio className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" onClick={removeFile}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Audio Player */}
            <audio
              ref={audioRef}
              src={selectedFile ? URL.createObjectURL(selectedFile) : undefined}
              onEnded={() => setIsPlaying(false)}
              className="w-full"
              controls
            />

            {/* Processing Progress */}
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Transcribing audio...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>
            )}

            {/* Process Button */}
            <Button 
              onClick={handleUpload} 
              className="w-full" 
              disabled={isProcessing}
              size="lg"
            >
              {isProcessing ? (
                "Transcribing Audio..."
              ) : (
                <>
                  <Mic className="w-4 h-4 mr-2" />
                  Transcribe & Analyze
                </>
              )}
            </Button>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">
            🎤 AI Audio Processing
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
            <li>• Automatic speech-to-text transcription</li>
            <li>• Speaker identification and separation</li>
            <li>• Sentiment analysis and tone detection</li>
            <li>• Key insights and conversation highlights</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default AudioUploadComponent;