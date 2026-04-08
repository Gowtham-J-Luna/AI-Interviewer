import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Input from "../Home/Components/Input.jsx";
import SpinnerLoader from "./Loader/SpinnerLoader.jsx";
import axiosInstance from "../../utils/axiosInstance.js";
import { API_PATHS } from "../../constants/apiPaths.js";
import {
  extractTextFromPdf,
  extractTextFromDocx,
  extractTextFromPlainText,
  parseResumeSnapshot,
} from "../../utils/FileParsers.js";
import { CloudUploadIcon, File02Icon } from "hugeicons-react";

const getSuggestedTopics = (parsedResume) =>
  (parsedResume?.topKeywords?.length ? parsedResume.topKeywords : parsedResume?.skills || [])
    .slice(0, 6)
    .join(", ");

const applyParsedResumeToForm = (prev, resumeText, parsedResume) => {
  const previousSuggestedTopics = getSuggestedTopics(prev.resumeData || {});
  const nextSuggestedTopics = getSuggestedTopics(parsedResume);
  const previousExperience = prev.resumeData?.inferredExperienceYears
    ? String(prev.resumeData.inferredExperienceYears)
    : "";

  return {
    ...prev,
    resumeText,
    role: !prev.role || prev.role === prev.resumeData?.inferredRole ? parsedResume.inferredRole || "" : prev.role,
    experience:
      !prev.experience || prev.experience === previousExperience
        ? parsedResume.inferredExperienceYears
          ? String(parsedResume.inferredExperienceYears)
          : ""
        : prev.experience,
    topicsToFocus:
      !prev.topicsToFocus || prev.topicsToFocus === previousSuggestedTopics
        ? nextSuggestedTopics
        : prev.topicsToFocus,
    resumeData: parsedResume,
    isResumeSession: !!resumeText.trim(),
  };
};

