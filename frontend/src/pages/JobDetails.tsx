import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navigation from "@/components/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Users,
  Copy,
  Share,
  Calendar,
  Briefcase,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppDispatch, useAppSelector } from "../hooks/reduxHooks";
import { getJobById, editJob } from "../slices/jobsSlice";

const JobDetails = () => {
  const { _id } = useParams<{ _id: string }>();
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentJob, loading, error } = useAppSelector((state) => state.jobs);

  const [editedJob, setEditedJob] = useState({
    title: "",
    description: "",
    responsibilities: "",
    location: "",
    salary: { min: 0, max: 0, currency: "USD" },
    experienceLevel: "entry" as "entry" | "mid" | "senior" | "executive",
    status: "open" as "open" | "closed",
    skills: [],
    department: "",
    employmentType: "full-time" as
      | "full-time"
      | "part-time"
      | "contract"
      | "internship"
      | "temporary",
    postedDate: "",
    closingDate: "",
  });

  useEffect(() => {
    if (_id) {
      dispatch(getJobById(_id));
    }
  }, [_id, dispatch]);

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  useEffect(() => {
    if (currentJob) {
      setEditedJob({
        title: currentJob.title || "",
        description: currentJob.description || "",
        responsibilities: currentJob.responsibilities || "",
        location: currentJob.location || "",
        salary: currentJob.salary || { min: 0, max: 0, currency: "USD" },
        experienceLevel: currentJob.experienceLevel || "entry",
        status: currentJob.status || "open",
        skills: currentJob.skills || [],
        department: currentJob.department || "",
        employmentType: currentJob.employmentType || "full-time",
        postedDate: currentJob.postedDate || "",
        closingDate: currentJob.closingDate || "",
      });
    }
  }, [currentJob]);

  const handleSaveChanges = () => {
    if (!_id) return;

    dispatch(editJob({ _id, jobData: editedJob }))
      .unwrap()
      .then(() => {
        toast({
          title: "Job updated successfully",
          description: "The job posting has been updated.",
        });
        setIsEditing(false);
      })
      .catch((err) => {
        toast({
          title: "Error updating job",
          description: err.message || "Something went wrong",
          variant: "destructive",
        });
      });
  };

  const handleSkillsChange = (value: string) => {
    setEditedJob({
      ...editedJob,
      skills: value
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean),
    });
  };

  if (loading && !currentJob) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p>Loading job details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentJob) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p>Job not found</p>
            <Button className="mt-4" onClick={() => navigate("/jobs")}>
              Back to Jobs
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/jobs")}
            className="mr-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {isEditing ? (
                <Input
                  value={editedJob.title}
                  onChange={(e) =>
                    setEditedJob({ ...editedJob, title: e.target.value })
                  }
                  className="text-3xl font-bold h-auto py-1 text-gray-900 dark:text-white"
                />
              ) : (
                currentJob.title
              )}
            </h1>
          </div>
          {isEditing ? (
            <div className="flex space-x-3">
              <Button onClick={handleSaveChanges}>Save Changes</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setEditedJob({
                    title: currentJob.title || "",
                    description: currentJob.description || "",
                    responsibilities: currentJob.responsibilities || "",
                    location: currentJob.location || "",
                    salary: currentJob.salary || {
                      min: 0,
                      max: 0,
                      currency: "USD",
                    },
                    experienceLevel: currentJob.experienceLevel || "entry",
                    status: "open",
                    skills: currentJob.skills || [],
                    department: currentJob.department || "",
                    employmentType: currentJob.employmentType || "full-time",
                    postedDate: currentJob.postedDate || "",
                    closingDate: currentJob.closingDate || "",
                  });
                }}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button onClick={() => setIsEditing(true)}>Edit Job</Button>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Job Information */}
            <Card>
              <CardHeader>
                <CardTitle>Job Information</CardTitle>
                <CardDescription>Details about the position</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label>Location</Label>
                    {isEditing ? (
                      <Input
                        value={editedJob.location}
                        onChange={(e) =>
                          setEditedJob({
                            ...editedJob,
                            location: e.target.value,
                          })
                        }
                        className="mt-1"
                      />
                    ) : (
                      <p className="text-gray-700 dark:text-gray-300 mt-1">
                        {currentJob.location}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Salary Range</Label>
                    {isEditing ? (
                      <div className="flex items-center space-x-2 mt-1">
                        <span>$</span>
                        <Input
                          type="number"
                          value={editedJob.salary.min}
                          onChange={(e) =>
                            setEditedJob({
                              ...editedJob,
                              salary: {
                                ...editedJob.salary,
                                min: parseInt(e.target.value) || 0,
                              },
                            })
                          }
                          className="w-24"
                        />
                        <span>-</span>
                        <span>$</span>
                        <Input
                          type="number"
                          value={editedJob.salary.max}
                          onChange={(e) =>
                            setEditedJob({
                              ...editedJob,
                              salary: {
                                ...editedJob.salary,
                                max: parseInt(e.target.value) || 0,
                              },
                            })
                          }
                          className="w-24"
                        />
                      </div>
                    ) : (
                      <p className="text-gray-700 dark:text-gray-300 mt-1">
                        ${currentJob.salary?.min?.toLocaleString()} - $
                        {currentJob.salary?.max?.toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Experience Level</Label>
                    {isEditing ? (
                      <Select
                        value={editedJob.experienceLevel}
                        onValueChange={(value) =>
                          setEditedJob({
                            ...editedJob,
                            experienceLevel: value as
                              | "entry"
                              | "mid"
                              | "senior"
                              | "executive",
                          })
                        }>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select experience level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="entry">Entry Level</SelectItem>
                          <SelectItem value="mid">Mid-Level</SelectItem>
                          <SelectItem value="senior">Senior</SelectItem>
                          <SelectItem value="executive">Executive</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-gray-700 dark:text-gray-300 mt-1 capitalize">
                        {currentJob.experienceLevel}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Status</Label>
                    {isEditing ? (
                      <Select
                        value={editedJob.status}
                        onValueChange={(value) =>
                          setEditedJob({
                            ...editedJob,
                            status: value as "open" | "closed",
                          })
                        }>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge
                        variant={
                          currentJob.status === "open" ? "default" : "secondary"
                        }
                        className="mt-1 ml-3">
                        {currentJob.status === "open" ? "Active" : "Closed"}
                      </Badge>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Description</Label>
                  {isEditing ? (
                    <Textarea
                      value={editedJob.description}
                      onChange={(e) =>
                        setEditedJob({
                          ...editedJob,
                          description: e.target.value,
                        })
                      }
                      className="mt-1 min-h-32"
                    />
                  ) : (
                    <p className="text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-line">
                      {currentJob.description}
                    </p>
                  )}
                </div>

                <div>
                  <Label>Responsibilities</Label>
                  {isEditing ? (
                    <Textarea
                      value={editedJob.responsibilities}
                      onChange={(e) =>
                        setEditedJob({
                          ...editedJob,
                          responsibilities: e.target.value,
                        })
                      }
                      className="mt-1 min-h-32"
                    />
                  ) : (
                    <p className="text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-line">
                      {currentJob.responsibilities}
                    </p>
                  )}
                </div>

                <div>
                  <Label>Required Skills</Label>
                  {isEditing ? (
                    <Textarea
                      value={editedJob.skills.join(", ")}
                      onChange={(e) => handleSkillsChange(e.target.value)}
                      className="mt-1"
                      placeholder="Enter skills separated by commas"
                    />
                  ) : (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {currentJob.skills && currentJob.skills.length > 0 ? (
                        currentJob.skills.map((skill, index) => (
                          <Badge key={index} variant="outline">
                            {skill}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">
                          No specific skills listed
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Job Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Job Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Applicants
                  </span>
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-1 text-gray-500" />
                    <span className="font-medium">
                      {currentJob.applicantCount || 0}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Posted Date
                  </span>
                  <span className="font-medium">
                    {new Date(currentJob.postedDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Closing Date
                  </span>
                  <span className="font-medium">
                    {currentJob.closingDate
                      ? new Date(currentJob.closingDate).toLocaleDateString()
                      : "Open until filled"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Additional Information */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Department</Label>
                  {isEditing ? (
                    <Input
                      value={editedJob.department}
                      onChange={(e) =>
                        setEditedJob({
                          ...editedJob,
                          department: e.target.value,
                        })
                      }
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-gray-700 dark:text-gray-300 mt-1">
                      {currentJob.department || "Not specified"}
                    </p>
                  )}
                </div>
                <div>
                  <Label>Employment Type</Label>
                  {isEditing ? (
                    <Select
                      value={editedJob.employmentType}
                      onValueChange={(value) =>
                        setEditedJob({
                          ...editedJob,
                          employmentType: value as
                            | "full-time"
                            | "part-time"
                            | "contract"
                            | "internship"
                            | "temporary",
                        })
                      }>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select employment type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full-time">Full-time</SelectItem>
                        <SelectItem value="part-time">Part-time</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                        <SelectItem value="temporary">Temporary</SelectItem>
                        <SelectItem value="internship">Internship</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-gray-700 dark:text-gray-300 mt-1 capitalize">
                      {currentJob.employmentType?.replace("-", " ") ||
                        "Not specified"}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            {!isEditing && (
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() =>
                      navigate(`/applicants?jobId=${currentJob._id}`)
                    }>
                    <Users className="w-4 h-4 mr-2" />
                    View Applicants
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicate Job
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Share className="w-4 h-4 mr-2" />
                    Share Job Link
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetails;
