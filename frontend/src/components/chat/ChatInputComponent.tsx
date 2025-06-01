import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Brain, MessageSquare, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChatInputComponentProps {
  onSummarize: (chatText: string) => void;
  isProcessing?: boolean;
}

const ChatInputComponent = ({ onSummarize, isProcessing = false }: ChatInputComponentProps) => {
  const [chatText, setChatText] = useState("");
  const { toast } = useToast();
  const prevProcessing = useRef(isProcessing);

  const MAX_CHARS = 5000;
  const charCount = chatText.length;
  const isOverLimit = charCount > MAX_CHARS;

  // Clear input after summary is generated (when isProcessing goes from true to false)
  useEffect(() => {
    if (prevProcessing.current && !isProcessing) {
      setChatText("");
    }
    prevProcessing.current = isProcessing;
  }, [isProcessing]);

  const handleSubmit = () => {
    if (!chatText.trim()) {
      toast({
        title: "Error",
        description: "Please enter some chat text to summarize",
        variant: "destructive",
      });
      return;
    }

    if (isOverLimit) {
      toast({
        title: "Error",
        description: `Text is too long. Please keep it under ${MAX_CHARS} characters.`,
        variant: "destructive",
      });
      return;
    }
    console.log("Submitting chat text:", chatText);
    onSummarize(chatText);
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center">
          <MessageSquare className="w-5 h-5 mr-2" />
          Chat Text Input
        </CardTitle>
        <CardDescription>
          Paste interview chat transcripts or conversation logs for AI summarization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="chat-text">Chat Transcript *</Label>
          <Textarea
            id="chat-text"
            placeholder="Paste your chat transcript, interview conversation, or meeting notes here..."
            className="h-48 resize-none"
            value={chatText}
            onChange={(e) => setChatText(e.target.value)}
          />
          <div className="flex justify-between items-center mt-2">
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <AlertCircle className="w-4 h-4" />
              <span>Include timestamps, participant names, and full conversation context</span>
            </div>
            <span className={`text-sm ${isOverLimit ? 'text-red-500' : 'text-gray-500'}`}>
              {charCount}/{MAX_CHARS}
            </span>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">💡 Tips for better summaries:</h4>
          <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
            <li>• Include participant names and roles</li>
            <li>• Keep timestamps if available</li>
            <li>• Include complete conversation context</li>
            <li>• Remove any sensitive personal information</li>
          </ul>
        </div>

        <Button 
          onClick={handleSubmit} 
          className="w-full"
          disabled={isProcessing || !chatText.trim() || isOverLimit}
        >
          {isProcessing ? (
            <>
              <Brain className="w-4 h-4 mr-2 animate-spin" />
              Generating Summary...
            </>
          ) : (
            <>
              <Brain className="w-4 h-4 mr-2" />
              Generate AI Summary
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ChatInputComponent;