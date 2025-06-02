
import { useState, useEffect } from "react";
import Navigation from "@/components/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, MessageSquare, Shield } from "lucide-react";
import ChatInputComponent from "@/components/chat/ChatInputComponent";
import ChatSummaryDisplay from "@/components/chat/ChatSummaryDisplay";
import BiasCheckComponent from "@/components/bias/BiasCheckComponent";
import BiasReportDisplay from "@/components/bias/BiasReportDisplay";
import { useToast } from "@/hooks/use-toast";
import { useAppDispatch, useAppSelector } from "../hooks/reduxHooks";
import { 
  summarizeChatConversation, 
  clearCurrentChatSummary, 
  clearCurrentBiasDetection,
  clearAiError
} from "../slices/aiResultsSlice";

const AIAssistant = () => {
  const [chatMessages, setChatMessages] = useState<string[]>([]);
  const { toast } = useToast();
  
  const dispatch = useAppDispatch();
  const { 
    currentChatSummary, 
    currentBiasDetection,
    loading, 
    error 
  } = useAppSelector((state) => state.aiResults);

  // Handle errors
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
      dispatch(clearAiError());
    }
  }, [error, toast, dispatch]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      dispatch(clearCurrentChatSummary());
      dispatch(clearCurrentBiasDetection());
    };
  }, [dispatch]);

  const handleChatSummarization = (chatText: string) => {
    if (!chatText.trim()) {
      toast({
        title: "No messages to summarize",
        description: "Please add some chat messages first",
        variant: "destructive",
      });
      return;
    }

    dispatch(summarizeChatConversation({
      chatText,
      applicantId: undefined // Optional parameter, not used in this context
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
              <Brain className="w-8 h-8 mr-3 text-blue-600" />
              Bias Assistant
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Bias detection summarization tool</p>
          </div>
        </div>

        <Tabs defaultValue="bias-detection" className="space-y-6">
          <TabsList className="grid w-full grid-cols-1">
            {/* <TabsTrigger value="chat-summary" className="flex items-center">
              <MessageSquare className="w-4 h-4 mr-2" />
              Chat Summarization
            </TabsTrigger> */}
            <TabsTrigger value="bias-detection" className="flex items-center">
              <Shield className="w-4 h-4 mr-2" />
              Bias Detection
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat-summary" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-8">
              <div>
                <ChatInputComponent 
                  onSummarize={handleChatSummarization}
                  isProcessing={loading}
                />
              </div>
              <div>
                {currentChatSummary ? (
                  <ChatSummaryDisplay 
                  // @ts-ignore
                    summary={currentChatSummary}
                    onSave={(editedSummary) => {
                      // In a real implementation, we would dispatch an action to update the summary
                      // For now, we'll just show a toast
                      toast({
                        title: "Summary updated",
                        description: "Your changes have been saved",
                      });
                    }}
                  />
                ) : (
                  <Card className="h-96 flex items-center justify-center">
                    <CardContent className="text-center">
                      <MessageSquare className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        Ready for Chat Analysis
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        Paste your chat transcript to generate AI-powered summaries with key insights.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="bias-detection" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-8">
              <div>
                <BiasCheckComponent 
                  autoSuggestions={[
                    "Looking for digital natives who can keep up",
                    "Must be a culture fit with strong communication",
                    "Seeking recent graduates with fresh perspectives"
                  ]}
                />
              </div>
              <div>
                {currentBiasDetection ? (
                  <BiasReportDisplay 
                  // @ts-ignore
                    report={currentBiasDetection}
                    onExport={() => {
                      toast({
                        title: "Report exported",
                        description: "Bias analysis report has been downloaded",
                      });
                    }}
                    onReAnalyze={() => {
                      dispatch(clearCurrentBiasDetection());
                      toast({
                        title: "Ready for new analysis",
                        description: "Enter new text to analyze for bias",
                      });
                    }}
                  />
                ) : (
                  <Card className="h-96 flex items-center justify-center">
                    <CardContent className="text-center">
                      <Shield className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        Ready for Bias Analysis
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        Enter text to analyze for potential bias and get detailed recommendations.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AIAssistant;