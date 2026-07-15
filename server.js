const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/trade', require('./routes/tradeRoutes'));
app.use('/api/profile', require('./routes/profileRoutes'));
app.use('/api/portfolio', require('./routes/portfolioRoutes'));
app.use('/api/master', require('./routes/masterRoutes'));
app.use('/api/bulk-portfolio', require('./routes/bulkPortfolioRoutes'));
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));