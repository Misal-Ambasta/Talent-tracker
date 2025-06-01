import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Play, Pause, Trash2, Save, StopCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useReactMediaRecorder } from "react-media-recorder";

interface AudioRecordingComponentProps {
  onTranscriptionComplete: (transcription: string) => void;
}

const AudioRecordingComponent = ({ onTranscriptionComplete }: AudioRecordingComponentProps) => {
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const {
    status,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearBlobUrl,
    mediaBlobUrl,
  } = useReactMediaRecorder({
    audio: true,
    video: false,
    blobPropertyBag: { type: "audio/wav" },
  });

  // Handle recording timer
  useEffect(() => {
    if (status === "recording") {
      timerRef.current = setInterval(() => {
        setRecordingTime((prevTime) => prevTime + 1);
      }, 1000);
    } else if (status === "paused" && timerRef.current) {
      clearInterval(timerRef.current);
    } else if ((status === "stopped" || status === "idle") && timerRef.current) {
      clearInterval(timerRef.current);
      if (status === "stopped") {
        // Keep the time displayed when stopped
      } else {
        setRecordingTime(0);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [status]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const togglePlayback = () => {
    if (!audioRef.current || !mediaBlobUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const resetRecording = () => {
    clearBlobUrl();
    setRecordingTime(0);
    setIsPlaying(false);
  };

  const handleProcessRecording = () => {
    if (!mediaBlobUrl) {
      toast({
        title: "No recording available",
        description: "Please record audio before processing",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    // Simulate AI transcription progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setIsProcessing(false);
          
          // Simulate transcription result
          const sampleTranscription = `
Interview Transcript - ${new Date().toLocaleDateString()}

Interviewer: Thank you for joining us today. Can you start by telling us about your background?

Candidate: Of course! I have about 5 years of experience in software development, primarily working with React and Node.js. In my current role at Tech Corp, I've been leading a team of 3 developers on various client projects.

Interviewer: That's great. What would you say is your biggest achievement in your current role?

Candidate: I'd say it was successfully migrating our legacy codebase to a modern React architecture. It was a 6-month project that resulted in 40% faster page load times and significantly improved user experience. I coordinated with multiple teams and managed the timeline effectively.

Interviewer: How do you handle challenging situations with team members?

Candidate: I believe in open communication and addressing issues early. For example, when we had conflicting opinions on architecture decisions, I organized team discussions where everyone could present their viewpoints. We then made decisions based on technical merit and business impact.

Interviewer: What interests you about this role specifically?

Candidate: I'm excited about the opportunity to work on larger scale systems and the chance to mentor junior developers. Your company's focus on innovation and the collaborative culture really appeals to me.
          `;
          
          onTranscriptionComplete(sampleTranscription.trim());
          
          toast({
            title: "Transcription complete",
            description: "Audio has been successfully transcribed and is ready for AI analysis",
          });
          return 100;
        }
        return prev + 5;
      });
    }, 300);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Mic className="w-5 h-5 mr-2" />
          Audio Interview Recording
        </CardTitle>
        <CardDescription>
          Record interview audio directly for automatic transcription and AI analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Recording Status */}
        <div className="flex items-center justify-between">
          <Badge
            variant={status === "recording" ? "destructive" : status === "paused" ? "outline" : "secondary"}
            className="px-3 py-1"
          >
            {status === "recording" && "Recording..."}
            {status === "paused" && "Paused"}
            {status === "stopped" && "Recorded"}
            {status === "idle" && "Ready to Record"}
          </Badge>
          <div className="text-sm font-mono">{formatTime(recordingTime)}</div>
        </div>

        {/* Recording Controls */}
        <div className="flex flex-wrap gap-2">
          {status === "idle" || status === "stopped" ? (
            <Button
              onClick={startRecording}
              variant="destructive"
              className="flex-1"
              disabled={isProcessing}
            >
              <Mic className="w-4 h-4 mr-2" />
              Start Recording
            </Button>
          ) : status === "recording" ? (
            <>
              <Button onClick={pauseRecording} variant="outline" className="flex-1">
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </Button>
              <Button onClick={stopRecording} variant="destructive" className="flex-1">
                <StopCircle className="w-4 h-4 mr-2" />
                Stop
              </Button>
            </>
          ) : (
            <>
              <Button onClick={resumeRecording} variant="outline" className="flex-1">
                <Mic className="w-4 h-4 mr-2" />
                Resume
              </Button>
              <Button onClick={stopRecording} variant="destructive" className="flex-1">
                <StopCircle className="w-4 h-4 mr-2" />
                Stop
              </Button>
            </>
          )}
        </div>

        {/* Audio Playback */}
        {mediaBlobUrl && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-3">
                <Mic className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium">Recorded Audio</p>
                  <p className="text-sm text-gray-500">{formatTime(recordingTime)} duration</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" onClick={togglePlayback}>
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={resetRecording}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <audio
              ref={audioRef}
              src={mediaBlobUrl}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
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
              onClick={handleProcessRecording}
              className="w-full"
              disabled={isProcessing || !mediaBlobUrl}
              size="lg"
            >
              {isProcessing ? (
                "Transcribing Audio..."
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Transcribe & Analyze
                </>
              )}
            </Button>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">
            🎤 Live Recording Tips
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
            <li>• Ensure you're in a quiet environment</li>
            <li>• Speak clearly and at a moderate pace</li>
            <li>• Keep the microphone at a consistent distance</li>
            <li>• Identify speakers before they speak</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default AudioRecordingComponent;