const CreateSessionForm = () => {
  const [formData, setFormData] = useState({
    role: "",
    experience: "",
    topicsToFocus: "",
    jobDescription: "",
    resumeText: "",
    resumeData: {
      summary: "",
      skills: [],
      experience: [],
      projects: [],
      education: [],
    },
    isResumeSession: false,
  });

  const [resumeFile, setResumeFile] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  const handleChange = (key, value) => {
    setFormData((prevData) => ({
      ...prevData,
      [key]: value,
    }));
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      return;
    }

    setResumeFile(file);
    setIsExtracting(true);
    setError("");

    try {
      let text = "";

      if (file.type === "application/pdf") {
        text = await extractTextFromPdf(file);
      } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        text = await extractTextFromDocx(file);
      } else if (file.type.startsWith("text/") || file.name.endsWith(".txt")) {
        text = await extractTextFromPlainText(file);
      } else {
        setError("Please upload a PDF, DOCX, or TXT resume.");
        setResumeFile(null);
        setIsExtracting(false);
        return;
      }

      const parsedResume = parseResumeSnapshot(text);

      setFormData((prev) => applyParsedResumeToForm(prev, text, parsedResume));
    } catch (err) {
      setError("Failed to read the resume. Please try again.");
      setResumeFile(null);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();

    const normalizedResumeText = formData.resumeText.trim();
    const normalizedJobDescription = formData.jobDescription.trim();
    const { role, experience, topicsToFocus } = formData;

    if ((!role || !experience || !topicsToFocus) && !normalizedResumeText) {
      setError("Add a resume or fill the role, experience, and focus fields.");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const aiResponse = await axiosInstance.post(API_PATHS.AI.GENERATE_QUESTIONS, {
        role,
        experience,
        topicsToFocus,
        numberOfQuestions: 10,
        resumeText: normalizedResumeText,
        jobDescription: normalizedJobDescription,
        resumeData: normalizedResumeText ? parseResumeSnapshot(normalizedResumeText) : formData.resumeData,
      });

      const generatedQuestions = aiResponse.data;

      const response = await axiosInstance.post(API_PATHS.SESSION.CREATE, {
        ...formData,
        resumeText: normalizedResumeText,
        jobDescription: normalizedJobDescription,
        resumeData: normalizedResumeText ? parseResumeSnapshot(normalizedResumeText) : formData.resumeData,
        description: normalizedResumeText ? "Resume-tailored interview session" : "",
        questions: generatedQuestions,
      });

      if (response.data?.session?._id) {
        navigate(`/interview-prep/${response.data?.session?._id}`);
      }
    } catch (requestError) {
      if (requestError.response && requestError.response.data.message) {
        setError(requestError.response.data.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 py-5 sm:py-6">
      <div className="sticky top-0 z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 pb-4 bg-white/95 backdrop-blur-sm">
        <h3 className="pr-12 text-xl font-semibold text-slate-900">Start Your Interview Journey</h3>
        <p className="text-sm text-slate-600 mt-1">
          Add a target role or upload your resume and we&apos;ll tailor the interview for you.
        </p>
      </div>

      <form onSubmit={handleCreateSession} className="flex flex-col gap-4 pt-2">
        <Input
          value={formData.role}
          onChange={({ target }) => handleChange("role", target.value)}
          label="Target Role"
          placeholder="(e.g., Frontend Developer, UI/UX Designer, etc.)"
          type="text"
        />

        <Input
          value={formData.experience}
          onChange={({ target }) => handleChange("experience", target.value)}
          label="Years of Experience"
          placeholder="(e.g., 1 year, 3 years, 5+ years)"
          type="text"
        />

        <Input
          value={formData.topicsToFocus}
          onChange={({ target }) => handleChange("topicsToFocus", target.value)}
          label="Topics to Focus On"
          placeholder="(Comma-separated, e.g., React, Node.js, MongoDB)"
          type="text"
        />

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-800">Job Description (Optional)</label>
          <textarea
            value={formData.jobDescription}
            onChange={({ target }) => handleChange("jobDescription", target.value)}
            placeholder="Paste the job description to make the questions more targeted."
            className="w-full min-h-28 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 resize-y focus:outline-none focus:ring-2 focus:ring-black/10"
          />
        </div>

        <div className="bg-gray-50/60 border border-dashed border-gray-300 rounded-2xl p-5 sm:p-6 text-center hover:bg-gray-50 transition-colors">
          <input
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={handleFileChange}
            className="hidden"
            id="resume-upload"
          />
          <label htmlFor="resume-upload" className="cursor-pointer flex items-center gap-4">
            <div className="p-3 bg-white rounded-full shadow-sm border border-gray-100 shrink-0">
              {resumeFile ? <File02Icon className="text-emerald-500" /> : <CloudUploadIcon className="text-blue-500" />}
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-gray-700">
                {resumeFile ? resumeFile.name : "Upload Resume (PDF, DOCX, or TXT)"}
              </div>
              <div className="text-xs text-gray-400">
                {isExtracting ? "Extracting text..." : resumeFile ? "Ready to analyze" : "We'll tailor questions to your experience"}
              </div>
            </div>
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-800">Resume Text</label>
          <textarea
            value={formData.resumeText}
            onChange={({ target }) => {
              const resumeText = target.value;
              const parsedResume = parseResumeSnapshot(resumeText);
              setFormData((prev) => applyParsedResumeToForm(prev, resumeText, parsedResume));
            }}
            placeholder="Paste resume text here if you don't want to upload a file."
            className="w-full min-h-40 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 resize-y focus:outline-none focus:ring-2 focus:ring-black/10"
          />
        </div>

        {formData.resumeData?.summary && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Resume Snapshot</p>
            <p className="mt-2">{formData.resumeData.summary}</p>
            <p className="mt-3 text-xs text-slate-500">
              Inferred role: {formData.resumeData.inferredRole || "Not detected"} | Experience:{" "}
              {formData.resumeData.inferredExperienceYears || 0} years
            </p>
            {!!formData.resumeData.skills?.length && (
              <p className="mt-2 text-xs text-slate-500">
                Top skills: {formData.resumeData.skills.slice(0, 8).join(", ")}
              </p>
            )}
          </div>
        )}

        {error && <p className="text-red-500 text-xs pb-1">{error}</p>}

        <div className="sticky bottom-0 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-3 pb-1 bg-white/95 backdrop-blur-sm border-t border-slate-100">
          <button type="submit" className="btn-primary w-full mt-0" disabled={isLoading || isExtracting}>
            {isLoading && <SpinnerLoader color="white" size={15} />} Create Session
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateSessionForm;
