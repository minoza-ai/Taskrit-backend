import { Response } from 'express';
import {
  RequestWithUser,
  CreateProjectRequest,
  UpdateProjectRequest,
  TeamingMatchSuggestRequest,
} from '../types';
import { projectService } from '../services/projectService';
import { teamingService } from '../services/teamingService';

export class ProjectController {
  async suggestMatches(req: RequestWithUser, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const requestText = typeof req.body.request === 'string' ? req.body.request.trim() : '';
      if (!requestText) {
        res.status(400).json({ error: 'request is required' });
        return;
      }

      const matchReq: TeamingMatchSuggestRequest = {
        request: requestText,
        requiredDate: req.body.requiredDate,
        requiredElo: req.body.requiredElo,
        requiredCost: req.body.requiredCost,
        requireHuman: req.body.requireHuman,
        maxCost: req.body.maxCost,
      };

      const matches = await teamingService.suggestMatches(req.user.user_uuid, matchReq);

      res.status(200).json({ matches });
    } catch (err: any) {
      const statusCode = err.statusCode || 500;
      const message = err.message || 'Internal server error';
      res.status(statusCode).json({ error: message });
    }
  }

  async create(req: RequestWithUser, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const createReq: CreateProjectRequest = {
        name: req.body.name,
        category: req.body.category,
        budget: req.body.budget,
        deadline: req.body.deadline,
        team_requirements: req.body.team_requirements,
        detailed_description: req.body.detailed_description ?? req.body.description,
      };

      const project = await projectService.createProject(req.user.user_uuid, createReq);

      res.status(201).json({
        message: 'Project created successfully',
        project,
      });
    } catch (err: any) {
      const statusCode = err.statusCode || 500;
      const message = err.message || 'Internal server error';
      res.status(statusCode).json({ error: message });
    }
  }

  async list(req: RequestWithUser, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const projects = await projectService.listProjects(req.user.user_uuid);

      res.status(200).json({ projects });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  async getByUuid(req: RequestWithUser, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const project = await projectService.getProjectByUuid(req.user.user_uuid, req.params.project_uuid);

      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      res.status(200).json(project);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  async update(req: RequestWithUser, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const updateReq: UpdateProjectRequest = {
        name: req.body.name,
        category: req.body.category,
        budget: req.body.budget,
        deadline: req.body.deadline,
        team_requirements: req.body.team_requirements,
        detailed_description: req.body.detailed_description ?? req.body.description,
      };

      const project = await projectService.updateProject(
        req.user.user_uuid,
        req.params.project_uuid,
        updateReq
      );

      res.status(200).json({
        message: 'Project updated successfully',
        project,
      });
    } catch (err: any) {
      const statusCode = err.statusCode || 500;
      const message = err.message || 'Internal server error';
      res.status(statusCode).json({ error: message });
    }
  }

  async delete(req: RequestWithUser, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await projectService.deleteProject(req.user.user_uuid, req.params.project_uuid);

      res.status(204).send();
    } catch (err: any) {
      const statusCode = err.statusCode || 500;
      const message = err.message || 'Internal server error';
      res.status(statusCode).json({ error: message });
    }
  }
}

export const projectController = new ProjectController();
