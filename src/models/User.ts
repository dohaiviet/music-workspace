import mongoose from 'mongoose';

export interface IUser extends mongoose.Document {
    name: string;
    avatar: string;
    isAdmin: boolean;
    sessionId: string;
    createdAt: Date;
}

const UserSchema = new mongoose.Schema<IUser>({
    name: {
        type: String,
        required: [true, 'Please provide a name'],
        maxlength: [60, 'Name cannot be more than 60 characters'],
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
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
