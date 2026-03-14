import { v4 as uuidv4 } from 'uuid';
import { Project } from '../models/Project';
import { Project as IProject, CreateProjectRequest, UpdateProjectRequest } from '../types';

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
}

export const projectService = new ProjectService();
