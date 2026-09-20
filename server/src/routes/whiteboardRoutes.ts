import { Router } from 'express';
import {
  createBoard,
  getBoards,
  getBoardById,
  updateBoard,
  deleteBoard,
  duplicateBoard,
  createVersion,
  getVersions,
  restoreVersion,
} from '../controllers/whiteboardController';
import { optionalAuth, authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/', optionalAuth, createBoard);
router.get('/', optionalAuth, getBoards);
router.get('/:id', optionalAuth, getBoardById);
router.put('/:id', optionalAuth, updateBoard);
router.delete('/:id', optionalAuth, deleteBoard);
router.post('/:id/duplicate', optionalAuth, duplicateBoard);
router.post('/:id/versions', optionalAuth, createVersion);
router.get('/:id/versions', optionalAuth, getVersions);
router.post('/:id/versions/:versionId/restore', optionalAuth, restoreVersion);

export default router;
