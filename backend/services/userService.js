import User from '../models/User.js'

export const deleteUser = async (userId) => {
    await User.findByIdAndDelete(userId);
    return { status: 200, message: 'User deleted successfully.' };
}

export const updateUser = async (userId, updateData) => {
    const user = await User.findByIdAndUpdate(userId, updateData, { new: true });
    if (!user) return { status: 404, error: 'User not found.' };
    return user;
}

export const getUserByQuery = async (query, page = 1, limit = 10, search = '') => {
    const skip = (page - 1) * limit;
    
    let finalQuery = { ...query };
    
    if (search) {
        finalQuery.$or = [
            { fullName: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
            { username: { $regex: search, $options: 'i' } }
        ];
    }

    const total = await User.countDocuments(finalQuery);
    const users = await User.find(finalQuery)
        .populate('role', 'roleName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
        
    return {
        users,
        pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
        }
    };
}

export const getUserById = async (userId) => {
    const user = await User.findById(userId).populate('role', 'roleName');
    if (!user) return { status: 404, error: 'User not found.' };
    return user;
}