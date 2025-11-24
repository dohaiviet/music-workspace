import mongoose from 'mongoose';

export interface IUser extends mongoose.Document {
    name: string;
    username?: string;
    password?: string;
    avatar: string;
    isAdmin: boolean;
    sessionId: string;
    adminSessionId?: string;
    createdAt: Date;
}

const UserSchema = new mongoose.Schema<IUser>({
    name: {
        type: String,
        required: [true, 'Please provide a name'],
        maxlength: [60, 'Name cannot be more than 60 characters'],
    },
    username: {
        type: String,
        unique: true,
        sparse: true,
    },
    password: {
        type: String,
        select: false,
    },
    avatar: {
        type: String,
        required: [true, 'Please provide an avatar'],
    },
    isAdmin: {
        type: Boolean,
        default: false,
    },
    sessionId: {
        type: String,
        required: true,
        unique: true,
    },
    adminSessionId: {
        type: String,
        unique: true,
        sparse: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Force model recompilation in dev to pick up schema changes
if (process.env.NODE_ENV !== 'production') {
    delete mongoose.models.User;
}

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
