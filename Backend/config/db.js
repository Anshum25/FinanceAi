import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    // Sanitize password in logs
    const safeUri = uri ? uri.replace(/:[^@]*@/, ':****@') : 'MONGODB_URI not set';
    console.log('🔌 Connecting to MongoDB with URI:', safeUri);
    const conn = await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB Connected. Host: ${conn.connection.host}  DB: ${conn.connection.name}`);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
};

export { connectDB };
