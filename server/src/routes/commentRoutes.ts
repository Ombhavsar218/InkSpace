import { Router } from 'express';
import {
  getComments,
  createComment,
  toggleResolveComment,
  deleteComment,
} from '../controllers/commentController';
import { optionalAuth } from '../middleware/auth';

const router = Router();

router.get('/board/:boardId', optionalAuth, getComments);
router.post('/board/:boardId', optionalAuth, createComment);
router.patch('/:id/resolve', optionalAuth, toggleResolveComment);
router.delete('/:id', optionalAuth, deleteComment);

export default router;
