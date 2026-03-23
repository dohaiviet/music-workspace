import mongoose from 'mongoose';

export interface IPlayback extends mongoose.Document {
    currentSongId: mongoose.Types.ObjectId | null;
    startedAt: Date | null;
    updatedAt: Date;
    currentTime?: number;
    isPlaying?: boolean;
    broadcastMode?: 'introvert' | 'extrovert';
}

const PlaybackSchema = new mongoose.Schema<IPlayback>({
    currentSongId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Song',
        default: null,
    },
    startedAt: {
        type: Date,
        default: null,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
    currentTime: {
        type: Number,
        default: 0,
    },
    isPlaying: {
        type: Boolean,
        default: false,
    },
    broadcastMode: {
        type: String,
        enum: ['introvert', 'extrovert'],
        default: 'introvert',
    }
});

export default mongoose.models.Playback || mongoose.model<IPlayback>('Playback', PlaybackSchema);
