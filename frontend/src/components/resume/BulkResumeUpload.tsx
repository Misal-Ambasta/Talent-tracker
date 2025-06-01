import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, X, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { uploadResume } from '@/services/resumeService';

interface BulkResumeUploadProps {
  onUploadComplete: (results: any[]) => void;
  jobMode: string;
  jobId?: string;
  title?: string;
  description?: string;
}

const BulkResumeUpload = ({ onUploadComplete, jobMode, jobId, title, description }: BulkResumeUploadProps) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const MAX_FILES = 10;
  const ACCEPTED_TYPES = ['.pdf', '.doc', '.docx'];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (selectedFiles.length + files.length > MAX_FILES) {
      toast({
        title: "Too many files",
        description: `You can only upload a maximum of ${MAX_FILES} resumes`,
        variant: "destructive",
      });
      return;
    }

    const validFiles = files.filter(file => {
      const isValid = ACCEPTED_TYPES.some(type => file.name.toLowerCase().endsWith(type.slice(1)));
      if (!isValid) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a supported format`,
          variant: "destructive",
        });
      }
      return isValid;
    });

    setSelectedFiles(prev => [...prev, ...validFiles]);
    
    if (validFiles.length > 0) {
      toast({
        title: "Files added",
        description: `${validFiles.length} resume(s) added for processing`,
      });
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one resume to upload",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const results: any[] = [];
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      try {
        const res = await uploadResume({
          resumeFile: file,
          jobMode,
          jobId,
          title,
          description
        });
        results.push(res);
      } catch (err) {
        toast({
          title: "Upload error",
          description: `${file.name} failed to upload`,
          variant: "destructive",
        });
      }
      setUploadProgress(Math.round(((i + 1) / selectedFiles.length) * 100));
    }
    setIsUploading(false);
    onUploadComplete(results);
    toast({
      title: "Upload complete",
      description: `${selectedFiles.length} resumes processed successfully`,
    });
  };

  const clearAll = () => {
    setSelectedFiles([]);
    setUploadProgress(0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Upload className="w-5 h-5 mr-2" />
          Bulk Resume Upload
        </CardTitle>
        <CardDescription>
          Upload up to {MAX_FILES} resumes for AI-powered matching analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Area */}
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
          <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <div className="space-y-2">
            <p className="text-lg font-medium">Drop resumes here or click to upload</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Supports PDF, DOC, and DOCX files • Max {MAX_FILES} files
            </p>
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx"
              onChange={handleFileSelect}
              className="hidden"
              id="bulk-resume-upload"
              disabled={isUploading}
            />
            <label htmlFor="bulk-resume-upload">
              <Button variant="outline" className="cursor-pointer" disabled={isUploading}>
                Choose Files
              </Button>
            </label>
          </div>
        </div>

        {/* File List */}
        {selectedFiles.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Selected Resumes ({selectedFiles.length}/{MAX_FILES})</h4>
              <Button variant="ghost" size="sm" onClick={clearAll} disabled={isUploading}>
                Clear All
              </Button>
            </div>
            
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {uploadProgress === 100 && (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => removeFile(index)}
                      disabled={isUploading}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress */}
        {isUploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Processing resumes...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="w-full" />
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">
                🤖 AI Processing Features
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                <li>• Automatic skill extraction and categorization</li>
                <li>• Experience level assessment</li>
                <li>• Job matching with similarity scores</li>
                <li>• Bias-free candidate ranking</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Upload Button */}
        <Button 
          onClick={handleUpload} 
          className="w-full" 
          disabled={selectedFiles.length === 0 || isUploading}
          size="lg"
        >
          {isUploading ? (
            "Processing Resumes..."
          ) : (
            `Process ${selectedFiles.length} Resume${selectedFiles.length !== 1 ? 's' : ''}`
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default BulkResumeUpload;