import { useState, useRef, useEffect } from "react";
import Navigation from "@/components/navigation";
import BulkResumeUpload, { BulkResumeUploadRef } from "@/components/resume/BulkResumeUpload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useAppDispatch, useAppSelector } from "../hooks/reduxHooks";
import { Badge } from "@/components/ui/badge";
import { Brain, Upload, FileText, TrendingUp, Star, Mail, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { uploadResume, bulkUploadResumes } from '@/services/resumeService';
import { bulkUploadResumesThunk } from "../slices/aiResultsSlice";

const ResumeMatching = () => {
  const [uploadMode, setUploadMode] = useState("bulk");
  const [jobMode, setJobMode] = useState("existing");
  const [selectedJob, setSelectedJob] = useState("");
  const [newJobTitle, setNewJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [isMatching, setIsMatching] = useState(false);
  const [matchResults, setMatchResults] = useState<any[]>([]);
  const [processedResumes, setProcessedResumes] = useState<File[]>([]);
  const [singleResumeUploaded, setSingleResumeUploaded] = useState(false);
  const [singleResumeFile, setSingleResumeFile] = useState<File | null>(null);
  const { jobs, loading, error } = useAppSelector((state) => state.jobs);
  const { loading: aiLoading } = useAppSelector((state) => state.aiResults);
  const [bulkUploadComplete, setBulkUploadComplete] = useState(false);
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const bulkResumeComponentRef = useRef<BulkResumeUploadRef>(null);
  const dispatch = useAppDispatch();
console.log("newJobTitle",  newJobTitle, jobDescription)

  // Add a useEffect to update job description when a job is selected
  useEffect(() => {
    if (jobMode === "existing" && selectedJob) {
      const job = jobs.find(j => j.title === selectedJob);
      if (job) {
        setJobDescription(job.description);
      }
    }
  }, [selectedJob, jobMode, jobs]);

  const handleMatch = async () => {
    const jobTitle = jobMode === "existing" ? selectedJob : newJobTitle;
    if (!jobTitle || !jobDescription) {
      toast({
        title: "Error",
        description: "Please provide a job title and job description",
        variant: "destructive",
      });
      return;
    }
    
    // For bulk mode, check if files are selected but not yet uploaded
    if (uploadMode === "bulk" && !bulkUploadComplete && bulkResumeComponentRef.current?.getSelectedFiles()?.length > 0) {
      // Files are selected but not uploaded, so handle the upload first
      setIsMatching(true);
      
      try {
        // Get selected files from the BulkResumeUpload component
        const selectedFiles = bulkResumeComponentRef.current.getSelectedFiles();
        
        // Use the bulk upload service directly
        const response = await bulkUploadResumes({
          resumeFiles: selectedFiles,
          jobMode,
          jobId: jobMode === 'existing' ? jobs.find(j => j.title === selectedJob)?._id : undefined,
          title: jobMode === 'new' ? newJobTitle : undefined,
          description: jobDescription
        });
        console.log("response: ", response)
        // Store the processed files
        setProcessedResumes(selectedFiles);
        setBulkUploadComplete(true);
        
        // Update match results if available
        if (response.matchResults && response.matchResults.length > 0) {
          setMatchResults(response.matchResults);
          toast({
            title: "Upload and matching complete",
            description: `${selectedFiles.length} resumes processed and matched successfully`,
          });
        } else {
          toast({
            title: "Upload complete",
            description: `${selectedFiles.length} resumes uploaded successfully`,
          });
        }
      } catch (error: any) {
        toast({
          title: "Upload failed",
          description: error.message || "There was an error uploading your resumes",
          variant: "destructive",
        });
      } finally {
        setIsMatching(false);
      }
      return;
    }
    
    // Check if resumes are uploaded before proceeding with matching
    if (!isUploadComplete()) {
      toast({
        title: "Error",
        description: "Please upload resume(s) before starting AI matching",
        variant: "destructive",
      });
      return;
    }
    
    setIsMatching(true);
    
    try {
      if (uploadMode === "single" && singleResumeFile) {
        // Handle single resume upload and matching
        const res = await uploadResume({
          resumeFile: singleResumeFile,
          jobMode,
          jobId: jobMode === 'existing' ? jobs.find(j => j.title === selectedJob)?._id : undefined,
          title: jobMode === 'new' ? newJobTitle : undefined,
          description: jobDescription
        });
        
        setMatchResults(res.matchResults || []);
        toast({
          title: "Resume uploaded and matched",
          description: `${singleResumeFile.name} uploaded and matched successfully`,
        });
      } else if (uploadMode === "bulk" && processedResumes.length > 0) {
        // Dispatch the bulk upload thunk with the already processed resumes
        const result = await dispatch(bulkUploadResumesThunk({
          resumeFiles: processedResumes,
          jobMode,
          jobId: jobMode === 'existing' ? jobs.find(j => j.title === selectedJob)?._id : undefined,
          title: jobMode === 'new' ? newJobTitle : undefined,
          description: jobDescription
        })).unwrap();
        
        // Update the match results
        if (result.matchResults && result.matchResults.length > 0) {
          setMatchResults(result.matchResults);
          toast({
            title: "Matching complete",
            description: `Found ${result.matchResults.length} candidates ranked by fit score`,
          });
        } else {
          toast({
            title: "Processing complete",
            description: "Resumes were processed but no matches were found",
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "Matching failed",
        description: error.message || "There was an error processing your resumes",
        variant: "destructive",
      });
    } finally {
      setIsMatching(false);
    }
  };

  const handleBulkResumeUploadComplete = (results: any[]) => {
    // Set the bulk upload complete flag
    setBulkUploadComplete(true);
    
    // If there are match results already, update the UI
    if (results && results.length > 0) {
      // Store the processed files for later matching
      setProcessedResumes(results.map(r => r.file).filter(Boolean));
      
      // Update match results if available
      const matchResults = results.flatMap(r => r.matchResults || []);
      if (matchResults.length > 0) {
        setMatchResults(matchResults);
      }
      
      toast({
        title: "Resumes uploaded",
        description: `${results.length} resumes uploaded successfully. Click 'Start AI Matching' to analyze.`,
      });
    }
  };

  const handleSingleResumeUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validTypes = ['.pdf', '.doc', '.docx'];
      const isValid = validTypes.some(type => file.name.toLowerCase().endsWith(type.slice(1)));
      if (!isValid) {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF, DOC, or DOCX file",
          variant: "destructive",
        });
        setSingleResumeFile(null);
        setSingleResumeUploaded(false);
        return;
      }
      setSingleResumeFile(file);
      setSingleResumeUploaded(true);
      toast({
        title: "Resume selected",
        description: `${file.name} selected successfully`,
      });
    }
  };

  const isUploadComplete = () => {
    // For bulk mode, check either if upload is complete OR if files are selected
    if (uploadMode === "bulk") {
      return bulkUploadComplete || (bulkResumeComponentRef.current?.getSelectedFiles()?.length > 0);
    }
    // For single mode, check if a file is selected
    return !!singleResumeFile;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 80) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 90) return "default";
    if (score >= 80) return "secondary";
    return "outline";
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
              AI Resume Matching
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Upload resumes and find the best matches for your open positions</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Upload Mode Selection */}
          <div className="lg:col-span-2">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Upload Mode</CardTitle>
                <CardDescription>Choose how you want to upload resumes</CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup value={uploadMode} onValueChange={setUploadMode} className="flex space-x-6">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="bulk" id="bulk" />
                    <Label htmlFor="bulk">Bulk Upload</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="single" id="single" />
                    <Label htmlFor="single">Single Upload</Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          </div>

          {/* Conditional Upload Component */}
          {uploadMode === "bulk" && (
            <BulkResumeUpload 
              onUploadComplete={handleBulkResumeUploadComplete} 
              jobMode={jobMode}
              jobId={jobMode === 'existing' ? jobs.find(j => j.title === selectedJob)?._id : undefined}
              title={jobMode === 'new' ? newJobTitle : undefined}
              description={jobDescription}
              ref={bulkResumeComponentRef}
            />
          )}
          
          {/* Input Section */}
          <div className={uploadMode === "single" ? "lg:col-span-2" : "lg:col-span-1"}>
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Job & Resumes
                </CardTitle>
                <CardDescription>
                  Configure job details and upload candidate resumes for AI matching
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Job Mode Selection */}
                <div>
                  <Label>Job Selection Mode</Label>
                  <RadioGroup value={jobMode} onValueChange={setJobMode} className="flex space-x-6 mt-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="existing" id="existing" />
                      <Label htmlFor="existing">Select Existing Job</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="new" id="new" />
                      <Label htmlFor="new">Enter New Job</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Job Selection/Input */}
                {jobMode === "existing" ? (
                  <div>
                    <Label htmlFor="job-select">Select Job Posting</Label>
                    <Select value={selectedJob} onValueChange={setSelectedJob}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a job..." />
                      </SelectTrigger>
                      <SelectContent>
                        {jobs.map((job) => (
                          <SelectItem key={job._id} value={job.title}>
                            {job.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="new-job-title">Job Title</Label>
                    <Input
                      id="new-job-title"
                      placeholder="Enter job title..."
                      value={newJobTitle}
                      onChange={(e) => setNewJobTitle(e.target.value)}
                    />
                  </div>
                )}

                {/* Job Description */}
                <div>
                  <Label htmlFor="job-description">Job Description</Label>
                  <Textarea
                    id="job-description"
                    placeholder="Paste the complete job description here..."
                    className="h-32"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                  />
                </div>

                {/* Single Resume Upload (only shown when single mode is selected) */}
                {uploadMode === "single" && (
                  <div>
                    <Label>Upload Resume</Label>
                    <div
                      className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
                      onClick={() => inputRef.current && inputRef.current.click()}
                    >
                      <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Drop PDF/DOC file here or click to browse
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Supports: PDF, DOC, DOCX (Max 10MB)
                      </p>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleSingleResumeUpload}
                        className="hidden"
                        id="single-resume-upload"
                        ref={inputRef}
                      />
                      <Button 
                        variant="outline" 
                        className="mt-2 cursor-pointer" 
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          inputRef.current && inputRef.current.click();
                        }}
                      >
                        Choose File
                      </Button>
                      {singleResumeFile && (
                        <p className="text-green-600 text-sm mt-2">✓ {singleResumeFile.name} selected</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Match Button */}
                <Button 
                  onClick={handleMatch} 
                  className="w-full"
                  disabled={isMatching || !isUploadComplete()}
                >
                  {isMatching ? (
                    <>
                      <Brain className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing Candidates...
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4 mr-2" />
                      Start AI Matching
                    </>
                  )}
                </Button>

                {isMatching && (
                  <div className="space-y-2">
                    <Progress value={75} className="w-full" />
                    <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                      Processing resumes with AI...
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Results Section */}
          <div className="lg:col-span-2">
            {matchResults.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Match Results
                  </h2>
                  <Badge variant="outline" className="text-sm">
                    {matchResults.length} candidates analyzed
                  </Badge>
                </div>

                {matchResults.map((candidate, index) => (
                  <Card key={candidate.id} className="hover:shadow-lg transition-shadow animate-fade-in">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                              {candidate.name}
                            </h3>
                            <Badge 
                              variant={getScoreBadgeVariant(candidate.overallScore)}
                              className={`text-sm ${getScoreColor(candidate.overallScore)}`}
                            >
                              {candidate.overallScore}% Match
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                            <span className="flex items-center">
                              <Mail className="w-4 h-4 mr-1" />
                              {candidate.email}
                            </span>
                            <span className="flex items-center">
                              <Phone className="w-4 h-4 mr-1" />
                              {candidate.phone}
                            </span>
                            <span>🎯 {candidate.experience}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-3xl font-bold ${getScoreColor(candidate.score)} mb-1`}>
                            {candidate.score}%
                          </div>
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < Math.floor(candidate.score / 20)
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white mb-2">Skills Match</h4>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {candidate.skills.map((skill, skillIndex) => (
                              <Badge key={skillIndex} variant="secondary">{skill}</Badge>
                            ))}
                          </div>

                          <h4 className="font-medium text-gray-900 dark:text-white mb-2">Strengths</h4>
                          <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                            {candidate.strengths.map((strength, strengthIndex) => (
                              <li key={strengthIndex} className="flex items-center">
                                <TrendingUp className="w-3 h-3 text-green-600 mr-2" />
                                {strength}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white mb-2">Areas of Concern</h4>
                          <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400 mb-4">
                            {candidate.concerns.map((concern, concernIndex) => (
                              <li key={concernIndex} className="flex items-center">
                                <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                                {concern}
                              </li>
                            ))}
                          </ul>

                          <h4 className="font-medium text-gray-900 dark:text-white mb-2">AI Summary</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {candidate.summary}
                          </p>
                        </div>
                      </div>

                      <div className="flex space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <Button size="sm">Schedule Interview</Button>
                        <Button variant="outline" size="sm">View Full Resume</Button>
                        <Button variant="outline" size="sm">Add Notes</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="h-96 flex items-center justify-center">
                <CardContent className="text-center">
                  <Brain className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Ready for AI Matching
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Select upload mode, configure job details, and upload resumes to get started with AI-powered candidate ranking.
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

export default ResumeMatching;