import { Router } from 'express';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { rolePermission } from '../middleware/rolePermission.js';
import { processAgentChat } from './service.js';
import { StatusCodes } from 'http-status-codes';
import { ROLES } from '../utils/constants.js';

const agentRouter = Router();

/**
 * @route   POST /api/agent/chat
 * @desc    Chat with the AI Agent
 * @access  All logged-in users (Permissions handled inside)
 */
agentRouter.post('/chat', jwtAuth, rolePermission(Object.values(ROLES)), async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: 'error',
                message: 'Tin nhắn không được để trống.'
            });
        }

        const userId = req.userId;
        const userRole = req.userRole; // Added by rolePermission middleware previously or needs to be set

        // Ensure userRole is available
        if (!userRole) {
            // If rolePermission middleware wasn't used before this, we might need to fetch it
            // But in CraftFlow, we usually have it in req after jwtAuth + rolePermission
            // For safety, let's assume it's there or handle it gracefully
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                status: 'error',
                message: 'User role not found in request.'
            });
        }

        const result = await processAgentChat(userId, userRole, message);

        if (result.status === 'error') {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(result);
        }

        return res.status(StatusCodes.OK).json(result);

    } catch (error) {
        console.error('[Agent Router] Error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: 'error',
            message: 'Internal server error.'
        });
    }
});

export default agentRouter;
