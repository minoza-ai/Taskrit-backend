import { v4 as uuidv4 } from 'uuid';
import { Project } from '../models/Project';
import { ProjectSubmission } from '../models/ProjectSubmission';
import { User } from '../models/User';
import {
  Project as IProject,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectSubmission as IProjectSubmission,
  CreateProjectSubmissionRequest,
} from '../types';
import { settlementService } from './settlementService';

export class ProjectService {
  async createProject(ownerUserUuid: string, req: CreateProjectRequest): Promise<IProject> {
    if (!req.name?.trim()) {
      const error = new Error('name is required');
      (error as any).statusCode = 400;
      throw error;
    }

    const budget = this.normalizeBudget(req.budget);
    const deadline = this.normalizeDeadline(req.deadline);

    const now = Math.floor(Date.now() / 1000);

    const project = await Project.create({
      project_uuid: uuidv4(),
      owner_user_uuid: ownerUserUuid,
      name: req.name.trim(),
      category: this.normalizeOptionalText(req.category),
      budget,
      deadline,
      team_requirements: this.normalizeOptionalText(req.team_requirements),
      detailed_description: this.normalizeOptionalText(req.detailed_description ?? req.description),
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });

    return this.formatProject(project);
  }

  async listProjects(ownerUserUuid: string): Promise<IProject[]> {
    const projects = await Project.find({
      owner_user_uuid: ownerUserUuid,
      deleted_at: null,
    }).sort({ updated_at: -1 });

    return projects.map((project) => this.formatProject(project));
  }

  async getPublicFeed(limit: number = 10): Promise<IProject[]> {
    const projects = await Project.find({
      deleted_at: null,
    }).sort({ created_at: -1 }).limit(limit);

    return projects.map((project) => this.formatProject(project));
  }

  async getMetrics(): Promise<{
    activeProjects: number;
    thisWeekMatches: number;
    activeMembers: number;
    totalCompleted: number;
  }> {
    const now = Math.floor(Date.now() / 1000);
    const oneWeekAgo = now - 7 * 24 * 60 * 60;

    const activeProjects = await Project.countDocuments({ deleted_at: null });
    const thisWeekMatches = await Project.countDocuments({
      deleted_at: null,
      updated_at: { $gte: oneWeekAgo },
    });
    const activeMembers = await User.countDocuments({ deleted_at: null });
    const totalCompleted = await Project.countDocuments({ deleted_at: { $ne: null } });

    return {
      activeProjects,
      thisWeekMatches,
      activeMembers,
      totalCompleted,
    };
  }

  async getProjectByUuid(ownerUserUuid: string, projectUuid: string): Promise<IProject | null> {
    const project = await Project.findOne({
      project_uuid: projectUuid,
      owner_user_uuid: ownerUserUuid,
      deleted_at: null,
    });

    return project ? this.formatProject(project) : null;
  }

  async updateProject(
    ownerUserUuid: string,
    projectUuid: string,
    req: UpdateProjectRequest
  ): Promise<IProject> {
    const update: {
      name?: string;
      category?: string | null;
      budget?: number | null;
      deadline?: number | null;
      team_requirements?: string | null;
      detailed_description?: string | null;
      updated_at: number;
    } = {
      updated_at: Math.floor(Date.now() / 1000),
    };

    if (typeof req.name === 'string') {
      const name = req.name.trim();
      if (!name) {
        const error = new Error('name must not be empty');
        (error as any).statusCode = 400;
        throw error;
      }
      update.name = name;
    }

    if (req.category !== undefined) {
      update.category = this.normalizeOptionalText(req.category);
    }

    if (req.budget !== undefined) {
      update.budget = this.normalizeBudget(req.budget);
    }

    if (req.deadline !== undefined) {
      update.deadline = this.normalizeDeadline(req.deadline);
    }

    if (req.team_requirements !== undefined) {
      update.team_requirements = this.normalizeOptionalText(req.team_requirements);
    }

    if (req.detailed_description !== undefined || req.description !== undefined) {
      update.detailed_description = this.normalizeOptionalText(req.detailed_description ?? req.description);
    }

    if (
      update.name === undefined &&
      update.category === undefined &&
      update.budget === undefined &&
      update.deadline === undefined &&
      update.team_requirements === undefined &&
      update.detailed_description === undefined
    ) {
      const error = new Error('No fields to update');
      (error as any).statusCode = 400;
      throw error;
    }

    const project = await Project.findOneAndUpdate(
      {
        project_uuid: projectUuid,
        owner_user_uuid: ownerUserUuid,
        deleted_at: null,
      },
      update,
      { new: true }
    );

    if (!project) {
      const error = new Error('Project not found');
      (error as any).statusCode = 404;
      throw error;
    }

    return this.formatProject(project);
  }

