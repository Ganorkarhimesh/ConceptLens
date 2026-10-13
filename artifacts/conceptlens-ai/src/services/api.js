import { setBaseUrl } from '@workspace/api-client-react';
import {
  useListQuestions, useSubmitAssessment, useGetAssessment, useGetRecovery,
  useSubmitReassessment, useGetStudentDashboard, useGetTeacherDashboard,
  getListQuestionsQueryKey, getGetAssessmentQueryKey, getGetRecoveryQueryKey,
  getGetStudentDashboardQueryKey, getGetTeacherDashboardQueryKey,
} from '@workspace/api-client-react';

setBaseUrl(import.meta.env.VITE_API_BASE_URL || null);

export {
  useListQuestions, useSubmitAssessment, useGetAssessment, useGetRecovery,
  useSubmitReassessment, useGetStudentDashboard, useGetTeacherDashboard,
  getListQuestionsQueryKey, getGetAssessmentQueryKey, getGetRecoveryQueryKey,
  getGetStudentDashboardQueryKey, getGetTeacherDashboardQueryKey,
};
