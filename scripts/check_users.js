const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const UserSchema = new mongoose.Schema({
    name: String,
    username: String,
    isAdmin: Boolean,
    sessionId: String,
});

const User = mongoose.model('User', UserSchema);

async function checkUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const users = await User.find({}, 'name username isAdmin sessionId');
        console.log('Users found:', users.length);
        
        users.forEach(u => {
            console.log(`User: ${u.name} (${u.username || 'No Username'}) - IsAdmin: ${u.isAdmin} - SessionID: ${u.sessionId ? 'Present' : 'Missing'}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkUsers();
