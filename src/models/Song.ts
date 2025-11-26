import mongoose from 'mongoose';

export interface ISong extends mongoose.Document {
    youtubeUrl: string;
    videoId: string;
    title: string;
    thumbnail: string;
    addedBy: mongoose.Types.ObjectId;
    addedByName: string;
    addedByAvatar: string;
    order: number;
    status: 'queued' | 'played';
    playedAt?: Date;
    createdAt: Date;
}

const SongSchema = new mongoose.Schema<ISong>({
    youtubeUrl: {
        type: String,
        required: [true, 'Please provide a YouTube URL'],
    },
    videoId: {
        type: String,
        required: [true, 'Please provide a video ID'],
    },
    title: {
        type: String,
        required: [true, 'Please provide a title'],
    },
    thumbnail: {
        type: String,
        required: [true, 'Please provide a thumbnail'],
    },
    addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    addedByName: {
        type: String,
        required: true,
    },
    addedByAvatar: {
        type: String,
        required: true,
    },
    order: {
        type: Number,
        default: 0,
    },
    status: {
        type: String,
        enum: ['queued', 'played'],
        default: 'queued',
    },
    playedAt: {
        type: Date,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Force model recreation in dev mode to pick up schema changes
if (process.env.NODE_ENV === 'development') {
    delete mongoose.models.Song;
}

export default mongoose.models.Song || mongoose.model<ISong>('Song', SongSchema);
