
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, Brain, Eye, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppDispatch, useAppSelector } from "../../hooks/reduxHooks";
import { detectBiasInDocument, clearAiError } from "../../slices/aiResultsSlice";
import type { ContentType } from "../../services/biasService";

interface BiasCheckComponentProps {
  autoSuggestions?: string[];
}

const BiasCheckComponent = ({ autoSuggestions = [] }: BiasCheckComponentProps) => {
  const [textToCheck, setTextToCheck] = useState("");
  const [analysisContext, setAnalysisContext] = useState<ContentType>("job_description");
  const { toast } = useToast();
  
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => state.aiResults);

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

  const contextOptions = [
    { value: "job_description", label: "Job Description" },
    { value: "interview_question", label: "Interview Question" },
    { value: "feedback", label: "Interview Feedback" },
    { value: "other", label: "General Text" },
  ];

  const handleManualCheck = () => {
    if (!textToCheck.trim()) {
      toast({
        title: "Error",
        description: "Please enter some text to analyze for bias",
        variant: "destructive",
      });
      return;
    }

    dispatch(detectBiasInDocument({
      text: textToCheck,
      contentType: analysisContext
    }));
  };

  const applySuggestion = (suggestion: string) => {
    setTextToCheck(suggestion);
    toast({
      title: "Suggestion Applied",
      description: "The suggested text has been loaded for bias analysis",
    });
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Shield className="w-5 h-5 mr-2" />
          Bias Detection Analysis
        </CardTitle>
        <CardDescription>
          Analyze text for potential bias in hiring, feedback, or communication
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Context Selection */}
        <div>
          <Label htmlFor="context-select">Analysis Context</Label>
          <Select 
            value={analysisContext} 
            onValueChange={(value) => setAnalysisContext(value as ContentType)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select the context for better analysis..." />
            </SelectTrigger>
            <SelectContent>
              {contextOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Text Input */}
        <div>
          <Label htmlFor="bias-text">Text to Analyze *</Label>
          <Textarea
            id="bias-text"
            placeholder="Paste the text you want to analyze for potential bias (interview feedback, job descriptions, communication, etc.)..."
            className="h-32"
            value={textToCheck}
            onChange={(e) => setTextToCheck(e.target.value)}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Common bias areas: gender, age, race, education, experience level, cultural references
          </p>
        </div>

        {/* Auto Suggestions */}
        {autoSuggestions.length > 0 && (
          <div>
            <Label>💡 Auto-detected suggestions from recent content:</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {autoSuggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => applySuggestion(suggestion)}
                  className="text-xs"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Analyze: "{suggestion.substring(0, 30)}..."
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Bias Categories Info */}
        <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg">
          <h4 className="font-medium text-amber-900 dark:text-amber-200 mb-2 flex items-center">
            <AlertTriangle className="w-4 h-4 mr-1" />
            What we check for:
          </h4>
          <div className="grid grid-cols-2 gap-2 text-sm text-amber-800 dark:text-amber-300">
            <div className="flex items-center">
              <Badge variant="outline" className="mr-2 text-xs">Gender</Badge>
              Language patterns
            </div>
            <div className="flex items-center">
              <Badge variant="outline" className="mr-2 text-xs">Age</Badge>
              Generational references
            </div>
            <div className="flex items-center">
              <Badge variant="outline" className="mr-2 text-xs">Cultural</Badge>
              Background assumptions
            </div>
            <div className="flex items-center">
              <Badge variant="outline" className="mr-2 text-xs">Experience</Badge>
              Level requirements
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <Button 
            onClick={handleManualCheck} 
            className="flex-1"
            disabled={loading || !textToCheck.trim()}
          >
            {loading ? (
              <>
                <Brain className="w-4 h-4 mr-2 animate-spin" />
                Analyzing for Bias...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Run Bias Analysis
              </>
            )}
          </Button>
          <Button variant="outline">
            <Zap className="w-4 h-4 mr-2" />
            Quick Check
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BiasCheckComponent;