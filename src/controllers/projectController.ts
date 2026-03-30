import { Response, Request } from 'express';
import {
  RequestWithUser,
  CreateProjectRequest,
  UpdateProjectRequest,
  TeamingMatchSuggestRequest,
} from '../types';
import { projectService } from '../services/projectService';
import { teamingService } from '../services/teamingService';
import { userService } from '../services/userService';
import { User } from '../models/User';

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

      const currentUser = await userService.getUserByUuid(req.user.user_uuid);
      if (!currentUser) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const profileBio = currentUser.profile_bio?.trim() || '';
      if (!profileBio) {
        res.status(400).json({ error: '프로필 소개에 기술 스택과 숙련도를 먼저 입력해주세요.' });
        return;
      }

      await teamingService.upsertHumanAccount(currentUser.user_uuid, profileBio, {
        userId: currentUser.user_id,
        nickname: currentUser.nickname,
      });

      const matchReq: TeamingMatchSuggestRequest = {
        request: requestText,
        requiredDate: req.body.requiredDate,
        requiredElo: req.body.requiredElo,
        requiredCost: req.body.requiredCost,
        requireHuman: req.body.requireHuman,
        maxCost: req.body.maxCost,
      };

      const matches = await teamingService.suggestMatches(req.user.user_uuid, matchReq);

      const nonAssetAccountIds = Array.from(
        new Set(
          matches
            .flatMap((match) => match.candidates)
            .filter((candidate) => candidate.accountType !== 'asset')
            .map((candidate) => candidate.accountId),
        ),
      );

      const nicknamesByUserUuid = new Map<string, string>();
      if (nonAssetAccountIds.length > 0) {
        const users = await User.find(
          { user_uuid: { $in: nonAssetAccountIds }, deleted_at: null },
          { user_uuid: 1, nickname: 1, _id: 0 },
        ).lean();

        users.forEach((user) => {
          nicknamesByUserUuid.set(user.user_uuid, user.nickname);
        });
      }

      const decoratedMatches = matches.map((match) => ({
        ...match,
        candidates: match.candidates.map((candidate) => {
          if (candidate.accountType === 'asset') {
            return {
              ...candidate,
              displayName: candidate.accountId,
            };
          }

          return {
            ...candidate,
            displayName: nicknamesByUserUuid.get(candidate.accountId) || candidate.accountId,
          };
        }),
      }));

      res.status(200).json({ matches: decoratedMatches });
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

  async getPublicFeed(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const projects = await projectService.getPublicFeed(limit);

      res.status(200).json({ projects });
    } catch (err: any) {
      const statusCode = err.statusCode || 500;
      const message = err.message || 'Internal server error';
      res.status(statusCode).json({ error: message });
    }
  }

  async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await projectService.getMetrics();

      res.status(200).json(metrics);
    } catch (err: any) {
      const statusCode = err.statusCode || 500;
      const message = err.message || 'Internal server error';
      res.status(statusCode).json({ error: message });
    }
  }

  async getDashboard(req: RequestWithUser, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const ongoingCount = await projectService.getOngoingProjectsCount(req.user.user_uuid);
      const completedCount = await projectService.getCompletedProjectsCount(req.user.user_uuid);
      const recentActivities = await projectService.getRecentActivities(req.user.user_uuid, 10);

      res.status(200).json({
        ongoingCount,
        completedCount,
        recentActivities,
      });
    } catch (err: any) {
      const statusCode = err.statusCode || 500;
      const message = err.message || 'Internal server error';
      res.status(statusCode).json({ error: message });
    }
  }
}

export const projectController = new ProjectController();