  async deleteProject(ownerUserUuid: string, projectUuid: string): Promise<void> {
    const project = await Project.findOneAndUpdate(
      {
        project_uuid: projectUuid,
        owner_user_uuid: ownerUserUuid,
        deleted_at: null,
      },
      {
        deleted_at: Math.floor(Date.now() / 1000),
        updated_at: Math.floor(Date.now() / 1000),
      },
      { new: true }
    );

    if (!project) {
      const error = new Error('Project not found');
      (error as any).statusCode = 404;
      throw error;
    }
  }

  async submitProjectResult(
    submitterUserUuid: string,
    projectUuid: string,
    req: CreateProjectSubmissionRequest,
  ): Promise<IProjectSubmission> {
    const title = typeof req.title === 'string' ? req.title.trim() : '';
    if (!title) {
      const error = new Error('title is required');
      (error as any).statusCode = 400;
      throw error;
    }

    const project = await Project.findOne({ project_uuid: projectUuid, deleted_at: null });
    if (!project) {
      const error = new Error('Project not found');
      (error as any).statusCode = 404;
      throw error;
    }

    const now = Math.floor(Date.now() / 1000);

    const submission = await ProjectSubmission.create({
      submission_uuid: uuidv4(),
      project_uuid: projectUuid,
      submitter_user_uuid: submitterUserUuid,
      title,
      description: this.normalizeOptionalText(req.description),
      artifact_url: this.normalizeArtifactUrl(req.artifact_url),
      status: 'submitted',
      settlement_amount: null,
      settlement_signature: null,
      created_at: now,
      updated_at: now,
      settled_at: null,
    });

    return this.formatProjectSubmission(submission);
  }

  async listProjectSubmissions(requesterUserUuid: string, projectUuid: string): Promise<IProjectSubmission[]> {
    const project = await Project.findOne({ project_uuid: projectUuid });
    if (!project) {
      const error = new Error('Project not found');
      (error as any).statusCode = 404;
      throw error;
    }

    const isOwner = project.owner_user_uuid === requesterUserUuid;

    const query = isOwner
      ? { project_uuid: projectUuid }
      : { project_uuid: projectUuid, submitter_user_uuid: requesterUserUuid };

    const submissions = await ProjectSubmission.find(query).sort({ created_at: -1 });
    return submissions.map((submission) => this.formatProjectSubmission(submission));
  }

  async approveProjectSubmission(
    ownerUserUuid: string,
    projectUuid: string,
    submissionUuid: string,
    requestedSettlementAmount?: number,
  ): Promise<{
    project: IProject;
    submission: IProjectSubmission;
    settlementSignature: string;
    settlementAmount: number;
  }> {
    const project = await Project.findOne({
      project_uuid: projectUuid,
      owner_user_uuid: ownerUserUuid,
      deleted_at: null,
    });

    if (!project) {
      const error = new Error('Project not found');
      (error as any).statusCode = 404;
      throw error;
    }

    const submission = await ProjectSubmission.findOne({
      submission_uuid: submissionUuid,
      project_uuid: projectUuid,
    });

    if (!submission) {
      const error = new Error('Submission not found');
      (error as any).statusCode = 404;
      throw error;
    }

    if (submission.status !== 'submitted') {
      const error = new Error('Only submitted results can be approved');
      (error as any).statusCode = 409;
      throw error;
    }

    const submitter = await User.findOne({ user_uuid: submission.submitter_user_uuid, deleted_at: null });
    if (!submitter) {
      const error = new Error('Submitter user not found');
      (error as any).statusCode = 404;
      throw error;
    }

    if (!submitter.wallet_address) {
      const error = new Error('Submitter wallet is not connected');
      (error as any).statusCode = 422;
      throw error;
    }

    const settlementAmount = this.resolveSettlementAmount(project.budget, requestedSettlementAmount);

    const settlementSignature = await settlementService.settleTokens(submitter.wallet_address, settlementAmount);
    if (!settlementSignature) {
      const error = new Error('Settlement transaction failed');
      (error as any).statusCode = 500;
      throw error;
    }

    const now = Math.floor(Date.now() / 1000);

    const approvedSubmission = await ProjectSubmission.findOneAndUpdate(
      { submission_uuid: submissionUuid },
      {
        status: 'approved',
        settlement_amount: settlementAmount,
        settlement_signature: settlementSignature,
        settled_at: now,
        updated_at: now,
      },
      { new: true },
    );

    if (!approvedSubmission) {
      const error = new Error('Submission not found after settlement');
      (error as any).statusCode = 500;
      throw error;
    }

    await ProjectSubmission.updateMany(
      {
        project_uuid: projectUuid,
        submission_uuid: { $ne: submissionUuid },
        status: 'submitted',
      },
      {
        status: 'rejected',
        updated_at: now,
      },
    );

    const completedProject = await Project.findOneAndUpdate(
      {
        project_uuid: projectUuid,
        owner_user_uuid: ownerUserUuid,
        deleted_at: null,
      },
      {
        deleted_at: now,
        updated_at: now,
      },
      { new: true },
    );

    if (!completedProject) {
      const error = new Error('Project completion failed');
      (error as any).statusCode = 500;
      throw error;
    }

    return {
      project: this.formatProject(completedProject),
      submission: this.formatProjectSubmission(approvedSubmission),
      settlementSignature,
      settlementAmount,
    };

  }

