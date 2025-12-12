require('dotenv').config();
const express = require('express');
const app = express();

// Increase payload limit to handle base64 images (50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get('/', (req, res) => res.json({status: 'LyfEZ backend OK'}));

// Auth routes
app.use('/api/auth', require('./routes/auth'));

// Group routes
app.use('/api/groups', require('./routes/groups'));

// Activity routes
app.use('/api/activities', require('./routes/activities'));

// Submission routes
app.use('/api/submissions', require('./routes/submissions'));

// Review routes
app.use('/api/reviews', require('./routes/reviews'));

// Calendar routes
app.use('/api/calendar', require('./routes/calendar'));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
