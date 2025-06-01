import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Shield, AlertTriangle, CheckCircle, XCircle, TrendingUp, FileText, Download } from "lucide-react";

interface BiasDetection {
  category: string;
  biasedText: string;
  explanation: string;
  suggestion: string;
  confidence: number;
  _id: string;
}

interface BiasReportData {
  originalText: string;
  contentType: string;
  detections: BiasDetection[];
  overallRiskLevel: string;
  improvedText: string;
  aiModel: string;
  _id: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface BiasReportDisplayProps {
  report: BiasReportData;
  onExport?: () => void;
  onReAnalyze?: () => void;
}

const BiasReportDisplay = ({ report, onExport, onReAnalyze }: BiasReportDisplayProps) => {
  const getRiskColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case "high":
        return "text-red-600";
      case "medium":
        return "text-yellow-600";
      case "low":
        return "text-green-600";
      default:
        return "text-gray-600";
    }
  };

  const getRiskBadgeColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case "high":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getSeverityIcon = (confidence: number) => {
    if (confidence >= 0.8) {
      return <XCircle className="w-4 h-4 text-red-600" />;
    } else if (confidence >= 0.6) {
      return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    } else {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    }
  };

  const getSeverityLabel = (confidence: number) => {
    if (confidence >= 0.8) return "High";
    if (confidence >= 0.6) return "Medium";
    return "Low";
  };

  const getRiskScore = (riskLevel: string) => {
    switch (riskLevel.toLowerCase()) {
      case "high":
        return 85;
      case "medium":
        return 65;
      case "low":
        return 30;
      default:
        return 50;
    }
  };

  const riskScore = getRiskScore(report.overallRiskLevel);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Overall Risk Assessment */}
      <Card className={`border-2 ${
        report.overallRiskLevel.toLowerCase() === 'high' ? 'border-red-200 dark:border-red-800' :
        report.overallRiskLevel.toLowerCase() === 'medium' ? 'border-yellow-200 dark:border-yellow-800' :
        'border-green-200 dark:border-green-800'
      }`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              Bias Analysis Report
            </CardTitle>
            <Badge className={getRiskBadgeColor(report.overallRiskLevel)}>
              {report.overallRiskLevel.charAt(0).toUpperCase() + report.overallRiskLevel.slice(1)} Risk
            </Badge>
          </div>
          <CardDescription>Context: {report.contentType.replace('_', ' ').toUpperCase()}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-2">
                <span>Risk Score</span>
                <span className={getRiskColor(report.overallRiskLevel)}>
                  {riskScore}/100
                </span>
              </div>
              <Progress value={riskScore} className="w-full" />
            </div>
            <div className="text-center">
              <div className={`text-3xl font-bold ${getRiskColor(report.overallRiskLevel)}`}>
                {riskScore}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Score</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Original Text */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Original Text
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <p className="text-sm text-gray-700 dark:text-gray-300 italic">
              "{report.originalText}"
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Detected Biases */}
      {report.detections && report.detections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-red-700 dark:text-red-300">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Detected Potential Biases ({report.detections.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {report.detections.map((detection, index) => (
              <div key={detection._id || index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    {getSeverityIcon(detection.confidence)}
                    <h4 className="font-medium text-gray-900 dark:text-white capitalize">
                      {detection.category} Bias
                    </h4>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className={
                      detection.confidence >= 0.8 ? 'text-red-600 border-red-300' :
                      detection.confidence >= 0.6 ? 'text-yellow-600 border-yellow-300' :
                      'text-green-600 border-green-300'
                    }>
                      {getSeverityLabel(detection.confidence)}
                    </Badge>
                    <Badge variant="outline" className="text-blue-600 border-blue-300">
                      {Math.round(detection.confidence * 100)}% confidence
                    </Badge>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {detection.explanation}
                </p>

                <div className="mb-3">
                  <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Problematic text:</h5>
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2">
                    <span className="text-sm text-red-700 dark:text-red-300 italic">
                      "{detection.biasedText}"
                    </span>
                  </div>
                </div>

                <div>
                  <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Suggested improvement:</h5>
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-2">
                    <span className="text-sm text-green-700 dark:text-green-300">
                      "{detection.suggestion}"
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Improved Text */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
            Improved Text
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-sm text-green-700 dark:text-green-300">
              "{report.improvedText}"
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={onReAnalyze} variant="outline">
          <Shield className="w-4 h-4 mr-2" />
          Re-analyze Text
        </Button>
        <Button onClick={onExport} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
        <Button variant="outline">
          <FileText className="w-4 h-4 mr-2" />
          Save to Records
        </Button>
      </div>
    </div>
  );
};

export default BiasReportDisplay;