  async getOngoingProjectsCount(ownerUserUuid: string): Promise<number> {
    const count = await Project.countDocuments({
      owner_user_uuid: ownerUserUuid,
      deleted_at: null,
    });

    return count;
  }

  async getCompletedProjectsCount(ownerUserUuid: string): Promise<number> {
    const count = await Project.countDocuments({
      owner_user_uuid: ownerUserUuid,
      deleted_at: { $ne: null },
    });

    return count;
  }

  async getRecentActivities(ownerUserUuid: string, limit: number = 10): Promise<IProject[]> {
    const projects = await Project.find({
      owner_user_uuid: ownerUserUuid,
      deleted_at: null,
    }).sort({ updated_at: -1 }).limit(limit);

    return projects.map((project) => this.formatProject(project));
  }

  private formatProject(project: any): IProject {
    return {
      project_uuid: project.project_uuid,
      owner_user_uuid: project.owner_user_uuid,
      name: project.name,
      category: project.category ?? null,
      budget: project.budget ?? null,
      deadline: project.deadline ?? null,
      team_requirements: project.team_requirements ?? null,
      detailed_description: project.detailed_description ?? project.description ?? null,
      created_at: project.created_at,
      updated_at: project.updated_at,
      deleted_at: project.deleted_at,
    };
  }

  private formatProjectSubmission(submission: any): IProjectSubmission {
    return {
      submission_uuid: submission.submission_uuid,
      project_uuid: submission.project_uuid,
      submitter_user_uuid: submission.submitter_user_uuid,
      title: submission.title,
      description: submission.description ?? null,
      artifact_url: submission.artifact_url ?? null,
      status: submission.status,
      settlement_amount: submission.settlement_amount ?? null,
      settlement_signature: submission.settlement_signature ?? null,
      created_at: submission.created_at,
      updated_at: submission.updated_at,
      settled_at: submission.settled_at ?? null,
    };
  }

  private normalizeOptionalText(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    return trimmed || null;
  }

  private normalizeBudget(value: unknown): number | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
      const error = new Error('budget must be a non-negative number');
      (error as any).statusCode = 400;
      throw error;
    }

    return value;
  }

  private normalizeDeadline(value: unknown): number | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) {
      const error = new Error('deadline must be a positive unix timestamp');
      (error as any).statusCode = 400;
      throw error;
    }

    return Math.floor(value);
  }

  private normalizeArtifactUrl(value: unknown): string | null {
    const normalized = this.normalizeOptionalText(value);
    if (!normalized) {
      return null;
    }

    if (normalized.startsWith('/uploads/') || normalized.startsWith('/api/uploads/')) {
      return normalized;
    }

    try {
      const parsed = new URL(normalized);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        const error = new Error('artifact_url must start with http:// or https://');
        (error as any).statusCode = 400;
        throw error;
      }
      return normalized;
    } catch (err) {
      const error = new Error('artifact_url must be a valid URL');
      (error as any).statusCode = 400;
      throw error;
    }
  }

  private resolveSettlementAmount(projectBudget: number | null, requestedAmount?: number): number {
    if (requestedAmount !== undefined) {
      if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
        const error = new Error('settlement_amount must be a positive number');
        (error as any).statusCode = 400;
        throw error;
      }
      return requestedAmount;
    }

    if (typeof projectBudget === 'number' && projectBudget > 0) {
      const taskPriceKrw = Number(process.env.SETTLEMENT_TASK_PRICE_KRW || 1325);
      if (!Number.isFinite(taskPriceKrw) || taskPriceKrw <= 0) {
        const error = new Error('SETTLEMENT_TASK_PRICE_KRW must be a positive number');
        (error as any).statusCode = 500;
        throw error;
      }

      // Project budget is treated as KRW and converted to TASK.
      let convertedTask = Number((projectBudget / taskPriceKrw).toFixed(6));

      const minTask = Number(process.env.SETTLEMENT_MIN_TASK || 0.01);
      if (Number.isFinite(minTask) && minTask > 0) {
        convertedTask = Math.max(convertedTask, minTask);
      }

      const maxTask = Number(process.env.SETTLEMENT_MAX_TASK || 0);
      if (Number.isFinite(maxTask) && maxTask > 0) {
        convertedTask = Math.min(convertedTask, maxTask);
      }

      return convertedTask;
    }

    const fallback = Number(process.env.SETTLEMENT_DEFAULT_AMOUNT || 100);
    if (!Number.isFinite(fallback) || fallback <= 0) {
      return 100;
    }

    return fallback;
  }
}

export const projectService = new ProjectService();
