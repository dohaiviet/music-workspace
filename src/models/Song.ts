import mongoose from 'mongoose';

export interface ISong extends mongoose.Document {
    youtubeUrl: string;
    videoId: string;
    title: string;
    thumbnail: string;
    addedBy: mongoose.Types.ObjectId;
    addedByName: string;
    addedByAvatar: string;
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
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

export default mongoose.models.Song || mongoose.model<ISong>('Song', SongSchema);
