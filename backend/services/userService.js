import User from '../models/User.js'

const MAX_LIMIT = 100;

export const deleteUser = async (userId) => {
    try {
        const user = await User.findByIdAndDelete(userId).lean();
        if (!user) return { success: false, message: 'User not found.', data: null };
        return { success: true, message: 'User deleted successfully.', data: null };
    } catch (error) {
        console.error('[userService] deleteUser error:', error);
        return { success: false, message: error.message, data: null };
    }
}

export const updateUser = async (userId, updateData) => {
    try {
        const user = await User.findByIdAndUpdate(userId, updateData, { new: true }).lean();
        if (!user) return { success: false, message: 'User not found.', data: null };
        return { success: true, message: 'User updated successfully.', data: user };
    } catch (error) {
        console.error('[userService] updateUser error:', error);
        return { success: false, message: error.message, data: null };
    }
}

/**
 * Get users with filtering, searching and pagination.
 * Optimized with projection, lean() and parallel queries.
 */
export const getUserByQuery = async (query, page = 1, limit = 10, search = '') => {
    try {
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(MAX_LIMIT, Math.max(1, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;
        
        let finalQuery = { ...query };
        
        if (search) {
            const searchRegex = { $regex: search, $options: 'i' };
            finalQuery.$or = [
                { fullName: searchRegex },
                { phone: searchRegex },
                { username: searchRegex }
            ];
        }

        const [users, total] = await Promise.all([
            User.find(finalQuery)
                .select('username email fullName phone address birthDay gender avatar role isActive currentAssignedQuantity hasWarningFlag')
                .populate('role', 'roleName')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            User.countDocuments(finalQuery)
        ]);
            
        return {
            success: true,
            message: 'Users retrieved successfully.',
            data: {
                users,
                pagination: {
                    total,
                    page: pageNum,
                    limit: limitNum,
                    pages: Math.ceil(total / limitNum)
                }
            }
        };
    } catch (error) {
        console.error('[userService] getUserByQuery error:', error);
        return { success: false, message: error.message, data: null };
    }
}

export const getUserById = async (userId) => {
    try {
        const user = await User.findById(userId)
            .select('-password')
            .populate('role', 'roleName')
            .lean();
        if (!user) return { success: false, message: 'User not found.', data: null };
        user.birthDay = user.birthDay?.toLocaleString();
        user.createdAt = user.createdAt?.toLocaleString();
        user.updatedAt = user.updatedAt?.toLocaleString();
        return { success: true, message: 'User retrieved successfully.', data: user };
    } catch (error) {
        console.error('[userService] getUserById error:', error);
        return { success: false, message: error.message, data: null };
    }
}