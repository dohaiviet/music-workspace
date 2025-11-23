import mongoose from 'mongoose';

export interface Test extends mongoose.Document {
    name: string;
    createdAt: Date;
}

const TestSchema = new mongoose.Schema<Test>({
    name: {
        type: String,
        required: [true, 'Please provide a name for this test.'],
        maxlength: [60, 'Name cannot be more than 60 characters'],
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

export default mongoose.models.Test || mongoose.model<Test>('Test', TestSchema);
