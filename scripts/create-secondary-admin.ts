
import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('Please define the MONGODB_URI environment variable inside .env or .env.local');
    process.exit(1);
}

// Minimal User Schema Definition to avoid import issues
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    username: { type: String, unique: true, sparse: true },
    password: { type: String, select: false },
    avatar: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
    sessionId: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now },
});

// Use existing model or compile new one
const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function main() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI!);
        console.log('Connected.');

        const username = 'Secondary Admin';
        const password = 'admin123';

        // Check if user exists
        let user = await User.findOne({ name: username });

        if (user) {
            console.log('User already exists:', user.name);
            console.log('Updating to ensure admin status...');
            user.isAdmin = true;
            await user.save();
            console.log('User updated.');
        } else {
            console.log('Creating user...');
            const hashedPassword = await bcrypt.hash(password, 10);

            user = await User.create({
                name: username,
                username: 'secondary_admin',
                password: hashedPassword,
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
                isAdmin: true,
                sessionId: nanoid(),
            });
            console.log('User created:', user.name);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main();
