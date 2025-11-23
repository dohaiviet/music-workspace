import mongoose from 'mongoose';

export interface IPlayback extends mongoose.Document {
    currentSongId: mongoose.Types.ObjectId | null;
    startedAt: Date | null;
    updatedAt: Date;
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
});

export default mongoose.models.Playback || mongoose.model<IPlayback>('Playback', PlaybackSchema);
