import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Navigation from "@/components/navigation";
import ChatInputComponent from "@/components/chat/ChatInputComponent";
import AudioUploadComponent from "@/components/interview/AudioUploadComponent";
import AudioRecordingComponent from "@/components/interview/AudioRecordingComponent";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { MessageSquare, Brain, Star, AlertTriangle, TrendingUp, Users, FileText, Mic, Upload, Type } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { processInterviewText, processInterviewAudio, processRecordedAudio } from "@/services/interviewService";
import { processInterviewTextInput } from "@/slices/aiResultsSlice";
import { RootState } from "@/store";
import type { AppDispatch } from "@/store";

const InterviewFeedback = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [selectedCandidate, setSelectedCandidate] = useState("");
  const [interviewType, setInterviewType] = useState("");
  const [rawFeedback, setRawFeedback] = useState("");
  const [inputMethod, setInputMethod] = useState<"text" | "audio" | "recording">("text");
  const { toast } = useToast();
  
  const { currentInterviewAnalysis, loading: isGenerating, error } = useSelector((state: RootState) => state.aiResults);
  const generatedFeedback = currentInterviewAnalysis ? {
    overallScore: currentInterviewAnalysis.overallScore,
    technicalScore: currentInterviewAnalysis.categoryScores.technicalSkills,
    communicationScore: currentInterviewAnalysis.categoryScores.communication,
    culturalFitScore: currentInterviewAnalysis.categoryScores.culturalFit,
    strengths: currentInterviewAnalysis.strengths,
    concerns: currentInterviewAnalysis.areasForImprovement,
    recommendation: currentInterviewAnalysis.recommendation === 'strong_hire' ? 'Strong Hire' : 
                    currentInterviewAnalysis.recommendation === 'hire' ? 'Hire' : 
                    currentInterviewAnalysis.recommendation === 'consider' ? 'Consider' : 'No Hire',
    summary: currentInterviewAnalysis.summary,
    biasFlags: [],  // This would come from a separate bias detection call if needed
    keyInsights: currentInterviewAnalysis.keyInsights
  } : null;

  const candidates = [
    { id: "1", name: "Alex Johnson", position: "Senior React Developer" },
    { id: "2", name: "Sarah Chen", position: "Product Manager" },
    { id: "3", name: "Emma Wilson", position: "UX Designer" },
  ];

  const interviewTypes = [
    { value: "technical", label: "Technical Interview" },
    { value: "behavioral", label: "Behavioral Interview" },
    { value: "cultural", label: "Cultural Fit Interview" },
    { value: "final", label: "Final Interview" },
  ];

  // Fixed: Pass the text directly to handleGenerateFeedback instead of using state
  const handleChatSummarize = async (chatText: string) => {
    setRawFeedback(chatText); // Update state for display/debugging
    await handleGenerateFeedback('text', chatText); // Pass text directly
  };

  const handleAudioTranscription = async (transcription: string) => {
    setRawFeedback(transcription);
    await handleGenerateFeedback('audio', transcription);
  };

  const handleRecordingTranscription = async (transcription: string) => {
    setRawFeedback(transcription);
    await handleGenerateFeedback('recording', transcription);
  };

  // Fixed: Accept text as parameter to avoid async state update issues
  const handleGenerateFeedback = async (
    type: 'text' | 'audio' | 'recording' = 'text', 
    feedbackText?: string
  ) => {
    // Use the passed text or fall back to state
    const textToProcess = feedbackText || rawFeedback;
    
    console.log("Generating feedback with:", {
      selectedCandidate,
      interviewType,
      textToProcess: textToProcess.substring(0, 100) + "..." // Log first 100 chars
    });
    
    try {
      const resultAction = await dispatch(processInterviewTextInput({
        applicantId: selectedCandidate,
        text: textToProcess,
        includeJobContext: true
      }));
      
      if (processInterviewTextInput.fulfilled.match(resultAction)) {
        toast({
          title: "Feedback generated successfully",
          description: "AI has analyzed the interview and generated structured feedback",
        });
      } else if (processInterviewTextInput.rejected.match(resultAction)) {
        throw new Error(resultAction.payload as string || 'Failed to process interview');
      }
    } catch (error) {
      console.error("Error generating feedback:", error);
      toast({
        title: "Error generating feedback",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600";
    if (score >= 6) return "text-yellow-600";
    return "text-red-600";
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case "Strong Hire":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "Hire":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "No Hire":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
              <MessageSquare className="w-8 h-8 mr-3 text-blue-600" />
              Interview Feedback
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Generate structured feedback from interview notes using AI</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-6">
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Interview Details
                </CardTitle>
                <CardDescription>
                  Provide interview information and select input method
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Candidate Selection */}
                {/* <div>
                  <Label htmlFor="candidate-select">Select Candidate *</Label>
                  <Select value={selectedCandidate} onValueChange={setSelectedCandidate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a candidate..." />
                    </SelectTrigger>
                    <SelectContent>
                      {candidates.map((candidate) => (
                        <SelectItem key={candidate.id} value={candidate.id}>
                          {candidate.name} - {candidate.position}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div> */}

                {/* Interview Type */}
                {/* <div>
                  <Label htmlFor="interview-type">Interview Type *</Label>
                  <Select value={interviewType} onValueChange={setInterviewType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select interview type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {interviewTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div> */}

                {/* Input Method Selection */}
                <div>
                  <Label>Input Method</Label>
                  <Tabs value={inputMethod} onValueChange={(value) => setInputMethod(value as "text" | "audio" | "recording")}>
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="text" className="flex items-center">
                        <Type className="w-4 h-4 mr-2" />
                        Text Notes
                      </TabsTrigger>
                      <TabsTrigger value="audio" className="flex items-center">
                        <Upload className="w-4 h-4 mr-2" />
                        Audio Upload
                      </TabsTrigger>
                      <TabsTrigger value="recording" className="flex items-center">
                        <Mic className="w-4 h-4 mr-2" />
                        Record Audio
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardContent>
            </Card>

            {/* Input Components */}
            {inputMethod === "text" ? (
              <ChatInputComponent 
                onSummarize={handleChatSummarize}
                isProcessing={isGenerating}
              />
            ) : inputMethod === "audio" ? (
              <AudioUploadComponent 
                onTranscriptionComplete={handleAudioTranscription}
              />
            ) : (
              <AudioRecordingComponent 
                onTranscriptionComplete={handleRecordingTranscription}
              />
            )}
          </div>

          {/* Results Section */}
          <div>
            {generatedFeedback ? (
              <div className="space-y-6">
                {/* Overall Scores */}
                <Card className="animate-fade-in">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      AI-Generated Feedback
                      <Badge className={getRecommendationColor(generatedFeedback.recommendation)}>
                        {generatedFeedback.recommendation}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="text-center">
                        <div className={`text-3xl font-bold ${getScoreColor(generatedFeedback.overallScore)}`}>
                          {generatedFeedback.overallScore}/10
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Overall Score</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Technical Skills</span>
                          <span className={getScoreColor(generatedFeedback.technicalScore)}>
                            {generatedFeedback.technicalScore}/10
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Communication</span>
                          <span className={getScoreColor(generatedFeedback.communicationScore)}>
                            {generatedFeedback.communicationScore}/10
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Cultural Fit</span>
                          <span className={getScoreColor(generatedFeedback.culturalFitScore)}>
                            {generatedFeedback.culturalFitScore}/10
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Summary */}
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">Summary</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                          {generatedFeedback.summary}
                        </p>
                      </div>

                      {/* Strengths */}
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                          <TrendingUp className="w-4 h-4 mr-1 text-green-600" />
                          Strengths
                        </h4>
                        <ul className="space-y-1">
                          {generatedFeedback.strengths.map((strength: string, index: number) => (
                            <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-start">
                              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                              {strength}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Concerns */}
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                          <AlertTriangle className="w-4 h-4 mr-1 text-yellow-600" />
                          Areas for Consideration
                        </h4>
                        <ul className="space-y-1">
                          {generatedFeedback.concerns.map((concern: string, index: number) => (
                            <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-start">
                              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                              {concern}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Bias Detection */}
                {generatedFeedback.biasFlags.length > 0 && (
                  <Card className="border-yellow-200 dark:border-yellow-800 animate-fade-in">
                    <CardHeader>
                      <CardTitle className="flex items-center text-yellow-800 dark:text-yellow-200">
                        <AlertTriangle className="w-5 h-5 mr-2" />
                        Bias Detection Alert
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {generatedFeedback.biasFlags.map((flag: any, index: number) => (
                        <div key={index} className="flex items-start space-x-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                          <Badge variant="outline" className="text-yellow-700 dark:text-yellow-300">
                            {flag.severity}
                          </Badge>
                          <div>
                            <p className="font-medium text-yellow-800 dark:text-yellow-200">{flag.type}</p>
                            <p className="text-sm text-yellow-700 dark:text-yellow-300">{flag.description}</p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Key Insights */}
                <Card className="animate-fade-in">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Star className="w-5 h-5 mr-2 text-blue-600" />
                      Key Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {generatedFeedback.keyInsights.map((insight: string, index: number) => (
                        <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-start">
                          <Star className="w-3 h-3 text-blue-500 mt-1 mr-2 flex-shrink-0" />
                          {insight}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex space-x-3">
                  <Button className="flex-1">Save Feedback</Button>
                  <Button variant="outline">Export Report</Button>
                  <Button variant="outline">Share with Team</Button>
                </div>
              </div>
            ) : (
              <Card className="h-96 flex items-center justify-center">
                <CardContent className="text-center">
                  <Brain className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Ready to Generate Feedback
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Fill in the interview details and notes to get AI-powered structured feedback with bias detection.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewFeedback;