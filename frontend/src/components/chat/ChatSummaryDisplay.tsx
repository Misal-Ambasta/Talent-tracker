
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageSquare, Edit, Save, X, Clock, Users, Target } from "lucide-react";
import { useState } from "react";

interface ChatSummary {
  overallSummary: string;
  keyPoints: string[];
  participants: string[];
  duration: string;
  sentiment: string;
  actionItems: string[];
  confidence: number;
}

interface ChatSummaryDisplayProps {
  summary: ChatSummary;
  onSave?: (editedSummary: ChatSummary) => void;
}

const ChatSummaryDisplay = ({ summary, onSave }: ChatSummaryDisplayProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedSummary, setEditedSummary] = useState(summary.overallSummary);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return "text-green-600";
    if (confidence >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 90) return "default";
    if (confidence >= 70) return "secondary";
    return "outline";
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case "positive":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "negative":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "neutral":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave({
        ...summary,
        overallSummary: editedSummary
      });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedSummary(summary.overallSummary);
    setIsEditing(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with confidence */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <MessageSquare className="w-5 h-5 mr-2" />
              Chat Summary
            </CardTitle>
            <Badge 
              variant={getConfidenceBadge(summary.confidence)}
              className={`${getConfidenceColor(summary.confidence)}`}
            >
              {summary.confidence}% Confidence
            </Badge>
          </div>
          <CardDescription>AI-generated summary with key insights and action items</CardDescription>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="font-medium">Duration</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.duration}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 mb-2">
              <Users className="w-4 h-4 text-green-600" />
              <span className="font-medium">Participants</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.participants.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 mb-2">
              <Target className="w-4 h-4 text-purple-600" />
              <span className="font-medium">Sentiment</span>
            </div>
            <Badge className={getSentimentColor(summary.sentiment)}>
              {summary.sentiment}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Main Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Overall Summary</CardTitle>
            {!isEditing ? (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit className="w-4 h-4 mr-1" />
                Edit
              </Button>
            ) : (
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={handleSave}>
                  <Save className="w-4 h-4 mr-1" />
                  Save
                </Button>
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div>
              <Label htmlFor="edit-summary">Edit Summary</Label>
              <Textarea
                id="edit-summary"
                value={editedSummary}
                onChange={(e) => setEditedSummary(e.target.value)}
                className="h-32"
              />
            </div>
          ) : (
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              {summary.overallSummary}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Key Points and Action Items */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Key Discussion Points</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {summary.keyPoints.map((point, index) => (
                <li key={index} className="flex items-start text-sm text-gray-600 dark:text-gray-400">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  {point}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Action Items</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {summary.actionItems.map((item, index) => (
                <li key={index} className="flex items-start text-sm text-gray-600 dark:text-gray-400">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Participants */}
      <Card>
        <CardHeader>
          <CardTitle>Participants</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {summary.participants.map((participant, index) => (
              <Badge key={index} variant="secondary">
                {participant}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChatSummaryDisplay;