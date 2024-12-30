// server.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const storage = multer.memoryStorage();

const path = require('path');
require('dotenv').config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: ['https://post-something-frontend.vercel.app'], // Allow your frontend domain
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true, // Include credentials if necessary
  }));
app.use(express.json()); // Parse JSON body
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));




const cloudinary = require('cloudinary').v2;
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});


const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed'), false);
    }
};



const upload = multer({ storage, fileFilter });

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(error => console.error('MongoDB connection error:', error));

// Mongoose Schema and Model
const postSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    file: { type: String },
    likes: { type: Number, default: 0 },
    comments: [{ text: { type: String, required: true, trim: true } }]
}, { timestamps: true });

const Post = mongoose.model('Post', postSchema);

// Routes

// Get all posts
app.get('/api/posts', async (req, res) => {
    try {
        const posts = await Post.find();
        res.json(posts);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
});



app.post('/api/posts', upload.single('file'), async (req, res) => {
    try {
        const { title, content } = req.body;

        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content are required' });
        }

        let fileUrl = null;
        if (req.file) {
            const result = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    { folder: 'posts', resource_type: 'auto' },
                    (error, result) => {
                        if (error) return reject(error);
                        resolve(result);
                    }
                );
                uploadStream.end(req.file.buffer); // Stream the buffer
            });
            fileUrl = result.secure_url; // Get the Cloudinary URL
        }

        const post = new Post({ title, content, file: fileUrl });
        await post.save();
        res.status(201).json(post);
    } catch (error) {
        console.error('Error creating post:', error.message || error);
        res.status(500).json({ error: 'Failed to create post' });
    }
});


// Like a post
app.post('/api/posts/like/:postId', async (req, res) => {
    try {
        const postId = req.params.postId;
        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        post.likes += 1;
        await post.save();
        res.json(post);
    } catch (error) {
        console.error('Error liking post:', error);
        res.status(500).json({ error: 'Failed to like post' });
    }
});

// Add a comment to a post
app.post('/api/posts/comment/:postId', async (req, res) => {
    try {
        const postId = req.params.postId;
        const { text } = req.body;

        if (!text || text.trim() === '') {
            return res.status(400).json({ error: 'Comment text is required' });
        }

        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        post.comments.push({ text })
        await post.save();
        res.json(post);
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ error: 'Failed to add comment' });
    }
});

// Start the Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
