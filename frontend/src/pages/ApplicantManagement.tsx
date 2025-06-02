import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
import { Label } from "@/components/ui/label";
import AddCandidateModal from "@/components/modals/AddCandidateModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  FileText,
  Calendar,
  Phone,
  MapPin,
  Briefcase,
  Mail,
  Clock,
  Loader2,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppDispatch, useAppSelector } from "../hooks/reduxHooks";
import {
  getApplicants,
  updateApplicantStatus,
  selectApplicants,
  selectApplicantsLoading,
  selectApplicantsError,
  removeApplicant,
} from "../slices/applicantsSlice";

const ApplicantManagement = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const applicants = useAppSelector(selectApplicants);
  const loading = useAppSelector(selectApplicantsLoading);
  const error = useAppSelector(selectApplicantsError);

  // Extract jobId from URL query params if present
  const queryParams = new URLSearchParams(location.search);
  const jobIdFilter = queryParams.get("jobId");
  useEffect(() => {
    dispatch(getApplicants());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Filter applicants based on search term, status, and job ID
  const filteredApplicants = applicants
    .filter((applicant) => {
      const matchesSearch =
        applicant.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        applicant.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        applicant.positionAppliedFor?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || applicant.status === statusFilter;

      const matchesJob = !jobIdFilter || applicant.jobId === jobIdFilter;

      return matchesSearch && matchesStatus && matchesJob;
    })
    .sort((a, b) => new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime());

  // Calculate counts for each status
  const statusCounts = applicants.reduce((counts, applicant) => {
    counts[applicant.status] = (counts[applicant.status] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  const totalApplicants = applicants.length;
  const newCount = statusCounts["new"] || 0;
  const reviewingCount = statusCounts["reviewing"] || 0;
  const interviewCount = statusCounts["interview"] || 0;
  const offerCount = statusCounts["offer"] || 0;
  const rejectedCount = statusCounts["rejected"] || 0;

  const handleStatusChange = (applicantId: string, newStatus: string) => {
    dispatch(updateApplicantStatus({ id: applicantId, status: newStatus as "new" | "reviewing" | "interview" | "offer" | "rejected" }))
      .unwrap()
      .then(() => {
        toast({
          title: "Status updated",
          description: "Applicant status has been updated successfully.",
        });
      })
      .catch((err) => {
        toast({
          title: "Error updating status",
          description: err.message || "Something went wrong",
          variant: "destructive",
        });
      });
  };

  const handleDeleteApplicant = (applicantId: string) => {
    if (window.confirm('Are you sure you want to delete this applicant?')) {
      dispatch(removeApplicant(applicantId));
      toast({
        title: "Applicant deleted",
        description: "The applicant has been successfully deleted.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Applicant Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Track and manage your job applicants
            </p>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Candidate
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total
                </p>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {totalApplicants}
                </h3>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  New
                </p>
                <h3 className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                  {newCount}
                </h3>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Reviewing
                </p>
                <h3 className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                  {reviewingCount}
                </h3>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Interview
                </p>
                <h3 className="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                  {interviewCount}
                </h3>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Offer
                </p>
                <h3 className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {offerCount}
                </h3>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Rejected
                </p>
                <h3 className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1">
                  {rejectedCount}
                </h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by name, email, or job title..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="w-full md:w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="reviewing">Reviewing</SelectItem>
                    <SelectItem value="interview">Interview</SelectItem>
                    <SelectItem value="offer">Offer</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Applicants List */}
        <div className="space-y-4">
          {loading ? (
            <Card className="text-center py-12">
              <CardContent>
                <div className="text-gray-500 dark:text-gray-400">
                  <p>Loading applicants...</p>
                </div>
              </CardContent>
            </Card>
          ) : filteredApplicants.length > 0 ? (
            filteredApplicants.map((applicant) => (
              <Card
                key={applicant._id}
                className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row md:items-center">
                    <div className="flex-1 mb-4 md:mb-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                          {applicant.fullName}
                        </h3>
                        <Badge
                          variant={
                            applicant.status === "new"
                              ? "default"
                              : applicant.status === "reviewing"
                              ? "secondary"
                              : applicant.status === "interview"
                              ? "outline"
                              : applicant.status === "offer"
                              ? "default"
                              : "destructive"
                          }
                          className={
                            applicant.status === "new"
                              ? "bg-blue-500"
                              : applicant.status === "reviewing"
                              ? "bg-purple-500"
                              : applicant.status === "interview"
                              ? "bg-amber-500 text-white"
                              : applicant.status === "offer"
                              ? "bg-green-500"
                              : ""
                          }>
                          {applicant.status.charAt(0).toUpperCase() +
                            applicant.status.slice(1)}
                        </Badge>
                        {applicant.matchScore && (
                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-700 border-green-200">
                            {applicant.matchScore}% Match
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center">
                          <Briefcase className="w-4 h-4 mr-1" />
                          <span>{applicant.positionAppliedFor ? applicant.positionAppliedFor: "Software Developer"}</span>
                        </div>
                        <div className="flex items-center">
                          <Mail className="w-4 h-4 mr-1" />
                          <span>{applicant.email}</span>
                        </div>
                        <div className="flex items-center">
                          <Phone className="w-4 h-4 mr-1" />
                          <span>{applicant.phone}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          <span>
                            Applied -{" "}
                            {new Date(
                              applicant.applicationDate
                            ).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-1" />
                          <span>{applicant.location ? applicant.location : "Kolkata"}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          <span>{applicant.yearsOfExperience} years exp.</span>
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="flex flex-wrap gap-2 mt-2">
                          {applicant.skills?.map((skill, skillIndex) => (
                            <Badge key={skillIndex} variant="outline">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2 md:w-48">
                      <Button
                        variant="outline"
                        size="sm"
                        className="justify-start"
                        disabled={!applicant.resume}
                        title={!applicant.resume ? "No resume available" : "View resume"}>
                        <FileText className="w-4 h-4 mr-2" />
                        View Resume
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="justify-start">
                        <Calendar className="w-4 h-4 mr-2" />
                        Schedule Interview
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="justify-start">
                        <Mail className="w-4 h-4 mr-2" />
                        Send Email
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="justify-start text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteApplicant(applicant._id)}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Applicant
                      </Button>
                      <div className="mt-2">
                        <Label
                          htmlFor={`status-${applicant._id}`}
                          className="text-xs mb-1 block">
                          Update Status
                        </Label>
                        <Select
                          value={applicant.status}
                          onValueChange={(value) =>
                            handleStatusChange(applicant._id, value)
                          }>
                          <SelectTrigger
                            id={`status-${applicant._id}`}
                            className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="reviewing">Reviewing</SelectItem>
                            <SelectItem value="interview">Interview</SelectItem>
                            <SelectItem value="offer">Offer</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <div className="text-gray-500 dark:text-gray-400">
                  <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No applicants found matching your search criteria.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <AddCandidateModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
};

export default ApplicantManagement;
