require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 SkillSpark backend running on port ${PORT}`);
    console.log(`   Environment : ${process.env.NODE_ENV || 'development'}`);
    console.log(`   MongoDB     : connected`);
    console.log(`   Claude AI   : ${process.env.ANTHROPIC_API_KEY ? 'configured' : '⚠ ANTHROPIC_API_KEY missing'}\n`);
  });
}).catch((err) => {
  console.error('❌ Failed to connect to MongoDB:', err.message);
  process.exit(1);
});
