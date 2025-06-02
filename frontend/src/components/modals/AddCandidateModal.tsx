
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, User, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppDispatch, useAppSelector } from "@/hooks/reduxHooks";
import { addApplicant, uploadResumeApplicant } from "@/slices/applicantsSlice";

interface AddCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddCandidateModal = ({ isOpen, onClose }: AddCandidateModalProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    positionAppliedFor: "",
    yearsOfExperience: "",
    location: "",
    skills: "",
    additionalNote: ""
  });
  const [activeTab, setActiveTab] = useState("upload");
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => state.applicants);
  const { user } = useAppSelector((state) => state.auth); // Get the logged-in user from auth state

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === "application/pdf" || file.type.includes("document")) {
        setSelectedFile(file);
        toast({
          title: "Resume uploaded",
          description: `${file.name} has been selected for processing`,
        });
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF or document file",
          variant: "destructive",
        });
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };
  
  const handleSelectChange = (value: string, field: string) => {
    setFormData({
      ...formData,
      [field]: value
    });
  };

  const handleSubmit = async () => {
    if (activeTab === "upload" && selectedFile) {
      // Handle resume upload submission
      const formData = new FormData();
      formData.append('resume', selectedFile);
      
      // Add recruiter ID to the form data
      if (user?.id) {
        formData.append('recruiterId', user.id);
      } else {
        toast({
          title: "Error",
          description: "You must be logged in to add a candidate",
          variant: "destructive",
        });
        return;
      }
      
      dispatch(uploadResumeApplicant(formData))
        .unwrap()
        .then(() => {
          toast({
            title: "Resume submitted",
            description: "Candidate has been added to the system",
          });
          onClose();
        })
        .catch((err) => {
          toast({
            title: "Error",
            description: err || "Failed to upload resume",
            variant: "destructive",
          });
        });
    } else if (activeTab === "manual") {
      // Handle manual form submission
      if (!formData.fullName || !formData.email || !formData.positionAppliedFor) {
        toast({
          title: "Missing information",
          description: "Please fill in name, email, and position",
          variant: "destructive",
        });
        return;
      }
      
      // Convert skills string to array
      const skillsArray = formData.skills.split(',').map(skill => skill.trim()).filter(Boolean);
      
      // Convert years of experience to number if possible
      let yearsOfExperience;
      if (formData.yearsOfExperience) {
        if (formData.yearsOfExperience === "0-1") yearsOfExperience = 1;
        else if (formData.yearsOfExperience === "2-3") yearsOfExperience = 3;
        else if (formData.yearsOfExperience === "4-5") yearsOfExperience = 5;
        else if (formData.yearsOfExperience === "6-10") yearsOfExperience = 10;
        else if (formData.yearsOfExperience === "10+") yearsOfExperience = 15;
      }
      
      // Check if user is logged in
      if (!user?.id) {
        toast({
          title: "Error",
          description: "You must be logged in to add a candidate",
          variant: "destructive",
        });
        return;
      }

      const applicantData = {
        ...formData,
        skills: skillsArray,
        yearsOfExperience: yearsOfExperience,
        status: "new",
        recruiterId: user.id // Add the recruiter ID from the auth state
      };
      
      dispatch(addApplicant(applicantData))
        .unwrap()
        .then(() => {
          toast({
            title: "Candidate added",
            description: "New candidate has been added to the system",
          });
          onClose();
        })
        .catch((err) => {
          toast({
            title: "Error",
            description: err || "Failed to add candidate",
            variant: "destructive",
          });
        });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Candidate</DialogTitle>
          <DialogDescription>
            Upload a resume for automatic processing or enter candidate details manually
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="upload" className="w-full" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload Resume</TabsTrigger>
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <div className="space-y-2">
                <p className="text-lg font-medium">Upload Resume</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Support for PDF, DOC, and DOCX files
                </p>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="resume-upload"
                />
                <Label htmlFor="resume-upload" className="cursor-pointer">
                  <Button 
                    variant="outline" 
                    className="cursor-pointer"
                    type="button"
                    onClick={() => document.getElementById('resume-upload')?.click()}
                  >
                    Choose File
                  </Button>
                </Label>
                {selectedFile && (
                  <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center justify-center space-x-2">
                      <FileText className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-700 dark:text-green-300">
                        {selectedFile.name}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">
                📄 AI Resume Processing
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-300">
                Our AI will automatically extract candidate information, skills, experience, and generate a match score for open positions.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  placeholder="+1 (555) 123-4567"
                  value={formData.phone}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="positionAppliedFor">Position Applied For *</Label>
                <Input
                  id="positionAppliedFor"
                  name="positionAppliedFor"
                  placeholder="Software Engineer"
                  value={formData.positionAppliedFor}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="experience">Years of Experience</Label>
                <Select onValueChange={(value) => handleSelectChange(value, "yearsOfExperience")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select experience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0-1">0-1 years</SelectItem>
                    <SelectItem value="2-3">2-3 years</SelectItem>
                    <SelectItem value="4-5">4-5 years</SelectItem>
                    <SelectItem value="6-10">6-10 years</SelectItem>
                    <SelectItem value="10+">10+ years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  name="location"
                  placeholder="San Francisco, CA"
                  value={formData.location}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="skills">Skills</Label>
              <Input
                id="skills"
                name="skills"
                placeholder="React, TypeScript, Node.js (comma separated)"
                value={formData.skills}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <Label htmlFor="additionalNote">Additional Notes</Label>
              <Textarea
                id="additionalNote"
                name="additionalNote"
                placeholder="Any additional information about the candidate..."
                className="h-24"
                value={formData.additionalNote}
                onChange={handleInputChange}
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex space-x-3 pt-4">
          <Button onClick={handleSubmit} className="flex-1" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <User className="w-4 h-4 mr-2" />
                Add Candidate
              </>
            )}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddCandidateModal;